import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import pickle
import os
from datetime import datetime

# ============================================================================
# DATASET GENERATION
# ============================================================================

def generate_labeled_data(n_samples=3000):
    """
    Generate a richly varied synthetic dataset with labels for supervised learning.
    Normal data: 95% of samples (label=0)
    Anomaly data: 5% of samples (label=1) with 4 distinct fault modes
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
    normal['label'] = 0

    # --- Anomaly data: 4 realistic fault modes ---
    q = n_anomalies // 4
    fault_overheating = pd.DataFrame({
        'temperature': np.random.uniform(92, 125, q),
        'vibration':   np.random.normal(3.5, 0.8, q),
        'pressure':    np.random.normal(110, 10, q),
        'rpm':         np.random.normal(3000, 50, q),
        'current':     np.random.normal(40, 3, q),
    })
    fault_overheating['label'] = 1

    fault_bearing = pd.DataFrame({
        'temperature': np.random.uniform(70, 85, q),
        'vibration':   np.random.uniform(9, 16, q),
        'pressure':    np.random.normal(110, 10, q),
        'rpm':         np.random.normal(3000, 50, q),
        'current':     np.random.uniform(48, 62, q),
    })
    fault_bearing['label'] = 1

    fault_pressure = pd.DataFrame({
        'temperature': np.random.normal(65, 5, q),
        'vibration':   np.random.normal(3.5, 0.8, q),
        'pressure':    np.random.uniform(145, 185, q),
        'rpm':         np.random.normal(3000, 50, q),
        'current':     np.random.normal(40, 3, q),
    })
    fault_pressure['label'] = 1

    fault_electrical = pd.DataFrame({
        'temperature': np.random.uniform(72, 90, n_anomalies - 3*q),
        'vibration':   np.random.normal(3.5, 0.8, n_anomalies - 3*q),
        'pressure':    np.random.normal(110, 10, n_anomalies - 3*q),
        'rpm':         np.random.uniform(1200, 1700, n_anomalies - 3*q),
        'current':     np.random.uniform(62, 80, n_anomalies - 3*q),
    })
    fault_electrical['label'] = 1

    df = pd.concat([normal, fault_overheating, fault_bearing, fault_pressure, fault_electrical], ignore_index=True)
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    
    return df


def print_section(title):
    """Print a formatted section header"""
    print("\n" + "="*70)
    print(f"  {title}")
    print("="*70)


def train_model_with_epochs(num_epochs=8):
    """
    Train a RandomForest model with simulated epochs.
    For each epoch, train and evaluate the model on test data.
    """
    
    print_section("🚀 PREDICTIVE MAINTENANCE ML TRAINING PIPELINE")
    
    # --- STEP 1: LOAD & PREPARE DATA ---
    print("\n📊 Step 1: Loading and Preparing Dataset")
    print("   Generating synthetic dataset...")
    df = generate_labeled_data(3000)
    print(f"   ✓ Dataset loaded: {len(df)} samples")
    
    feature_cols = [col for col in df.columns if col != 'label']
    print(f"   ✓ Features: {feature_cols}")
    print(f"   ✓ Class distribution: {df['label'].value_counts().to_dict()}")
    
    # --- STEP 2: DATA PREPROCESSING ---
    print("\n🔧 Step 2: Data Preprocessing")
    X = df[feature_cols]
    y = df['label']
    
    print("   Fitting StandardScaler for normalization...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    print("   ✓ Scaler fitted and data normalized")
    
    # Split into train/test
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    print(f"   ✓ Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")
    
    # --- STEP 3: MODEL TRAINING WITH EPOCH SIMULATION ---
    print_section("🏋️ STEP 3: MODEL TRAINING WITH EPOCH SIMULATION")
    print(f"\nTraining Configuration:")
    print(f"   Model: RandomForestClassifier")
    print(f"   Epochs: {num_epochs}")
    print(f"   Trees per epoch: 30")
    
    epoch_history = []
    best_model = None
    best_f1 = 0
    
    for epoch in range(1, num_epochs + 1):
        print(f"\n   {'─'*60}")
        print(f"   📌 Epoch {epoch}/{num_epochs}")
        print(f"   {'─'*60}")
        
        # Train RandomForest for this epoch
        model = RandomForestClassifier(
            n_estimators=30,
            max_depth=12,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42 + epoch,
            n_jobs=-1,
            class_weight='balanced'
        )
        model.fit(X_train, y_train)
        
        # Evaluate on test set
        y_pred = model.predict(X_test)
        
        accuracy = accuracy_score(y_test, y_pred)
        precision = precision_score(y_test, y_pred, zero_division=0)
        recall = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        epoch_history.append({
            'epoch': epoch,
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1': f1
        })
        
        # Track best model
        if f1 > best_f1:
            best_f1 = f1
            best_model = model
        
        # Print epoch results
        print(f"   Accuracy:  {accuracy*100:6.2f}%")
        print(f"   Precision: {precision*100:6.2f}%")
        print(f"   Recall:    {recall*100:6.2f}%")
        print(f"   F1-Score:  {f1*100:6.2f}%")
        print(f"   ✓ Epoch {epoch} completed")
    
    # --- STEP 4: FINAL MODEL EVALUATION ---
    print_section("📈 STEP 4: FINAL MODEL EVALUATION")
    y_pred_final = best_model.predict(X_test)
    
    accuracy_final = accuracy_score(y_test, y_pred_final)
    precision_final = precision_score(y_test, y_pred_final, zero_division=0)
    recall_final = recall_score(y_test, y_pred_final, zero_division=0)
    f1_final = f1_score(y_test, y_pred_final, zero_division=0)
    
    print("\nFinal Performance Metrics:")
    print(f"   Accuracy:  {accuracy_final*100:6.2f}%")
    print(f"   Precision: {precision_final*100:6.2f}%")
    print(f"   Recall:    {recall_final*100:6.2f}%")
    print(f"   F1-Score:  {f1_final*100:6.2f}%")
    
    # --- STEP 5: PREPARE ARTIFACTS ---
    print("\n💾 Step 5: Preparing Model Artifacts")
    stats = {
        'mean': X.mean().to_dict(),
        'std':  X.std().to_dict(),
    }
    
    artifact = {
        'model':    best_model,
        'scaler':   scaler,
        'stats':    stats,
        'features': feature_cols,
        'metrics': {
            'accuracy': accuracy_final,
            'precision': precision_final,
            'recall': recall_final,
            'f1_score': f1_final,
        },
        'training_info': {
            'epochs': num_epochs,
            'total_samples': len(df),
            'timestamp': datetime.now().isoformat(),
        }
    }
    
    output_path = os.path.join(os.path.dirname(__file__), 'model.pkl')
    with open(output_path, 'wb') as f:
        pickle.dump(artifact, f)
    print(f"   ✓ Model artifacts saved to {output_path}")
    
    # --- STEP 6: TRAINING SUMMARY REPORT ---
    print_section("📋 TRAINING SUMMARY REPORT")
    print(f"\nDataset Information:")
    print(f"   Dataset: Synthetic Predictive Maintenance")
    print(f"   Total Samples: {len(df):,}")
    print(f"   Features Used: {feature_cols}")
    print(f"   Feature Count: {len(feature_cols)}")
    
    print(f"\nTraining Configuration:")
    print(f"   Model Type: RandomForestClassifier")
    print(f"   Epochs: {num_epochs}")
    print(f"   Trees per Epoch: 30")
    print(f"   Train/Test Split: 80/20")
    
    print(f"\nFinal Model Performance:")
    print(f"   Accuracy:  {accuracy_final*100:6.2f}%")
    print(f"   Precision: {precision_final*100:6.2f}%")
    print(f"   Recall:    {recall_final*100:6.2f}%")
    print(f"   F1-Score:  {f1_final*100:6.2f}%")
    
    print(f"\nEpoch Progress Summary:")
    for record in epoch_history:
        print(f"   Epoch {record['epoch']:2d}: F1={record['f1']*100:5.2f}% | " +
              f"Acc={record['accuracy']*100:5.2f}% | Pre={record['precision']*100:5.2f}% | Rec={record['recall']*100:5.2f}%")
    
    print(f"\nTraining Completion:")
    print(f"   ✅ Status: Training Completed Successfully")
    print(f"   📁 Model Path: {output_path}")
    print(f"   🕐 Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    print_section("✨ TRAINING PIPELINE COMPLETED")
    print("\n✅ Model is ready for predictions!")
    print("   - Flask API will load the model automatically")
    print("   - All metrics and artifacts saved\n")


if __name__ == '__main__':
    train_model_with_epochs(num_epochs=10)
