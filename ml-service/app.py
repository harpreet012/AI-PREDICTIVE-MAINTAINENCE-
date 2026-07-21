from pathlib import Path
import pickle
from flask import Flask, jsonify, request
from flask_cors import CORS
from train import FEATURES, train_model

app = Flask(__name__); CORS(app)
artifact = None
def load_model():
    global artifact
    try:
        with open(Path(__file__).with_name('model.pkl'), 'rb') as handle:
            candidate = pickle.load(handle)
        artifact = candidate if candidate.get('dataset') == 'AI4I 2020' else None
    except Exception: artifact = None
load_model()
def value(data, *keys, default=0):
    for key in keys:
        if key in data:
            try: return float(data[key])
            except (TypeError, ValueError): pass
    return default
def frame(data):
    source = data.get('sensorData', data)
    return {'Type': str(source.get('Type', source.get('type', 'L'))), 'Air temperature [K]': value(source, 'Air temperature [K]', 'airTemperature', 'temperature', default=298.1), 'Process temperature [K]': value(source, 'Process temperature [K]', 'processTemperature', 'temperature', default=308.6), 'Rotational speed [rpm]': value(source, 'Rotational speed [rpm]', 'rpm', default=1500), 'Torque [Nm]': value(source, 'Torque [Nm]', 'current', default=40), 'Tool wear [min]': value(source, 'Tool wear [min]', 'toolWear', default=100)}
@app.get('/')
def home(): return jsonify(success=True, service='predictive-maintenance-ml')
@app.get('/health')
def health(): return jsonify(success=True, data={'model_loaded': artifact is not None, 'dataset': artifact.get('dataset') if artifact else None, 'features': FEATURES})
@app.post('/predict')
def predict():
    if artifact is None: return jsonify(success=False, error='AI4I model is not trained. Run train.py before serving predictions.'), 503
    try:
        import pandas as pd
        record = frame(request.get_json(silent=True) or {})
        probability = float(artifact['model'].predict_proba(pd.DataFrame([record]))[0][1])
        anomaly = probability >= .5; confidence = max(probability, 1 - probability) * 100
        importance = dict(list(artifact['feature_importance'].items())[:5])
        recommendation = 'Schedule an inspection immediately.' if probability >= .7 else ('Inspect during the next maintenance window.' if anomaly else 'Continue normal monitoring.')
        return jsonify(success=True, anomaly=anomaly, isAnomaly=anomaly, probability=round(probability * 100, 2), failureProbability=round(probability * 100, 2), anomalyScore=round(probability, 4), healthScore=round(100 - probability * 100, 2), confidence=round(confidence, 2), feature_importance=importance, recommendation=recommendation, model_type=artifact['model_name'])
    except Exception as exc: return jsonify(success=False, error=str(exc)), 400
@app.post('/train')
def train():
    global artifact
    try: artifact = train_model(); return jsonify(success=True, data={'dataset': artifact['dataset'], 'metrics': artifact['metrics'], 'model': artifact['model_name']})
    except Exception as exc: return jsonify(success=False, error=str(exc)), 500
if __name__ == '__main__': app.run(host='0.0.0.0', port=int(__import__('os').environ.get('PORT', 5001)))
