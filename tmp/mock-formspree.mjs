import http from 'node:http';

http.createServer((request, response) => {
  if (request.method !== 'POST') {
    response.writeHead(404).end();
    return;
  }
  let body = '';
  request.on('data', (chunk) => { body += chunk; });
  request.on('end', () => {
    const payload = JSON.parse(body);
    const validFullSheet = Array.isArray(payload.scores) && payload.scores.length === 19;
    const validCombined = payload.submissionType === 'Individual competitor score' && payload.competitor && Number.isFinite(payload.totalScore);
    const validSensory = payload.submissionType === 'Sensory score' && payload.sensoryMaximum === 166 && Number.isFinite(payload.sensoryScore);
    const validTechnical = payload.submissionType === 'Technical score' && payload.technicalMaximum === 71 && Number.isFinite(payload.technicalScore);
    if (!validFullSheet && !validCombined && !validSensory && !validTechnical) {
      response.writeHead(400, { 'Content-Type': 'application/json' }).end(JSON.stringify({ error: 'Invalid payload' }));
      return;
    }
    response.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
  });
}).listen(4021, '127.0.0.1', () => console.log('Mock Formspree listening on 4021'));
