"""
Expected payload: description, farmer_location
"""

DEPARTMENT_MAP = {
    "electricity": {"department": "MSEDCL", "contact": "TODO"},
    "water": {"department": "Water Resources Dept", "contact": "TODO"},
    "crop_damage": {"department": "Agriculture Dept (Krishi Vibhag)", "contact": "TODO"},
    "other": {"department": "General Helpdesk", "contact": "TODO"},
}


def classify_and_route(payload: dict) -> dict:
    # TODO: replace with the trained classifier in
    # ml/complaint_classifier/. Start rule-based (keyword match) if
    # the classifier isn't ready yet.
    category = "other"
    routing = DEPARTMENT_MAP[category]
    return {
        "category": category,
        "department": routing["department"],
        "contact": routing["contact"],
        "reference_id": None,  # TODO: generate + store in DB
    }
