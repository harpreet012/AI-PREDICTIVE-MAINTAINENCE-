import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import pickle
import os

def generate_dummy_data(n_samples=2000):
    # Features: temperature, vibration, pressure, rpm, current
    np.random.seed(42)
    
    # Normal data
    temp_n = np.random.normal(65, 5, n_samples)
    vib_n = np.random.normal(3.5, 0.8, n_samples)
    pres_n = np.random.normal(110, 10, n_samples)
    rpm_n = np.random.normal(3000, 50, n_samples)
    curr_n = np.random.normal(40, 3, n_samples)
    
    normal_data = pd.DataFrame({
        'temperature': temp_n,
        'vibration': vib_n,
        'pressure': pres_n,
        'rpm': rpm_n,
        'current': curr_n
    })
    
    # Anomaly data (approx 5% of samples)
    n_anomalies = int(n_samples * 0.05)
    temp_a = np.random.uniform(90, 120, n_anomalies) # Overheating
    vib_a = np.random.uniform(8, 15, n_anomalies)    # High vibration
    pres_a = np.random.uniform(140, 180, n_anomalies)# High pressure
    rpm_a = np.random.uniform(1000, 1500, n_anomalies) # Low RPM
    curr_a = np.random.uniform(60, 80, n_anomalies)  # High current
    
    anomaly_data = pd.DataFrame({
        'temperature': temp_a,
        'vibration': vib_a,
        'pressure': pres_a,
        'rpm': rpm_a,
        'current': curr_a
    })
    
    # Combine
    df = pd.concat([normal_data, anomaly_data], ignore_index=True)
    return df

def train_model():
    print("Generating training data...")
    df = generate_dummy_data(2000)
    
    print("Training Isolation Forest model...")
    # contamination=0.05 matches our 5% injected anomalies
    model = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    model.fit(df)
    
    # Save the model and the training stats for feature importance (mean, std)
    stats = {
        'mean': df.mean().to_dict(),
        'std': df.std().to_dict()
    }
    
    artifact = {
        'model': model,
        'stats': stats
    }
    
    output_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    with open(output_path, 'wb') as f:
        pickle.dump(artifact, f)
        
    print(f"Model saved to {output_path} successfully!")

if __name__ == '__main__':
    train_model()
