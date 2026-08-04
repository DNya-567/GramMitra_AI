SCHEMES = [
    {"name": "PM-KISAN", "summary": "TODO: eligibility + how to apply"},
    {"name": "PMFBY (crop insurance)", "summary": "TODO"},
    {"name": "PM-KUSUM (solar pumps)", "summary": "TODO"},
    {"name": "Soil Health Card", "summary": "TODO"},
]


def get_schemes(query: str = "") -> list:
    # TODO: once this is wired into the chatbot's knowledge base,
    # this can become a semantic lookup rather than a flat list.
    if not query:
        return SCHEMES
    return [s for s in SCHEMES if query.lower() in s["name"].lower()]
