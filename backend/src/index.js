import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import cors from 'cors';
import pg from 'pg';

const app = express();
app.set('trust proxy', 1);
const port = process.env.PORT || 4000;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
const scoresFile = path.join(dataDir, 'scores.json');
const database = process.env.DATABASE_URL ? new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DATABASE_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  maxUses: 7_500,
}) : null;
const formspreeEndpoint = process.env.FORMSPREE_ENDPOINT || 'https://formspree.io/f/myegyagd';
const formspreeTimeoutMs = Number(process.env.FORMSPREE_TIMEOUT_MS || 8_000);
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
  head: protectedSetting('HEAD_JUDGE_ACCESS_CODE', 'head-dev'),
  admin: protectedSetting('ADMIN_ACCESS_CODE', 'admin-dev'),
};
const authSecret = protectedSetting('AUTH_SECRET', 'local-development-secret-change-on-render');

const sensorySections = [
  { key: 'espressoCrema', label: 'Espresso - Crema', max: 1, multiplier: 1 },
  { key: 'espressoTasteAccuracy', label: 'Espresso - Accuracy of Taste Descriptors', max: 3, multiplier: 4 },
  { key: 'espressoTactileAccuracy', label: 'Espresso - Accuracy of Tactile Descriptors', max: 3, multiplier: 2 },
  { key: 'espressoTasteExperience', label: 'Espresso - Taste Experience', max: 6, multiplier: 3 },
  { key: 'espressoTactileExperience', label: 'Espresso - Tactile Experience', max: 6, multiplier: 2 },
  { key: 'milkVisualAppeal', label: 'Milk Beverage - Visual Appeal', max: 3, multiplier: 1 },
  { key: 'milkTasteAccuracy', label: 'Milk Beverage - Accuracy of Taste Descriptors', max: 3, multiplier: 4 },
  { key: 'milkTasteExperience', label: 'Milk Beverage - Taste Experience', max: 6, multiplier: 3 },
  { key: 'signatureTasteAccuracy', label: 'Signature Beverage - Accuracy of Taste Descriptors', max: 3, multiplier: 4 },
  { key: 'signatureExplained', label: 'Signature Beverage - Well Explained, Introduced, and Prepared', max: 6, multiplier: 2 },
  { key: 'signatureTasteExperience', label: 'Signature Beverage - Taste Experience', max: 6, multiplier: 3 },
  { key: 'baristaAttention', label: 'Barista - Attention to Details/All Accessories Available', max: 3, multiplier: 2 },
  { key: 'baristaPresentation', label: 'Barista - Presentation', max: 6, multiplier: 3 },
  { key: 'baristaKnowledge', label: 'Barista - Coffee Knowledge/Use of Equipment & Space', max: 3, multiplier: 2 },
  { key: 'totalImpression', label: "Judge's Total Impression", max: 6, multiplier: 2 },
];
const technicalSections = [
  { key: 'startUpCleanliness', label: 'Start-Up - Clean Working Area/Clean Cloths', max: 6, multiplier: 1 },
  { key: 'espressoFlush', label: 'Espresso - Flushes the Group Head', max: 1, multiplier: 1 },
  { key: 'espressoBasket', label: 'Espresso - Dry/Clean Filter Basket Before Dosing', max: 1, multiplier: 1 },
  { key: 'espressoWaste', label: 'Espresso - Acceptable Spill/Waste When Dosing/Grinding', max: 6, multiplier: 1 },
  { key: 'espressoDoseTamp', label: 'Espresso - Consistent Dosing and Tamping', max: 6, multiplier: 1 },
  { key: 'espressoPortafilter', label: 'Espresso - Cleans Portafilters Before Insert', max: 1, multiplier: 1 },
  { key: 'espressoImmediateBrew', label: 'Espresso - Insert and Immediate Brew', max: 1, multiplier: 1 },
  { key: 'espressoExtraction', label: 'Espresso - Extraction Time Within 3 Second Variance', max: 1, multiplier: 1 },
  { key: 'milkFlush', label: 'Milk Beverage - Flushes the Group Head', max: 1, multiplier: 1 },
  { key: 'milkBasket', label: 'Milk Beverage - Dry/Clean Filter Basket Before Dosing', max: 1, multiplier: 1 },
  { key: 'milkWaste', label: 'Milk Beverage - Acceptable Spill/Waste When Dosing/Grinding', max: 6, multiplier: 1 },
  { key: 'milkDoseTamp', label: 'Milk Beverage - Consistent Dosing and Tamping', max: 6, multiplier: 1 },
  { key: 'milkPortafilter', label: 'Milk Beverage - Cleans Portafilters Before Insert', max: 1, multiplier: 1 },
  { key: 'milkImmediateBrew', label: 'Milk Beverage - Insert and Immediate Brew', max: 1, multiplier: 1 },
  { key: 'milkExtraction', label: 'Milk Beverage - Extraction Time Within 3 Second Variance', max: 1, multiplier: 1 },
  { key: 'milkPitcher', label: 'Milk Beverage - Empty/Clean Pitcher at Start', max: 1, multiplier: 1 },
  { key: 'milkPurgeBefore', label: 'Milk Beverage - Purges Steam Wand Before Steaming', max: 1, multiplier: 1 },
  { key: 'milkCleanWand', label: 'Milk Beverage - Cleans Steam Wand After Steaming', max: 1, multiplier: 1 },
  { key: 'milkPurgeAfter', label: 'Milk Beverage - Purges Steam Wand After Steaming', max: 1, multiplier: 1 },
  { key: 'milkWasteEnd', label: 'Milk Beverage - Acceptable Milk Waste at End', max: 1, multiplier: 1 },
  { key: 'signatureFlush', label: 'Signature Beverage - Flushes the Group Head', max: 1, multiplier: 1 },
  { key: 'signatureBasket', label: 'Signature Beverage - Dry/Clean Filter Basket Before Dosing', max: 1, multiplier: 1 },
  { key: 'signatureWaste', label: 'Signature Beverage - Acceptable Spill/Waste When Dosing/Grinding', max: 6, multiplier: 1 },
  { key: 'signatureDoseTamp', label: 'Signature Beverage - Consistent Dosing and Tamping', max: 6, multiplier: 1 },
  { key: 'signaturePortafilter', label: 'Signature Beverage - Cleans Portafilters Before Insert', max: 1, multiplier: 1 },
  { key: 'signatureImmediateBrew', label: 'Signature Beverage - Insert and Immediate Brew', max: 1, multiplier: 1 },
  { key: 'signatureExtraction', label: 'Signature Beverage - Extraction Time Within 3 Second Variance', max: 1, multiplier: 1 },
  { key: 'finalStation', label: 'Technical - Station Management/Clean Working Area at End', max: 6, multiplier: 1 },
  { key: 'finalSpouts', label: 'Technical - Clean Portafilter Spouts/Avoided Doser Chamber', max: 1, multiplier: 1 },
  { key: 'finalHygiene', label: 'Technical - General Hygiene Throughout Presentation', max: 1, multiplier: 1 },
  { key: 'finalCloths', label: 'Technical - Proper Usage of Cloths', max: 1, multiplier: 1 },
];
const sectionsByRole = { sensory: sensorySections, technical: technicalSections };
const maximumByRole = {
  sensory: sensorySections.reduce((sum, section) => sum + section.max * section.multiplier, 0),
  technical: technicalSections.reduce((sum, section) => sum + section.max * section.multiplier, 0),
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
  allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
}));
app.use(express.json({ limit: '1mb' }));

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store',
  });
  next();
});

