const base = process.env.BASE_URL || 'http://localhost:4010';

const health = await fetch(`${base}/api/health`).then((response) => response.json());
if (!health.ok) throw new Error('Health check failed');

const competitors = await fetch(`${base}/api/competitors`).then((response) => response.json());
if (competitors.length !== 19) throw new Error(`Expected 19 competitors, received ${competitors.length}`);

const payload = {
  judgeName: 'Automated Test Judge',
  date: '2026-08-18',
  round: 'Verification',
  sensoryMax: 60,
  technicalMax: 71,
  comments: 'Created by the API verification script.',
  entry: {
    competitorId: competitors[0].id,
    sensory: {
      espresso: 40,
      milk: 27,
      signature: 34,
      barista: 24,
      impression: 10,
    },
    technical: {
      startUp: 4,
      espresso: 14,
      milk: 18,
      signature: 14,
      final: 6,
    },
  },
};

const createdResponse = await fetch(`${base}/api/scores/competitor`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const created = await createdResponse.json();
if (!createdResponse.ok || !created.id) throw new Error(created.message || 'Create scoresheet failed');

const history = await fetch(`${base}/api/scores`).then((response) => response.json());
if (!history.some((record) => record.id === created.id)) throw new Error('Saved record was not returned');

const deleted = await fetch(`${base}/api/scores/${created.id}`, { method: 'DELETE' });
if (deleted.status !== 204) throw new Error('Delete scoresheet failed');

console.log(JSON.stringify({ health, competitorCount: competitors.length, createReadDelete: 'passed' }));
