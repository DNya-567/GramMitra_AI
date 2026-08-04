# Team conventions

Paste this file as context when prompting an AI coding tool, so everyone's
generated code converges on the same patterns.

## Branching
- `main` — always working, demo-ready. Protected, no direct pushes.
- `develop` — integration branch. All feature branches merge here first.
- `feature/<short-name>` — one branch per task, e.g. `feature/crop-recommendation`
- `fix/<short-name>` — bug fixes

## Commits
Short, specific, present tense: `Add crop recommendation API endpoint`
Not: `update`, `fix stuff`, `changes`

## Naming conventions
- JavaScript/React: camelCase for variables/functions, PascalCase for components
- Python: snake_case for variables/functions, PascalCase for classes
- API routes: kebab-case, e.g. `/api/crop-recommend`
- Database tables/columns: snake_case

## Folder structure (per module)
```
frontend/src/
  components/
  pages/
  api/          # API call wrappers
  utils/

backend/
  routes/
  models/
  services/
  utils/
```

## Before opening a pull request
- Run the linter/formatter locally (config is in the repo root)
- Make sure your branch is up to date with `develop`
- Write a clear PR description: what changed and why
- Tag at least one teammate as reviewer

## API changes
Never change a request/response shape without updating `/docs/api-contract.md`
first and flagging it to the team — other modules depend on the contract
staying stable.
