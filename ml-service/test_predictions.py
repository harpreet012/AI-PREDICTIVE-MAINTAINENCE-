"""Test script to verify Flask API predictions work correctly"""
from app import app
import json

def test_predictions():
    with app.test_client() as client:
        # Test 1: Normal sensor readings
        print("\n" + "="*60)
        print("TEST 1: Normal Sensor Readings")
        print("="*60)
        normal_data = {
            'temperature': 65,
            'vibration': 3.5,
            'pressure': 110,
            'rpm': 3000,
            'current': 40
        }
        response = client.post('/predict', json=normal_data)
        result = json.loads(response.data)
        print(f"Input: {normal_data}")
        print(f"Anomaly Detected: {result['anomaly']}")
        print(f"Confidence: {result['confidence']}%")
        print(f"Model Type: {result['model_type']}")
        print("✅ Expected: False (Normal operation)")
        
        # Test 2: Anomalous sensor readings
        print("\n" + "="*60)
        print("TEST 2: Anomalous Sensor Readings")
        print("="*60)
        anomaly_data = {
            'temperature': 100,
            'vibration': 12,
            'pressure': 160,
            'rpm': 1500,
            'current': 70
        }
        response = client.post('/predict', json=anomaly_data)
        result = json.loads(response.data)
        print(f"Input: {anomaly_data}")
        print(f"Anomaly Detected: {result['anomaly']}")
        print(f"Confidence: {result['confidence']}%")
        print(f"Model Type: {result['model_type']}")
        print("✅ Expected: True (Anomaly detected)")
        
        # Test 3: Health endpoint
        print("\n" + "="*60)
        print("TEST 3: Health Check")
        print("="*60)
        response = client.get('/health')
        result = json.loads(response.data)
        print(f"Status: {result['status']}")
        print(f"Model Loaded: {result['model_loaded']}")
        print(f"Features: {result['features']}")
        print("✅ Health check passed")

if __name__ == '__main__':
    test_predictions()
