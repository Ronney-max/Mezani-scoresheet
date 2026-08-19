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

## Separate frontend and backend

The React frontend and Node API can run as independent services:

- Build the React static site with `VITE_API_URL` set to the public Node API URL.
- Run the Node API with `SERVE_FRONTEND=false`.
- Set `FRONTEND_ORIGIN` on Node to the exact React site origin. Separate multiple
  allowed origins with commas.

The frontend uses `VITE_API_URL` for every API request. The backend validates
the frontend origin with CORS before accepting browser requests. See
`.env.example` for local values and `render.split.yaml` for the two-service
Render Blueprint.

## Render deployment

The included `render.yaml` creates a Node web service with a persistent disk.
Connect this repository in Render and select **New > Blueprint**. Render will
use the build, start, health-check, and disk settings automatically.

The existing `render.yaml` preserves the current combined deployment. To create
the separated architecture without interrupting it, create a second Blueprint
and select `render.split.yaml` as the Blueprint path. It defines a React static
site and a Node API web service.