function rateLimit({ windowMs, maximum }) {
  const clients = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = clients.get(key);
    const entry = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    entry.count += 1;
    clients.set(key, entry);
    res.set('RateLimit-Remaining', String(Math.max(0, maximum - entry.count)));
    if (entry.count > maximum) return res.status(429).json({ message: 'Too many requests. Please wait briefly and try again.' });
    if (clients.size > 5_000) for (const [clientKey, value] of clients) if (value.resetAt <= now) clients.delete(clientKey);
    next();
  };
}

app.use('/api', rateLimit({ windowMs: 60_000, maximum: 3_000 }));

async function readScores({ role, competitorId } = {}) {
  if (database) {
    await ensureDatabase();
    const clauses = [];
    const values = [];
    if (role) { values.push(role); clauses.push(`submission_type = $${values.length}`); }
    if (competitorId) { values.push(competitorId); clauses.push(`competitor_id = $${values.length}`); }
    const where = clauses.length ? ` WHERE ${clauses.join(' AND ')}` : '';
    const result = await database.query(`SELECT record FROM score_records${where} ORDER BY created_at DESC`, values);
    return result.rows.map((row) => row.record);
  }
  try { return JSON.parse(await fs.readFile(scoresFile, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function saveRecord(record, formspreePayload) {
  if (database) {
    await ensureDatabase();
    const client = await database.connect();
    try {
      await client.query('BEGIN');
      const inserted = await client.query(
        `INSERT INTO score_records (id, submission_type, competitor_id, record, created_at)
         VALUES ($1, $2, $3, $4::jsonb, $5) ON CONFLICT (id) DO NOTHING RETURNING id`,
        [record.id, record.submissionType, record.competitorId, JSON.stringify(record), record.createdAt],
      );
      if (inserted.rowCount) {
        await client.query(
          `INSERT INTO formspree_outbox (id, payload, created_at, next_attempt_at)
           VALUES ($1, $2::jsonb, $3, NOW()) ON CONFLICT (id) DO NOTHING`,
          [record.id, JSON.stringify(formspreePayload), record.createdAt],
        );
      }
      await client.query('COMMIT');
      if (!inserted.rowCount) {
        const existing = await database.query('SELECT record FROM score_records WHERE id = $1', [record.id]);
        return { record: existing.rows[0]?.record, duplicate: true };
      }
      return { record, duplicate: false };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  const scores = await readScores();
  const existing = scores.find((item) => item.id === record.id);
  if (existing) return { record: existing, duplicate: true };
  scores.unshift(record);
  await fs.mkdir(dataDir, { recursive: true });
  await fs.writeFile(scoresFile, JSON.stringify(scores, null, 2));
  return { record, duplicate: false };
}

let databaseReady;
function ensureDatabase() {
  if (!databaseReady) {
    databaseReady = database.query(`
      CREATE TABLE IF NOT EXISTS score_records (
        id text PRIMARY KEY,
        submission_type text,
        competitor_id integer,
        record jsonb NOT NULL,
        created_at timestamptz NOT NULL
      );
      ALTER TABLE score_records ADD COLUMN IF NOT EXISTS submission_type text;
      ALTER TABLE score_records ADD COLUMN IF NOT EXISTS competitor_id integer;
      UPDATE score_records SET submission_type = record->>'submissionType' WHERE submission_type IS NULL;
      UPDATE score_records SET competitor_id = (record->>'competitorId')::integer WHERE competitor_id IS NULL;
      CREATE INDEX IF NOT EXISTS score_records_role_created_idx ON score_records (submission_type, created_at DESC);
      CREATE INDEX IF NOT EXISTS score_records_competitor_role_idx ON score_records (competitor_id, submission_type, created_at DESC);
      CREATE TABLE IF NOT EXISTS formspree_outbox (
        id text PRIMARY KEY,
        payload jsonb NOT NULL,
        attempts integer NOT NULL DEFAULT 0,
        next_attempt_at timestamptz NOT NULL DEFAULT NOW(),
        locked_until timestamptz,
        delivered_at timestamptz,
        last_error text,
        created_at timestamptz NOT NULL
      );
      ALTER TABLE formspree_outbox ADD COLUMN IF NOT EXISTS locked_until timestamptz;
      CREATE INDEX IF NOT EXISTS formspree_outbox_pending_idx ON formspree_outbox (next_attempt_at) WHERE delivered_at IS NULL;
    `);
  }
  return databaseReady;
}

function submissionId(req) {
  const value = String(req.get('Idempotency-Key') || '').trim();
  return /^[a-zA-Z0-9_-]{8,100}$/.test(value) ? value : crypto.randomUUID();
}

async function deliverOutbox(limit = 10) {
  if (!database) return;
  await ensureDatabase();
  const pending = await database.query(
    `WITH claimable AS (
       SELECT id FROM formspree_outbox
       WHERE delivered_at IS NULL AND next_attempt_at <= NOW()
         AND (locked_until IS NULL OR locked_until < NOW())
       ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1
     )
     UPDATE formspree_outbox AS queue SET locked_until = NOW() + INTERVAL '30 seconds'
     FROM claimable WHERE queue.id = claimable.id
     RETURNING queue.id, queue.payload, queue.attempts`, [limit],
  );
  await Promise.allSettled(pending.rows.map(async (item) => {
    try {
      const response = await fetch(formspreeEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(item.payload), signal: AbortSignal.timeout(formspreeTimeoutMs),
      });
      if (!response.ok) throw new Error(`Formspree returned ${response.status}`);
      await database.query('UPDATE formspree_outbox SET delivered_at = NOW(), locked_until = NULL, last_error = NULL WHERE id = $1', [item.id]);
    } catch (error) {
      const attempts = item.attempts + 1;
      const delaySeconds = Math.min(3600, 5 * (2 ** Math.min(attempts, 9)));
      await database.query(
        `UPDATE formspree_outbox SET attempts = $2, last_error = $3, locked_until = NULL,
         next_attempt_at = NOW() + ($4 * INTERVAL '1 second') WHERE id = $1`,
        [item.id, attempts, String(error.message || error).slice(0, 500), delaySeconds],
      );
    }
  }));
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

app.get('/api/health', (_req, res) => res.json({ ok: true, database: database ? 'configured' : 'file-fallback' }));
app.get('/api/ready', async (_req, res) => {
  try {
    if (database) await database.query('SELECT 1');
    res.json({ ready: true });
  } catch { res.status(503).json({ ready: false }); }
});

app.post('/api/auth/login', rateLimit({ windowMs: 15 * 60_000, maximum: 300 }), (req, res) => {
  const { role, accessCode } = req.body;
  if (!Object.hasOwn(accessCodes, role) || !safeEqual(accessCode || '', accessCodes[role])) {
    return res.status(401).json({ message: 'The role or access code is incorrect.' });
  }
  res.json({ role, token: signToken(role) });
});

app.get('/api/judging/:role/competitors', (req, res, next) => {
  const role = req.params.role;
  if (!sectionsByRole[role]) return res.status(404).json({ message: 'Judging area not found.' });
  return requireRole(role, 'head')(req, res, () => res.json({ competitors, maximum: maximumByRole[role] }));
});

app.get('/api/judging/:role/submissions', async (req, res, next) => {
  const role = req.params.role;
  if (!sectionsByRole[role]) return res.status(404).json({ message: 'Judging area not found.' });
  return requireRole(role, 'head')(req, res, async () => {
    try {
      const records = await readScores({ role });
      res.json(records);
    } catch (error) { next(error); }
  });
});

app.post('/api/judging/:role/competitors/:competitorId', async (req, res, next) => {
  const role = req.params.role;
  if (!sectionsByRole[role]) return res.status(404).json({ message: 'Judging area not found.' });
  return requireRole(role)(req, res, async () => {
    try {
      const { judgeName, date, round, scores, observations } = req.body;
      if (!judgeName?.trim()) return res.status(400).json({ message: `${role === 'sensory' ? 'Sensory' : 'Technical'} judge name is required.` });
      const competitor = competitors.find((person) => person.id === Number(req.params.competitorId));
      if (!competitor) return res.status(404).json({ message: 'Competitor not found.' });
      const sections = sectionsByRole[role];
      const breakdown = normalizeScores(scores, sections);
      if (scoresInvalid(breakdown, sections)) return res.status(400).json({ message: `Complete all ${role} criteria for this competitor.` });
      const weightedBreakdown = Object.fromEntries(sections.map((section) => [section.key, {
        score: breakdown[section.key], multiplier: section.multiplier,
        points: breakdown[section.key] * section.multiplier,
      }]));
      const total = sections.reduce((sum, section) => sum + breakdown[section.key] * section.multiplier, 0);
      const safeObservations = observations && typeof observations === 'object'
        ? Object.fromEntries(Object.entries(observations).map(([key, value]) => [key, String(value || '').trim().slice(0, 2000)]))
        : {};
      const record = {
        id: submissionId(req), submissionType: role, competitorId: competitor.id,
        competitorName: competitor.name, judgeName: judgeName.trim(), date,
        round: round?.trim() || '', maximum: maximumByRole[role], breakdown,
        weightedBreakdown, observations: safeObservations, total,
        percentage: Number(((total / maximumByRole[role]) * 100).toFixed(1)),
        createdAt: new Date().toISOString(),
      };
      const title = role === 'sensory' ? 'Sensory' : 'Technical';
      const formspreePayload = {
          _subject: `Mezani ${role} score - ${competitor.name} - ${record.judgeName}`,
          submissionType: `${title} score`, competition: 'The Best of Mezani - Barista Competition',
          competitorNumber: competitor.id, competitor: competitor.name,
          [`${role}Judge`]: record.judgeName, date: record.date,
          round: record.round || 'Unspecified session', [`${role}Breakdown`]: weightedBreakdown,
          [`${role}Observations`]: safeObservations,
          [`${role}Score`]: total, [`${role}Maximum`]: maximumByRole[role],
          percentage: record.percentage, submittedAt: record.createdAt,
        };
      const saved = await saveRecord(record, formspreePayload);
      void deliverOutbox(5).catch((error) => console.error('Outbox delivery failed:', error));
      res.status(saved.duplicate ? 200 : 201).json({ ...saved.record, deliveryStatus: 'saved' });
    } catch (error) { next(error); }
  });
});

app.get('/api/head-judge/competitors', requireRole('head'), (_req, res) => res.json(competitors));

app.get('/api/head-judge/competitors/:competitorId', requireRole('head'), async (req, res, next) => {
  try {
    const competitor = competitors.find((person) => person.id === Number(req.params.competitorId));
    if (!competitor) return res.status(404).json({ message: 'Competitor not found.' });
    const records = await readScores({ competitorId: competitor.id });
    res.json({
      competitor,
      sensory: records.filter((record) => record.competitorId === competitor.id && record.submissionType === 'sensory'),
      technical: records.filter((record) => record.competitorId === competitor.id && record.submissionType === 'technical'),
      headJudge: records.filter((record) => record.competitorId === competitor.id && record.submissionType === 'head-judge'),
    });
  } catch (error) { next(error); }
});

app.post('/api/head-judge/competitors/:competitorId', requireRole('head'), async (req, res, next) => {
  try {
    const { judgeName, date, round, sensoryRecordIds, technicalRecordId, withinTime, overtimeSeconds, observations } = req.body;
    if (!judgeName?.trim()) return res.status(400).json({ message: 'Head judge name is required.' });
    const competitor = competitors.find((person) => person.id === Number(req.params.competitorId));
    if (!competitor) return res.status(404).json({ message: 'Competitor not found.' });
    if (!Array.isArray(sensoryRecordIds) || sensoryRecordIds.length !== 4 || new Set(sensoryRecordIds).size !== 4) {
      return res.status(400).json({ message: 'Select four different sensory scores (S1-S4).' });
    }
    const records = await readScores({ competitorId: competitor.id });
    const sensoryRecords = sensoryRecordIds.map((id) => records.find((record) => record.id === id && record.competitorId === competitor.id && record.submissionType === 'sensory'));
    if (sensoryRecords.some((record) => !record)) return res.status(400).json({ message: 'One or more selected sensory scores are invalid.' });
    const technicalRecord = records.find((record) => record.id === technicalRecordId && record.competitorId === competitor.id && record.submissionType === 'technical');
    if (!technicalRecord) return res.status(400).json({ message: 'Select a valid technical score.' });
    const seconds = withinTime ? 0 : Math.max(0, Number(overtimeSeconds));
    if (!Number.isFinite(seconds)) return res.status(400).json({ message: 'Enter valid overtime seconds.' });
    const overtimePenalty = Math.min(60, seconds);
    const sensoryTotals = sensoryRecords.map((record) => record.total);
    const transferredTotal = technicalRecord.total + sensoryTotals.reduce((sum, total) => sum + total, 0);
    const total = transferredTotal - overtimePenalty;
    const safeObservations = observations && typeof observations === 'object'
      ? Object.fromEntries(Object.entries(observations).map(([key, value]) => [key, String(value ?? '').trim().slice(0, 2000)]))
      : {};
    const record = {
      id: submissionId(req), submissionType: 'head-judge', competitorId: competitor.id,
      competitorName: competitor.name, judgeName: judgeName.trim(), date,
      round: round?.trim() || '', sensoryRecordIds, sensoryTotals,
      technicalRecordId, technicalTotal: technicalRecord.total,
      withinTime: Boolean(withinTime), overtimeSeconds: seconds, overtimePenalty,
      transferredTotal, total, maximum: maximumByRole.sensory * 4 + maximumByRole.technical,
      percentage: Number(((total / (maximumByRole.sensory * 4 + maximumByRole.technical)) * 100).toFixed(1)),
      observations: safeObservations, createdAt: new Date().toISOString(),
    };
    const formspreePayload = {
        _subject: `Mezani head judge score - ${competitor.name} - ${record.judgeName}`,
        submissionType: 'Head judge score', competition: 'The Best of Mezani - Barista Competition',
        competitorNumber: competitor.id, competitor: competitor.name, headJudge: record.judgeName,
        date: record.date, round: record.round || 'Unspecified session',
        sensoryScores: sensoryRecords.map((item, index) => ({ position: `S${index + 1}`, judge: item.judgeName, total: item.total, recordId: item.id })),
        technicalScore: { judge: technicalRecord.judgeName, total: technicalRecord.total, recordId: technicalRecord.id },
        withinTime: record.withinTime, overtimeSeconds: seconds, overtimePenalty,
        transferredTotal, finalScore: total, maximum: record.maximum, percentage: record.percentage,
        headJudgeObservations: safeObservations, submittedAt: record.createdAt,
      };
    const saved = await saveRecord(record, formspreePayload);
    void deliverOutbox(5).catch((error) => console.error('Outbox delivery failed:', error));
    res.status(saved.duplicate ? 200 : 201).json({ ...saved.record, deliveryStatus: 'saved' });
  } catch (error) { next(error); }
});

app.get('/api/results', requireRole('admin'), async (_req, res, next) => {
  try {
    const records = await readScores();
    const sensory = latestByCompetitor(records, 'sensory');
    const technical = latestByCompetitor(records, 'technical');
    const headJudge = latestByCompetitor(records, 'head-judge');
    const results = competitors.map((competitor) => {
      const sensoryRecord = sensory.get(competitor.id);
      const technicalRecord = technical.get(competitor.id);
      const headJudgeRecord = headJudge.get(competitor.id);
      const ready = Boolean(sensoryRecord && technicalRecord);
      const total = ready ? sensoryRecord.total + technicalRecord.total : null;
      return {
        ...competitor, ready, sensoryTotal: sensoryRecord?.total ?? null,
        technicalTotal: technicalRecord?.total ?? null, total,
        percentage: ready ? Number(((total / combinedMaximum) * 100).toFixed(1)) : null,
        sensorySubmittedAt: sensoryRecord?.createdAt ?? null,
        technicalSubmittedAt: technicalRecord?.createdAt ?? null,
        headJudgeScore: headJudgeRecord?.total ?? null,
        headJudgeMaximum: headJudgeRecord?.maximum ?? null,
        headJudgeSubmittedAt: headJudgeRecord?.createdAt ?? null,
      };
    }).sort((a, b) => (b.total ?? -1) - (a.total ?? -1));
    res.json({ maximum: combinedMaximum, results });
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(error.status || 500).json({ message: error.status ? error.message : 'Something went wrong on the server.' });
});

const server = app.listen(port, () => {
  console.log(`Scoresheet API listening on http://localhost:${port}`);
  if (database) void ensureDatabase().then(() => deliverOutbox()).catch((error) => console.error('Database initialization failed:', error));
});
const outboxTimer = setInterval(() => void deliverOutbox().catch((error) => console.error('Outbox retry failed:', error)), 15_000);
outboxTimer.unref();

async function shutdown(signal) {
  console.log(`${signal} received; shutting down safely.`);
  clearInterval(outboxTimer);
  server.close(async () => {
    if (database) await database.end();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
