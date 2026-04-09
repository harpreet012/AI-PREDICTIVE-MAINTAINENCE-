import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pickle
import os

def generate_dummy_data(n_samples=3000):
    """
    Generate a richly varied synthetic dataset that covers realistic industrial machine behaviour.
    Normal data: 95% of samples with realistic sensor readings.
    Anomaly data: 5% of samples simulating 4 distinct fault modes.
    """
    np.random.seed(42)
    n_normal = int(n_samples * 0.95)
    n_anomalies = n_samples - n_normal

    # --- Normal operating data ---
    normal = pd.DataFrame({
        'temperature': np.random.normal(65, 5, n_normal),
        'vibration':   np.random.normal(3.5, 0.8, n_normal),
        'pressure':    np.random.normal(110, 10, n_normal),
        'rpm':         np.random.normal(3000, 50, n_normal),
        'current':     np.random.normal(40, 3, n_normal),
    })

    # --- Anomaly data: 4 realistic fault modes ---
    q = n_anomalies // 4
    fault_overheating = pd.DataFrame({
        'temperature': np.random.uniform(92, 125, q),
        'vibration':   np.random.normal(3.5, 0.8, q),
        'pressure':    np.random.normal(110, 10, q),
        'rpm':         np.random.normal(3000, 50, q),
        'current':     np.random.normal(40, 3, q),
    })
    fault_bearing = pd.DataFrame({
        'temperature': np.random.uniform(70, 85, q),
        'vibration':   np.random.uniform(9, 16, q),
        'pressure':    np.random.normal(110, 10, q),
        'rpm':         np.random.normal(3000, 50, q),
        'current':     np.random.uniform(48, 62, q),
    })
    fault_pressure = pd.DataFrame({
        'temperature': np.random.normal(65, 5, q),
        'vibration':   np.random.normal(3.5, 0.8, q),
        'pressure':    np.random.uniform(145, 185, q),
        'rpm':         np.random.normal(3000, 50, q),
        'current':     np.random.normal(40, 3, q),
    })
    fault_electrical = pd.DataFrame({
        'temperature': np.random.uniform(72, 90, n_anomalies - 3*q),
        'vibration':   np.random.normal(3.5, 0.8, n_anomalies - 3*q),
        'pressure':    np.random.normal(110, 10, n_anomalies - 3*q),
        'rpm':         np.random.uniform(1200, 1700, n_anomalies - 3*q),
        'current':     np.random.uniform(62, 80, n_anomalies - 3*q),
    })

    df = pd.concat([normal, fault_overheating, fault_bearing, fault_pressure, fault_electrical], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    return df, list(df.columns)


def train_model():
    print("Generating training data...")
    df, feature_cols = generate_dummy_data(3000)

    print(f"Features: {feature_cols}")
    print("Fitting StandardScaler for normalisation...")
    scaler = StandardScaler()
    scaled_data = scaler.fit_transform(df)

    print("Training Isolation Forest (n_estimators=150, contamination=auto)...")
    model = IsolationForest(
        n_estimators=150,
        contamination='auto',
        max_samples='auto',
        random_state=42,
        n_jobs=-1
    )
    model.fit(scaled_data)

    stats = {
        'mean': df.mean().to_dict(),
        'std':  df.std().to_dict(),
    }

    artifact = {
        'model':    model,
        'scaler':   scaler,
        'stats':    stats,
        'features': feature_cols,
    }

    output_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    with open(output_path, 'wb') as f:
        pickle.dump(artifact, f)

    print(f"\n✅ Bootstrapped model saved -> {output_path}")
    print(f"   Rows: {len(df)} | Features: {feature_cols}")


if __name__ == '__main__':
    train_model()
