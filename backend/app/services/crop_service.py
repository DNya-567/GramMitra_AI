"""
Expected payload: soil_type, nitrogen, phosphorus, potassium,
rainfall_mm, region
"""


def get_recommendation(payload: dict) -> dict:
    # TODO: load ml/crop_recommendation/model.pkl and run prediction
    # against the fields above. Return the top 2-3 crops with a
    # confidence score, matching docs/api-contract.md.
    return {"recommended_crops": [], "confidence": 0}
