"""
Expected payload: crop, soil_deficiency (e.g. nitrogen-low)
"""


def get_suggestion(payload: dict) -> dict:
    # TODO: rule-based or ML mapping from crop + deficiency to
    # fertilizer type and quantity.
    return {"fertilizer": None, "quantity": None}
