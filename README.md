# Mezani Competition Scoresheet

This repository contains two independent applications. They communicate only
through the backend's HTTP API.

```text
frontend/  React + Vite website (Netlify)
backend/   Node + Express API (Render)
```

There is intentionally no root `package.json`. Each application owns its source,
dependencies, lockfile, environment variables, development command, and hosting
configuration.

## Frontend (React / Netlify)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`. `VITE_API_URL` identifies the
separately running backend. The root `netlify.toml` explicitly sets the Netlify
base directory to `frontend`, so importing the repository requires no manual
build-directory configuration.

## Backend (Node / Render)

```bash
cd backend
cp .env.example .env
npm install
npm run dev
```

The backend runs at `http://localhost:4000`. It owns competitor data, validation,
score persistence, and Formspree submission. It never builds or serves React.

For Render, create a Blueprint using the root `render.yaml`. It explicitly sets
`rootDir: backend` for the separated Node application. Set
`FRONTEND_ORIGIN` to the exact Netlify origin. The production Blueprint is fixed
to `https://mezani-scoresheet.netlify.app`; multiple local or preview origins can
be comma-separated when configuring the backend manually.

## Communication

The React frontend calls these independent backend routes:

- `GET /api/health`
- `POST /api/auth/login`
- `GET /api/judging/:role/competitors`
- `GET /api/judging/:role/submissions`
- `POST /api/judging/:role/competitors/:competitorId`
- `GET /api/results` (administrator only)

Sensory and technical judges submit independently. Every accepted submission is
sent to the configured Formspree endpoint and stored by the backend. Render uses
a free Postgres database through `DATABASE_URL`; local development falls back to
`backend/data/scores.json`.

## Separated judging access

The deployed site has three protected routes:

- `/sensory` accepts only a sensory access code and can call only sensory APIs.
- `/technical` accepts only a technical access code and can call only technical APIs.
- `/results` accepts only the administrator code and combines the latest sensory
  and technical record for each competitor into the overall score out of 237.

Set `SENSORY_ACCESS_CODE`, `TECHNICAL_ACCESS_CODE`, and `ADMIN_ACCESS_CODE` to
different private values in Render. `AUTH_SECRET` signs the 12-hour role tokens
and is generated automatically by the Render Blueprint. Never place these values
in Netlify or in the React source.
