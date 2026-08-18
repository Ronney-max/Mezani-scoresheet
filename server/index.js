import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';

const app = express();
const port = process.env.PORT || 4000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const scoresFile = path.join(dataDir, 'scores.json');
const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT || 'https://formspree.io/f/myegyagd';

const competitors = [
  'Jackline Mwangi', 'Ryan Kagombe', "Ndung'u Agnes", 'Peter Njuguna',
  'Telvin Muthiora', 'York Adeva', 'Kahiga Ambrose', 'Jeremiah Mogendi',
  'Faith Nyawira', 'Nabil Ibrahim', 'Jomo Kinyanjui', 'Allan Kanja',
  'Rodney Isindu', 'Joy Nyawira', 'Vincent Changwony', 'Emmanuel Mumo',
  'Hillary Mulanda', 'Felix Ouma', 'Hillary Ouma',
].map((name, index) => ({ id: index + 1, name }));

app.use(express.json({ limit: '1mb' }));

async function readScores() {
  try {
    return JSON.parse(await fs.readFile(scoresFile, 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }
}

async function writeScores(scores) {
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(scoresFile, JSON.stringify(scores, null, 2));
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/competitors', (_req, res) => res.json(competitors));
app.get('/api/scores', async (_req, res, next) => {
  try { res.json(await readScores()); } catch (error) { next(error); }
});

app.post('/api/scores', async (req, res, next) => {
  try {
    const { judgeName, date, round, sensoryMax, technicalMax, entries, comments } = req.body;
    if (!judgeName?.trim()) return res.status(400).json({ message: 'Judge name is required.' });
    if (!(Number(sensoryMax) > 0) || !(Number(technicalMax) > 0)) {
      return res.status(400).json({ message: 'Maximum scores must be greater than zero.' });
    }
    if (!Array.isArray(entries) || entries.length !== competitors.length) {
      return res.status(400).json({ message: 'Scores are required for all competitors.' });
    }
    const normalized = entries.map((entry) => ({
      competitorId: Number(entry.competitorId),
      sensory: Number(entry.sensory),
      technical: Number(entry.technical),
    }));
    const invalid = normalized.some((entry) =>
      !Number.isFinite(entry.sensory) || !Number.isFinite(entry.technical) ||
      entry.sensory < 0 || entry.technical < 0 ||
      entry.sensory > Number(sensoryMax) || entry.technical > Number(technicalMax)
    );
    if (invalid) return res.status(400).json({ message: 'One or more scores are invalid.' });

    const record = {
      id: crypto.randomUUID(),
      judgeName: judgeName.trim(), date, round: round?.trim() || '',
      sensoryMax: Number(sensoryMax), technicalMax: Number(technicalMax),
      comments: comments?.trim() || '', entries: normalized,
      createdAt: new Date().toISOString(),
    };

    const formspreePayload = {
      _subject: `Mezani scores - ${record.judgeName} - ${record.date}`,
      competition: 'The Best of Mezani - Barista Competition',
      judgeName: record.judgeName,
      date: record.date,
      round: record.round || 'Unspecified session',
      sensoryMaximum: record.sensoryMax,
      technicalMaximum: record.technicalMax,
      combinedMaximum: record.sensoryMax + record.technicalMax,
      comments: record.comments || 'No comments provided',
      submittedAt: record.createdAt,
      scores: competitors.map((competitor) => {
        const entry = normalized.find((item) => item.competitorId === competitor.id);
        const total = entry.sensory + entry.technical;
        return {
          number: competitor.id,
          competitor: competitor.name,
          sensory: entry.sensory,
          technical: entry.technical,
          total,
          percentage: Number(((total / (record.sensoryMax + record.technicalMax)) * 100).toFixed(1)),
        };
      }),
    };

    const formspreeResponse = await fetch(formspreeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(formspreePayload),
    });
    if (!formspreeResponse.ok) {
      const failure = await formspreeResponse.json().catch(() => ({}));
      return res.status(502).json({
        message: failure.errors?.[0]?.message || 'Formspree could not store this scoresheet. Please try again.',
      });
    }

    const scores = await readScores();
    scores.unshift(record);
    await writeScores(scores);
    res.status(201).json(record);
  } catch (error) { next(error); }
});

app.delete('/api/scores/:id', async (req, res, next) => {
  try {
    const scores = await readScores();
    const nextScores = scores.filter((score) => score.id !== req.params.id);
    if (nextScores.length === scores.length) return res.status(404).json({ message: 'Scoresheet not found.' });
    await writeScores(nextScores);
    res.status(204).end();
  } catch (error) { next(error); }
});

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(root, 'dist')));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(port, () => console.log(`Scoresheet server listening on http://localhost:${port}`));
