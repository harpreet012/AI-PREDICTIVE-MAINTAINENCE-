from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler

app = Flask(__name__)
CORS(app)

# Global variables to hold model state
model = None
scaler = None
stats = None
features = []

def load_model():
    global model, scaler, stats, features
    model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    try:
        with open(model_path, 'rb') as f:
            artifact = pickle.load(f)
            model = artifact.get('model')
            scaler = artifact.get('scaler')
            stats = artifact.get('stats')
            features = artifact.get('features', ['temperature', 'vibration', 'pressure', 'rpm', 'current'])
        model_type = type(model).__name__
        print(f"✅ ML Model loaded successfully! Type: {model_type}")
    except Exception as e:
        print(f"❌ Failed to load model. Did you run train.py first? Error: {e}")
        model, scaler, stats, features = None, None, None, []

# Initialize model on startup
load_model()

def get_feature_importance(features_dict, stats_dict):
    """
    Calculate the deviation (Z-score) of each feature from the training mean.
    The highest deviations are the most "important" reasons for the anomaly.
    """
    deviations = {}
    for feature, value in features_dict.items():
        if feature in stats_dict['mean'] and feature in stats_dict['std'] and stats_dict['std'][feature] > 0:
            z_score = abs(value - stats_dict['mean'][feature]) / stats_dict['std'][feature]
            deviations[feature] = z_score
            
    total_dev = sum(deviations.values())
    if total_dev == 0:
        return {k: 0 for k in deviations.keys()}
        
    importance = {k: round((v / total_dev) * 100, 1) for k, v in deviations.items()}
    return dict(sorted(importance.items(), key=lambda item: item[1], reverse=True))

@app.route('/')
def home():
    return 'ML Service Running 🚀'

@app.route('/predict', methods=['POST'])
def predict():
    if not model or not features:
        return jsonify({"error": "Model not loaded"}), 500

    try:
        data = request.json
        
        # Verify and extract exactly the dynamic features the model was trained on
        feature_values = []
        for key in features:
            if key not in data:
                # If a feature is completely missing from incoming data, fill with mean (graceful degradation)
                feature_values.append(stats['mean'].get(key, 0.0))
            else:
                try:
                    feature_values.append(float(data[key]))
                except (ValueError, TypeError):
                    feature_values.append(stats['mean'].get(key, 0.0))

        X = np.array([feature_values])
        
        # Scale features
        if scaler:
            X_scaled = scaler.transform(X)
        else:
            X_scaled = X
        
        # Detect model type and make appropriate predictions
        model_type = type(model).__name__
        is_anomaly = False
        confidence = 50.0
        
        if 'RandomForest' in model_type:
            # RandomForestClassifier: 0=normal, 1=anomaly
            pred = model.predict(X_scaled)[0]
            is_anomaly = bool(pred == 1)
            
            # Get probability scores for confidence
            probs = model.predict_proba(X_scaled)[0]
            confidence = round(max(probs) * 100, 1)
            
        elif 'IsolationForest' in model_type:
            # IsolationForest: 1=normal, -1=anomaly
            pred = model.predict(X_scaled)[0]
            is_anomaly = bool(pred == -1)
            
            score = model.decision_function(X_scaled)[0]
            # Map score to a confidence scale
            if is_anomaly:
                confidence = min(100, max(50, 50 + abs(score) * 200))
            else:
                confidence = min(100, max(50, 50 + score * 200))
        
        feature_importance_map = {}
        if is_anomaly and stats:
            # Map values back to a dict for importance calc
            input_dict = {features[i]: feature_values[i] for i in range(len(features))}
            feature_importance_map = get_feature_importance(input_dict, stats)
            
        return jsonify({
            "anomaly": is_anomaly,
            "confidence": round(confidence, 1),
            "feature_importance": feature_importance_map,
            "model_type": model_type
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/train', methods=['POST'])
def train():
    global model, scaler, stats, features
    try:
        from sklearn.ensemble import IsolationForest
        
        body = request.json
        rows = body.get('data', [])
        
        if not rows or len(rows) < 10:
            return jsonify({"error": "Not enough data to train. Need at least 10 rows."}), 400
            
        df = pd.DataFrame(rows)
        
        # Select only numeric columns dynamically
        numeric_df = df.select_dtypes(include=[np.number]).dropna(axis=1, how='all')
        
        # Fill missing numeric values with column means
        numeric_df = numeric_df.fillna(numeric_df.mean())
        
        if numeric_df.empty:
            return jsonify({"error": "No numeric data found to train."}), 400
            
        new_features = list(numeric_df.columns)
        
        # Fit scaler for better accuracy across different units
        new_scaler = StandardScaler()
        scaled_data = new_scaler.fit_transform(numeric_df)
        
        # Train robust Isolation Forest for dynamic retraining (unsupervised)
        new_model = IsolationForest(n_estimators=150, contamination='auto', max_samples='auto', random_state=42)
        new_model.fit(scaled_data)
        
        new_stats = {
            'mean': numeric_df.mean().to_dict(),
            'std': numeric_df.std().to_dict()
        }
        
        # Save to disk
        artifact = {
            'model': new_model,
            'scaler': new_scaler,
            'stats': new_stats,
            'features': new_features
        }
        
        model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
        with open(model_path, 'wb') as f:
            pickle.dump(artifact, f)
            
        # Update global state in memory
        model = new_model
        scaler = new_scaler
        stats = new_stats
        features = new_features
        
        return jsonify({
            "success": True, 
            "message": "Model trained dynamically and updated successfully.",
            "features_used": new_features,
            "rows_processed": len(numeric_df)
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "ok", 
        "model_loaded": model is not None,
        "features": features
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
