# GramMitra AI — New Machine Setup (Follow in Order)

Do these steps **in this exact sequence**. Don't skip ahead — each step
depends on the one before it.

---

## Step 1 — Clone the repo

```
git clone https://github.com/DNya-567/GramMitra_AI.git
cd GramMitra_AI
git checkout develop
git pull origin develop
```

You now have all the code. You do **not** yet have secrets or installed
packages — that's expected, do steps 2–6 next.

---

## Step 2 — Get the secret values

Ask the team (secure share link / shared vault / Supabase dashboard invite)
for these **4 values**. Never accept them over plain WhatsApp/Slack text —
ask for a one-time secure link instead.

- `SUPABASE_JWT_SECRET`
- `DATABASE_URL` (the full Postgres connection string, includes a password)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

---

## Step 3 — Create `backend/.env`

```
cd GramMitra_AI/backend
notepad .env
```

Paste in exactly this, replacing the `...` with the real values from Step 2:

```
SUPABASE_JWT_SECRET=...
DATABASE_URL="..."
```

**Keep the double quotes around `DATABASE_URL`** — the real password
contains a `#` character, and quotes stop it from being cut off.

Save and close.

---

## Step 4 — Create `frontend/.env`

```
cd GramMitra_AI/frontend
notepad .env
```

Paste in:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

Save and close.

---

## Step 5 — Set up the backend (Python)

Run these **in order**, from inside `GramMitra_AI/backend`:

```
cd GramMitra_AI/backend
python -m venv .venv
.venv\Scripts\activate
python -m pip install -r requirements.txt
```

You'll know it worked if your terminal prompt now starts with `(.venv)`.

**Mac/Linux users**, the activate command is different:
```
source .venv/bin/activate
```

---

## Step 6 — Set up the frontend (Node)

```
cd GramMitra_AI/frontend
npm install
```

This can take a few minutes the first time — that's normal.

---

## Step 7 — Run the backend

From `GramMitra_AI/backend`, with `.venv` still active:

```
uvicorn app.main:app --reload
```

Check in your browser:
- `http://localhost:8000/health` → should show `{"status":"ok"}`
- `http://localhost:8000/docs` → should show all API routes

Leave this terminal running.

---

## Step 8 — Run the frontend

Open a **new** terminal window, then:

```
cd GramMitra_AI/frontend
npm run dev
```

Check in your browser:
- `http://localhost:5173/login` → should show the GramMitra login page

Leave this terminal running too.

---

## If something breaks

| Symptom | Likely cause | Fix |
|---|---|---|
| `ModuleNotFoundError` in Python | `.venv` isn't active | Run the `activate` command from Step 5 again |
| `'vite' is not recognized` | `npm install` wasn't run, or failed | Re-run Step 6, watch for errors |
| Frontend crashes immediately, blank page | `frontend/.env` missing or wrong variable names | Recheck Step 4 exactly |
| `DATABASE_URL is not set` error | `backend/.env` missing, or file is empty | Recheck Step 3 |
| `failed to resolve host` DB error | Using the direct connection string instead of the pooler one | Ask for the **pooler** connection string specifically (port `6543`, host has `pooler.supabase.com`) |

---

## After setup: your daily workflow

```
git checkout develop
git pull origin develop
git checkout -b feature/<your-module-name>
```

Build your feature, then:

```
git add .
git commit -m "Add <your feature> endpoint"
git push origin feature/<your-module-name>
```

Then open a Pull Request on GitHub into `develop` and ask a teammate to
review it before merging.
