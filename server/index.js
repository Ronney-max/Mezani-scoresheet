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
const sensorySections = [
  { key: 'espresso', label: 'Espresso Evaluation', max: 49 },
  { key: 'milk', label: 'Milk Beverage Evaluation', max: 33 },
  { key: 'signature', label: 'Signature Beverage Evaluation', max: 42 },
  { key: 'barista', label: 'Barista Evaluation', max: 30 },
  { key: 'impression', label: 'Total Impression', max: 12 },
];
const sensoryMaximum = sensorySections.reduce((sum, section) => sum + section.max, 0);
const technicalSections = [
  { key: 'startUp', label: 'Station Evaluation at Start-Up', max: 6 },
  { key: 'espresso', label: 'Espresso Evaluation', max: 17 },
  { key: 'milk', label: 'Milk Beverage Evaluation', max: 22 },
  { key: 'signature', label: 'Signature Beverage Evaluation', max: 17 },
  { key: 'final', label: 'Final Technical Evaluation', max: 9 },
];
const technicalMaximum = technicalSections.reduce((sum, section) => sum + section.max, 0);

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

function normalizeEntry(entry) {
  const sensoryBreakdown = Object.fromEntries(sensorySections.map((section) => [section.key, Number(entry.sensory?.[section.key])]));
  const technicalBreakdown = Object.fromEntries(technicalSections.map((section) => [section.key, Number(entry.technical?.[section.key])]));
  return {
    competitorId: Number(entry.competitorId),
    sensoryBreakdown,
    sensory: Object.values(sensoryBreakdown).reduce((sum, value) => sum + value, 0),
    technicalBreakdown,
    technical: Object.values(technicalBreakdown).reduce((sum, value) => sum + value, 0),
  };
}

function entryIsInvalid(entry) {
  return sensorySections.some((section) => !Number.isFinite(entry.sensoryBreakdown[section.key]) || entry.sensoryBreakdown[section.key] < 0 || entry.sensoryBreakdown[section.key] > section.max) ||
    technicalSections.some((section) => !Number.isFinite(entry.technicalBreakdown[section.key]) || entry.technicalBreakdown[section.key] < 0 || entry.technicalBreakdown[section.key] > section.max);
}

function normalizeSection(rawScores, sections) {
  return Object.fromEntries(sections.map((section) => [section.key, Number(rawScores?.[section.key])]));
}

function sectionIsInvalid(breakdown, sections) {
  return sections.some((section) => !Number.isFinite(breakdown[section.key]) || breakdown[section.key] < 0 || breakdown[section.key] > section.max);
}

async function saveRecord(record) {
  const scores = await readScores();
  scores.unshift(record);
  await writeScores(scores);
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/competitors', (_req, res) => res.json(competitors));
app.get('/api/scores', async (_req, res, next) => {
  try { res.json(await readScores()); } catch (error) { next(error); }
});

app.post('/api/scores/competitor/:competitorId/sensory', async (req, res, next) => {
  try {
    const { judgeName, date, round, scores } = req.body;
    if (!judgeName?.trim()) return res.status(400).json({ message: 'Sensory judge name is required.' });
    const competitor = competitors.find((person) => person.id === Number(req.params.competitorId));
    if (!competitor) return res.status(404).json({ message: 'Competitor not found.' });

    const breakdown = normalizeSection(scores, sensorySections);
    if (sectionIsInvalid(breakdown, sensorySections)) return res.status(400).json({ message: 'Complete all sensory criteria for this competitor.' });
    const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    const record = {
      id: crypto.randomUUID(), submissionType: 'sensory', competitorId: competitor.id,
      competitorName: competitor.name, judgeName: judgeName.trim(), date,
      round: round?.trim() || '', maximum: sensoryMaximum, breakdown, total,
      percentage: Number(((total / sensoryMaximum) * 100).toFixed(1)),
      createdAt: new Date().toISOString(),
    };

    const formspreeResponse = await fetch(formspreeEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Mezani sensory score - ${competitor.name} - ${record.judgeName}`,
        submissionType: 'Sensory score', competition: 'The Best of Mezani - Barista Competition',
        competitorNumber: competitor.id, competitor: competitor.name, sensoryJudge: record.judgeName,
        date: record.date, round: record.round || 'Unspecified session', sensoryBreakdown: breakdown,
        sensoryScore: total, sensoryMaximum, percentage: record.percentage, submittedAt: record.createdAt,
      }),
    });
    if (!formspreeResponse.ok) return res.status(502).json({ message: 'Formspree could not store this sensory score. Please try again.' });
    await saveRecord(record);
    res.status(201).json(record);
  } catch (error) { next(error); }
});

app.post('/api/scores/competitor/:competitorId/technical', async (req, res, next) => {
  try {
    const { judgeName, date, round, scores } = req.body;
    if (!judgeName?.trim()) return res.status(400).json({ message: 'Technical judge name is required.' });
    const competitor = competitors.find((person) => person.id === Number(req.params.competitorId));
    if (!competitor) return res.status(404).json({ message: 'Competitor not found.' });

    const breakdown = normalizeSection(scores, technicalSections);
    if (sectionIsInvalid(breakdown, technicalSections)) return res.status(400).json({ message: 'Complete all technical criteria for this competitor.' });
    const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
    const record = {
      id: crypto.randomUUID(), submissionType: 'technical', competitorId: competitor.id,
      competitorName: competitor.name, judgeName: judgeName.trim(), date,
      round: round?.trim() || '', maximum: technicalMaximum, breakdown, total,
      percentage: Number(((total / technicalMaximum) * 100).toFixed(1)),
      createdAt: new Date().toISOString(),
    };

    const formspreeResponse = await fetch(formspreeEndpoint, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Mezani technical score - ${competitor.name} - ${record.judgeName}`,
        submissionType: 'Technical score', competition: 'The Best of Mezani - Barista Competition',
        competitorNumber: competitor.id, competitor: competitor.name, technicalJudge: record.judgeName,
        date: record.date, round: record.round || 'Unspecified session', technicalBreakdown: breakdown,
        technicalScore: total, technicalMaximum, percentage: record.percentage, submittedAt: record.createdAt,
      }),
    });
    if (!formspreeResponse.ok) return res.status(502).json({ message: 'Formspree could not store this technical score. Please try again.' });
    await saveRecord(record);
    res.status(201).json(record);
  } catch (error) { next(error); }
});

