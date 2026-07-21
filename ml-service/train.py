"""Train the predictive-maintenance classifier from the AI4I 2020 dataset."""
from pathlib import Path
from datetime import datetime, timezone
import pickle
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, roc_auc_score
from sklearn.model_selection import RandomizedSearchCV, StratifiedKFold, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

BASE_DIR = Path(__file__).resolve().parent
DATASET_URL = 'https://archive.ics.uci.edu/ml/machine-learning-databases/00601/ai4i2020.csv'
FEATURES = ['Type', 'Air temperature [K]', 'Process temperature [K]', 'Rotational speed [rpm]', 'Torque [Nm]', 'Tool wear [min]']

def load_dataset():
    local = BASE_DIR / 'data' / 'ai4i2020.csv'
    try:
        return pd.read_csv(local if local.exists() else DATASET_URL)
    except Exception as exc:
        raise RuntimeError(f'Unable to load AI4I 2020 dataset. Put ai4i2020.csv in {local.parent} or allow access to UCI. {exc}') from exc

def train_model():
    df = load_dataset()
    target = 'Machine failure'
    if target not in df or any(column not in df for column in FEATURES):
        raise ValueError('AI4I 2020 CSV has unexpected columns')
    X, y = df[FEATURES].copy(), df[target].astype(int)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=.2, random_state=42, stratify=y)
    numeric = FEATURES[1:]
    preprocessor = ColumnTransformer([('numeric', Pipeline([('impute', SimpleImputer(strategy='median')), ('scale', StandardScaler())]), numeric), ('type', OneHotEncoder(handle_unknown='ignore'), ['Type'])])
    candidates = {
        'logistic_regression': Pipeline([('preprocess', preprocessor), ('model', LogisticRegression(max_iter=2000, class_weight='balanced'))]),
        'extra_trees': Pipeline([('preprocess', preprocessor), ('model', ExtraTreesClassifier(class_weight='balanced', random_state=42, n_jobs=1))]),
        'random_forest': Pipeline([('preprocess', preprocessor), ('model', RandomForestClassifier(class_weight='balanced', random_state=42, n_jobs=1))]),
    }
    cv = StratifiedKFold(n_splits=3, shuffle=True, random_state=42)
    scores = {}
    for name, estimator in candidates.items():
        search = RandomizedSearchCV(estimator, {'model__n_estimators': [80, 120], 'model__max_depth': [None, 10], 'model__min_samples_leaf': [1, 3]} if name != 'logistic_regression' else {'model__C': [.1, 1]}, n_iter=2, scoring='f1', cv=cv, n_jobs=1, random_state=42)
        search.fit(X_train, y_train); scores[name] = (search.best_score_, search.best_estimator_)
    best_name, (_, model) = max(scores.items(), key=lambda item: item[1][0])
    probability = model.predict_proba(X_test)[:, 1]; prediction = (probability >= .5).astype(int)
    precision, recall, f1, _ = precision_recall_fscore_support(y_test, prediction, average='binary', zero_division=0)
    transformed_names = model.named_steps['preprocess'].get_feature_names_out().tolist()
    classifier = model.named_steps['model']
    importances = getattr(classifier, 'feature_importances_', None)
    feature_importance = dict(sorted(zip(transformed_names, importances if importances is not None else [0] * len(transformed_names)), key=lambda item: item[1], reverse=True))
    artifact = {'model': model, 'features': FEATURES, 'feature_importance': feature_importance, 'metrics': {'accuracy': accuracy_score(y_test, prediction), 'precision': precision, 'recall': recall, 'f1': f1, 'roc_auc': roc_auc_score(y_test, probability), 'cv_f1': scores[best_name][0]}, 'model_name': best_name, 'trained_at': datetime.now(timezone.utc).isoformat(), 'dataset': 'AI4I 2020'}
    with open(BASE_DIR / 'model.pkl', 'wb') as handle: pickle.dump(artifact, handle)
    return artifact

if __name__ == '__main__':
    result = train_model(); print(f"Trained {result['model_name']} on {result['dataset']}: F1={result['metrics']['f1']:.3f}")
