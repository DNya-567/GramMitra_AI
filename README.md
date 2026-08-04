# GramMitra AI — Multilingual AI Farmer Assistant

Final-year Computer Engineering project (ISBM College of Engineering, Pune — SPPU).

## What this is
A multilingual AI-assisted web/PWA platform for farmers: crop
recommendation, weather advisory, fertilizer suggestion, a multilingual
chatbot (also covering government scheme guidance), complaint
classification & routing, and live mandi market prices.

See `docs/scope.md` for the full in-scope/out-of-scope list and
`docs/api-contract.md` for the contract every module builds against.

## Repo structure
```
backend/    FastAPI app — routes/ (thin) -> services/ (logic) -> models/ (DB)
frontend/   React + Vite PWA — pages/, api/, context/
ml/         Model training scripts, kept separate from live API code
docs/       Scope, API contract, and this project's LaTeX reference doc
```

## Running it locally

### Backend
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env   # fill in real keys
uvicorn app.main:app --reload
```
Health check: `http://localhost:8000/health`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Team workflow
Read `CONTRIBUTING.md` before pushing any code — branching, commit style,
and PR review conventions all live there.

## Status
This is the starter skeleton: routes and services are wired end-to-end
but return placeholder data. Each module owner fills in the `# TODO`
markers in their assigned files.
