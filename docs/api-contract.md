# API contract

Fill this in together as a team BEFORE writing backend/frontend code for
each feature. This is the shared source of truth — frontend and backend
can then be built independently and still fit together.

## Example (fill in real ones below)

### POST /api/v1/crop/recommend
Request:
```json
{
  "nitrogen": "number",
  "phosphorus": "number",
  "potassium": "number",
  "temperature": "number",
  "humidity": "number",
  "ph": "number",
  "rainfall_mm": "number"
}
```
Response:
```json
{
  "recommended_crop": "string",
  "confidence": "number"
}
```

---

### POST /api/chatbot-query
Request: TBD

### POST /api/complaint
Request: TBD

### GET /api/weather-advisory
Request: TBD

### POST /api/fertilizer-suggest
Request: TBD