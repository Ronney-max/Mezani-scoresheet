const base = process.env.BASE_URL || 'http://localhost:4010';

const health = await fetch(`${base}/api/health`).then((response) => response.json());
if (!health.ok) throw new Error('Health check failed');

const competitors = await fetch(`${base}/api/competitors`).then((response) => response.json());
if (competitors.length !== 19) throw new Error(`Expected 19 competitors, received ${competitors.length}`);

const common = {
  date: '2026-08-18',
  round: 'Verification',
};

const sensoryResponse = await fetch(`${base}/api/scores/competitor/${competitors[0].id}/sensory`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...common, judgeName: 'Automated Sensory Judge', scores: { espresso: 40, milk: 27, signature: 34, barista: 24, impression: 10 } }),
});
const sensory = await sensoryResponse.json();
if (!sensoryResponse.ok || sensory.submissionType !== 'sensory') throw new Error(sensory.message || 'Sensory submission failed');

const technicalResponse = await fetch(`${base}/api/scores/competitor/${competitors[0].id}/technical`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ ...common, judgeName: 'Automated Technical Judge', scores: { startUp: 4, espresso: 14, milk: 18, signature: 14, final: 6 } }),
});
const technical = await technicalResponse.json();
if (!technicalResponse.ok || technical.submissionType !== 'technical') throw new Error(technical.message || 'Technical submission failed');

const history = await fetch(`${base}/api/scores`).then((response) => response.json());
if (!history.some((record) => record.id === sensory.id) || !history.some((record) => record.id === technical.id)) throw new Error('Separate saved records were not returned');

for (const record of [sensory, technical]) {
  const deleted = await fetch(`${base}/api/scores/${record.id}`, { method: 'DELETE' });
  if (deleted.status !== 204) throw new Error('Delete scoresheet failed');
}

console.log(JSON.stringify({ health, competitorCount: competitors.length, sensoryRoute: 'passed', technicalRoute: 'passed', dataPreserved: true }));
