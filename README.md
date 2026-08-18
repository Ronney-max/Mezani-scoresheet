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
scoresheet storage directory.

## Render deployment

The included `render.yaml` creates a Node web service with a persistent disk.
Connect this repository in Render and select **New > Blueprint**. Render will
use the build, start, health-check, and disk settings automatically.
