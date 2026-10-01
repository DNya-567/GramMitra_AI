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
    best_index = probabilities.argmax()

    crop = _model.classes_[best_index]
    confidence = float(probabilities[best_index])

    return {"recommended_crop": crop, "confidence": confidence}