app.post('/api/scores/competitor', async (req, res, next) => {
  try {
    const { judgeName, date, round, comments, entry } = req.body;
    if (!judgeName?.trim()) return res.status(400).json({ message: 'Judge name is required.' });

    const competitor = competitors.find((person) => person.id === Number(entry?.competitorId));
    if (!competitor) return res.status(400).json({ message: 'A valid competitor is required.' });
    const normalized = normalizeEntry(entry);
    if (entryIsInvalid(normalized)) return res.status(400).json({ message: 'Complete all scoring criteria for this competitor.' });

    const total = normalized.sensory + normalized.technical;
    const combinedMaximum = sensoryMaximum + technicalMaximum;
    const record = {
      id: crypto.randomUUID(),
      submissionType: 'individual-competitor',
      competitorId: competitor.id,
      competitorName: competitor.name,
      judgeName: judgeName.trim(),
      date,
      round: round?.trim() || '',
      sensoryMax: sensoryMaximum,
      technicalMax: technicalMaximum,
      comments: comments?.trim() || '',
      entry: normalized,
      total,
      percentage: Number(((total / combinedMaximum) * 100).toFixed(1)),
      createdAt: new Date().toISOString(),
    };

    const formspreeResponse = await fetch(formspreeEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        _subject: `Mezani score - ${competitor.name} - ${record.judgeName}`,
        submissionType: 'Individual competitor score',
        competition: 'The Best of Mezani - Barista Competition',
        competitorNumber: competitor.id,
        competitor: competitor.name,
        judgeName: record.judgeName,
        date: record.date,
        round: record.round || 'Unspecified session',
        sensoryScore: normalized.sensory,
        sensoryMaximum: record.sensoryMax,
        sensoryBreakdown: Object.fromEntries(sensorySections.map((section) => [section.label, normalized.sensoryBreakdown[section.key]])),
        technicalScore: normalized.technical,
        technicalMaximum,
        technicalBreakdown: Object.fromEntries(technicalSections.map((section) => [section.label, normalized.technicalBreakdown[section.key]])),
        totalScore: total,
        combinedMaximum,
        percentage: record.percentage,
        comments: record.comments || 'No comments provided',
        submittedAt: record.createdAt,
      }),
    });
    if (!formspreeResponse.ok) {
      const failure = await formspreeResponse.json().catch(() => ({}));
      return res.status(502).json({ message: failure.errors?.[0]?.message || 'Formspree could not store this competitor score. Please try again.' });
    }

    const scores = await readScores();
    scores.unshift(record);
    await writeScores(scores);
    res.status(201).json(record);
  } catch (error) { next(error); }
});

app.post('/api/scores', async (req, res, next) => {
  try {
    const { judgeName, date, round, technicalMax, entries, comments } = req.body;
    if (!judgeName?.trim()) return res.status(400).json({ message: 'Judge name is required.' });
    if (!Array.isArray(entries) || entries.length !== competitors.length) {
      return res.status(400).json({ message: 'Scores are required for all competitors.' });
    }
    const normalized = entries.map(normalizeEntry);
    const invalid = normalized.some((entry) => entryIsInvalid(entry));
    if (invalid) return res.status(400).json({ message: 'One or more scores are invalid.' });

    const record = {
      id: crypto.randomUUID(),
      judgeName: judgeName.trim(), date, round: round?.trim() || '',
      sensoryMax: sensoryMaximum, technicalMax: technicalMaximum,
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
          sensoryBreakdown: Object.fromEntries(sensorySections.map((section) => [section.label, entry.sensoryBreakdown[section.key]])),
          technical: entry.technical,
          technicalBreakdown: Object.fromEntries(technicalSections.map((section) => [section.label, entry.technicalBreakdown[section.key]])),
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
  app.use(express.static(path.join(root, 'dist'), {
    etag: false,
    lastModified: false,
    setHeaders: (res, filePath) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    },
  }));
  app.get(/.*/, (_req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.sendFile(path.join(root, 'dist', 'index.html'));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(port, () => console.log(`Scoresheet server listening on http://localhost:${port}`));
