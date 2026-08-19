import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import cors from 'cors';
import pg from 'pg';

const app = express();
const port = process.env.PORT || 4000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const scoresFile = path.join(dataDir, 'scores.json');
const database = process.env.DATABASE_URL ? new pg.Pool({ connectionString: process.env.DATABASE_URL }) : null;
const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT || 'https://formspree.io/f/myegyagd';
const frontendOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',').map((origin) => origin.trim()).filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production';
function protectedSetting(name, developmentValue) {
  if (process.env[name]) return process.env[name];
  if (isProduction) throw new Error(`${name} must be configured in production.`);
  return developmentValue;
}
const accessCodes = {
  sensory: protectedSetting('SENSORY_ACCESS_CODE', 'sensory-dev'),
  technical: protectedSetting('TECHNICAL_ACCESS_CODE', 'technical-dev'),
  admin: protectedSetting('ADMIN_ACCESS_CODE', 'admin-dev'),
};
const authSecret = protectedSetting('AUTH_SECRET', 'local-development-secret-change-on-render');

const sensorySections = [
  { key: 'espresso', label: 'Espresso Evaluation', max: 49 },
  { key: 'milk', label: 'Milk Beverage Evaluation', max: 33 },
  { key: 'signature', label: 'Signature Beverage Evaluation', max: 42 },
  { key: 'barista', label: 'Barista Evaluation', max: 30 },
  { key: 'impression', label: 'Total Impression', max: 12 },
];
const technicalSections = [
  { key: 'startUp', label: 'Station Evaluation at Start-Up', max: 6 },
  { key: 'espresso', label: 'Espresso Evaluation', max: 17 },
  { key: 'milk', label: 'Milk Beverage Evaluation', max: 22 },
  { key: 'signature', label: 'Signature Beverage Evaluation', max: 17 },
  { key: 'final', label: 'Final Technical Evaluation', max: 9 },
];
const sectionsByRole = { sensory: sensorySections, technical: technicalSections };
const maximumByRole = {
  sensory: sensorySections.reduce((sum, section) => sum + section.max, 0),
  technical: technicalSections.reduce((sum, section) => sum + section.max, 0),
};
const combinedMaximum = maximumByRole.sensory + maximumByRole.technical;
const competitors = [
  'Jackline Mwangi', 'Ryan Kagombe', "Ndung'u Agnes", 'Peter Njuguna',
  'Telvin Muthiora', 'York Adeva', 'Kahiga Ambrose', 'Jeremiah Mogendi',
  'Faith Nyawira', 'Nabil Ibrahim', 'Jomo Kinyanjui', 'Allan Kanja',
  'Rodney Isindu', 'Joy Nyawira', 'Vincent Changwony', 'Emmanuel Mumo',
  'Hillary Mulanda', 'Felix Ouma', 'Hillary Ouma',
].map((name, index) => ({ id: index + 1, name }));

