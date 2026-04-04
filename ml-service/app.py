from flask import Flask, request, jsonify
from flask_cors import CORS
import pickle
import os
import numpy as np

app = Flask(__name__)
CORS(app)

# Load the model artifact (model + stats)
model_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
try:
    with open(model_path, 'rb') as f:
        artifact = pickle.load(f)
        model = artifact['model']
        stats = artifact['stats']
    print("✅ ML Model loaded successfully!")
except Exception as e:
    print(f"❌ Failed to load model. Did you run train.py first? Error: {e}")
    model = None
    stats = None

def get_feature_importance(features_dict, stats):
    """
    Isolation Forest doesn't provide native feature importances efficiently.
    Heuristic: Calculate the deviation (Z-score) of each feature from the training mean.
    The highest deviations are the most "important" reasons for the anomaly.
    """
    deviations = {}
    for feature, value in features_dict.items():
        if feature in stats['mean'] and feature in stats['std'] and stats['std'][feature] > 0:
            z_score = abs(value - stats['mean'][feature]) / stats['std'][feature]
            deviations[feature] = z_score
            
    # Normalize to percentages
    total_dev = sum(deviations.values())
    if total_dev == 0:
        return {k: 0 for k in deviations.keys()}
        
    importance = {k: round((v / total_dev) * 100, 1) for k, v in deviations.items()}
    # Sort by highest importance
    return dict(sorted(importance.items(), key=lambda item: item[1], reverse=True))

@app.route('/predict', methods=['POST'])
def predict():
    if not model or not stats:
        return jsonify({"error": "Model not loaded"}), 500

    try:
        data = request.json
        # Expected keys: temperature, vibration, pressure, rpm, current
        required = ['temperature', 'vibration', 'pressure', 'rpm', 'current']
        
        # Verify all features exist
        for key in required:
            if key not in data:
                return jsonify({"error": f"Missing feature: {key}"}), 400

        # Create input array (must match training feature order exactly)
        X = np.array([[
            data['temperature'],
            data['vibration'],
            data['pressure'],
            data['rpm'],
            data['current']
        ]])
        
        # Isolation Forest prediction: 1 (normal), -1 (anomaly)
        pred = model.predict(X)[0]
        is_anomaly = bool(pred == -1)
        
        # confidence approximation: decision_function returns negative values for anomalies (more negative = more anomalous)
        # positive values for normal (more positive = more normal)
        score = model.decision_function(X)[0] 
        
        # Map score realistically to a 0-100% confidence scale
        # Typically max normal score ~ 0.15, max anomaly score ~ -0.3
        if is_anomaly:
            confidence = min(100, max(50, 50 + abs(score) * 200))
        else:
            confidence = min(100, max(50, 50 + score * 200))
            
        feature_importance = {}
        if is_anomaly:
            feature_importance = get_feature_importance(data, stats)
            
        return jsonify({
            "anomaly": is_anomaly,
            "confidence": round(confidence, 1),
            "feature_importance": feature_importance,
            "raw_score": float(score)
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "healthy", "model_loaded": model is not None})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)
