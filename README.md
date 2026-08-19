# Mezani Competition Scoresheet

A full-stack React and Node scoring application for the Africa Food Show Kenya
barista competition. It includes all 19 competitors, sensory and technical
scoring, automatic totals and percentages, saved judging sessions, and a
printable judging sheet.

## Local development

```bash
npm install
npm run dev
```

The React development server runs on port 5173 and proxies API requests to the
Node server on port 4000.

## Production

```bash
npm run build
npm start
```

The Node server serves both the API and the compiled React application. Set
`PORT` to choose its listening port and `DATA_DIR` to select the persistent
scoresheet storage directory. Completed scoresheets are also submitted to the
Formspree endpoint configured through `FORMSPREE_ENDPOINT`.

## Separate Netlify frontend and Render backend

The React frontend and Node API run as independent services:

- Netlify builds the React static site using `netlify.toml` and injects the
  public Render API URL through `VITE_API_URL`.
- Render runs the Node API with `SERVE_FRONTEND=false` using `render.api.yaml`.
- Set `FRONTEND_ORIGIN` on Render to the exact Netlify site origin. Separate multiple
  allowed origins with commas.

The frontend uses `VITE_API_URL` for every API request. The backend validates
the frontend origin with CORS before accepting browser requests. See
`.env.example` for local values, `netlify.toml` for the frontend, and
`render.api.yaml` for the backend.

## Render deployment

The included `render.yaml` creates a Node web service with a persistent disk.
Connect this repository in Render and select **New > Blueprint**. Render will
use the build, start, health-check, and disk settings automatically.

The existing `render.yaml` preserves the current combined deployment during the
migration. Create a second Render Blueprint and select `render.api.yaml` as its
path to create the backend API. Then import the same GitHub repository in
Netlify; `netlify.toml` supplies the frontend build and routing settings.
