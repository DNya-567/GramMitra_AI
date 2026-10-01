"""
Trains the crop recommendation model on the merged dataset and saves it.
Run once from ml/crop_recommendation/:  python train.py
Re-run any time the dataset changes (more crops, more rows, etc.).
"""
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import pickle

DATA_PATH = "dataset/merged_crop_data.csv"
MODEL_PATH = "crop_model.pkl"

df = pd.read_csv(DATA_PATH)
df["label"] = df["label"].str.strip().str.lower()

FEATURES = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
X = df[FEATURES]
y = df["label"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

model = RandomForestClassifier(n_estimators=200, random_state=42)
model.fit(X_train, y_train)

accuracy = accuracy_score(y_test, model.predict(X_test))
print(f"Trained on {len(df)} rows across {y.nunique()} crops.")
print(f"Test accuracy: {accuracy:.2%}")

with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)

print(f"Saved model to {MODEL_PATH}")
