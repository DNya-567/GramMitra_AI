import pickle
import os
import numpy as np

_MODEL_PATH = os.path.join(
    os.path.dirname(__file__), "..", "..", "..", "ml", "crop_recommendation", "crop_model.pkl"
)

with open(_MODEL_PATH, "rb") as f:
    _model = pickle.load(f)


def recommend_crop(nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall_mm):
    features = np.array([[nitrogen, phosphorus, potassium, temperature, humidity, ph, rainfall_mm]])
    probabilities = _model.predict_proba(features)[0]
    # Get indices of top 3 probabilities
    top3_indices = probabilities.argsort()[-3:][::-1]
    top3 = []
    for idx in top3_indices:
        top3.append({
            "crop": _model.classes_[idx],
            "probability": float(probabilities[idx])
        })
    best_index = top3_indices[0]
    crop = _model.classes_[best_index]
    confidence = float(probabilities[best_index])
    low_confidence = confidence < 0.5

    return {
        "recommended_crop": crop,
        "confidence": confidence,
        "top3": top3,
        "low_confidence": low_confidence
    }