app.use(cors({
  origin(origin, callback) {
    if (!origin || frontendOrigins.includes(origin)) return callback(null, true);
    const error = new Error('This frontend origin is not allowed.');
    error.status = 403;
    return callback(error);
  },
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

async function readScores() {
  if (database) {
    await ensureDatabase();
    const result = await database.query('SELECT record FROM score_records ORDER BY created_at DESC');
    return result.rows.map((row) => row.record);
  }
  try { return JSON.parse(await fs.readFile(scoresFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function saveRecord(record) {
  if (database) {
    await ensureDatabase();
    await database.query(
      'INSERT INTO score_records (id, record, created_at) VALUES ($1, $2::jsonb, $3)',
      [record.id, JSON.stringify(record), record.createdAt],
    );
    return;
  }
  const scores = await readScores();
  scores.unshift(record);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(scoresFile, JSON.stringify(scores, null, 2));
}

let databaseReady;
function ensureDatabase() {
  if (!databaseReady) {
    databaseReady = database.query(`
      CREATE TABLE IF NOT EXISTS score_records (
        id text PRIMARY KEY,
        record jsonb NOT NULL,
        created_at timestamptz NOT NULL
      )
    `);
  }
  return databaseReady;
}

function safeEqual(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function signToken(role) {
  const payload = Buffer.from(JSON.stringify({ role, expiresAt: Date.now() + 12 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function readToken(req) {
  const token = req.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', authSecret).update(payload).digest('base64url');
  if (!safeEqual(signature, expected)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return parsed.expiresAt > Date.now() ? parsed : null;
  } catch { return null; }
}

function requireRole(...roles) {
  return (req, res, next) => {
    const session = readToken(req);
    if (!session) return res.status(401).json({ message: 'Sign in to continue.' });
    if (!roles.includes(session.role)) return res.status(403).json({ message: 'You cannot access this judging area.' });
    req.session = session;
    next();
  };
}

function normalizeScores(rawScores, sections) {
  return Object.fromEntries(sections.map((section) => [section.key, Number(rawScores?.[section.key])]));
}

function scoresInvalid(breakdown, sections) {
  return sections.some((section) => !Number.isFinite(breakdown[section.key]) || breakdown[section.key] < 0 || breakdown[section.key] > section.max);
}

function latestByCompetitor(records, role) {
  const latest = new Map();
  records.filter((record) => record.submissionType === role).forEach((record) => {
    if (!latest.has(record.competitorId)) latest.set(record.competitorId, record);
  });
  return latest;
}

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/login', (req, res) => {
  const { role, accessCode } = req.body;
  if (!Object.hasOwn(accessCodes, role) || !safeEqual(accessCode || '', accessCodes[role])) {
    return res.status(401).json({ message: 'The role or access code is incorrect.' });
  }
  res.json({ role, token: signToken(role) });
});

app.get('/api/judging/:role/competitors', (req, res, next) => {
  const role = req.params.role;
  if (!sectionsByRole[role]) return res.status(404).json({ message: 'Judging area not found.' });
  return requireRole(role)(req, res, () => res.json({ competitors, maximum: maximumByRole[role] }));
});

app.get('/api/judging/:role/submissions', async (req, res, next) => {
  const role = req.params.role;
  if (!sectionsByRole[role]) return res.status(404).json({ message: 'Judging area not found.' });
  return requireRole(role)(req, res, async () => {
    try {
      const records = await readScores();
      res.json(records.filter((record) => record.submissionType === role));
    } catch (error) { next(error); }
  });
});

app.post('/api/judging/:role/competitors/:competitorId', async (req, res, next) => {
  const role = req.params.role;
  if (!sectionsByRole[role]) return res.status(404).json({ message: 'Judging area not found.' });
  return requireRole(role)(req, res, async () => {
    try {
      const { judgeName, date, round, scores } = req.body;
      if (!judgeName?.trim()) return res.status(400).json({ message: `${role === 'sensory' ? 'Sensory' : 'Technical'} judge name is required.` });
      const competitor = competitors.find((person) => person.id === Number(req.params.competitorId));
      if (!competitor) return res.status(404).json({ message: 'Competitor not found.' });
      const sections = sectionsByRole[role];
      const breakdown = normalizeScores(scores, sections);
      if (scoresInvalid(breakdown, sections)) return res.status(400).json({ message: `Complete all ${role} criteria for this competitor.` });
      const total = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
      const record = {
        id: crypto.randomUUID(), submissionType: role, competitorId: competitor.id,
        competitorName: competitor.name, judgeName: judgeName.trim(), date,
        round: round?.trim() || '', maximum: maximumByRole[role], breakdown, total,
        percentage: Number(((total / maximumByRole[role]) * 100).toFixed(1)),
        createdAt: new Date().toISOString(),
      };
      const title = role === 'sensory' ? 'Sensory' : 'Technical';
      const formspreeResponse = await fetch(formspreeEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Mezani ${role} score - ${competitor.name} - ${record.judgeName}`,
          submissionType: `${title} score`, competition: 'The Best of Mezani - Barista Competition',
          competitorNumber: competitor.id, competitor: competitor.name,
          [`${role}Judge`]: record.judgeName, date: record.date,
          round: record.round || 'Unspecified session', [`${role}Breakdown`]: breakdown,
          [`${role}Score`]: total, [`${role}Maximum`]: maximumByRole[role],
          percentage: record.percentage, submittedAt: record.createdAt,
        }),
      });
      if (!formspreeResponse.ok) return res.status(502).json({ message: `Formspree could not store this ${role} score. Please try again.` });
      await saveRecord(record);
      res.status(201).json(record);
    } catch (error) { next(error); }
  });
});

app.get('/api/results', requireRole('admin'), async (_req, res, next) => {
  try {
    const records = await readScores();
    const sensory = latestByCompetitor(records, 'sensory');
    const technical = latestByCompetitor(records, 'technical');
    const results = competitors.map((competitor) => {
      const sensoryRecord = sensory.get(competitor.id);
      const technicalRecord = technical.get(competitor.id);
      const ready = Boolean(sensoryRecord && technicalRecord);
      const total = ready ? sensoryRecord.total + technicalRecord.total : null;
      return {
        ...competitor, ready, sensoryTotal: sensoryRecord?.total ?? null,
        technicalTotal: technicalRecord?.total ?? null, total,
        percentage: ready ? Number(((total / combinedMaximum) * 100).toFixed(1)) : null,
        sensorySubmittedAt: sensoryRecord?.createdAt ?? null,
        technicalSubmittedAt: technicalRecord?.createdAt ?? null,
      };
    }).sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
    res.json({ maximum: combinedMaximum, results });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong on the server.' });
});

app.listen(port, () => console.log(`Scoresheet API listening on http://localhost:${port}`));
