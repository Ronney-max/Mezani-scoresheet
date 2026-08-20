import { useEffect, useMemo, useRef, useState } from 'react';

const sensoryGroups = [
  { key: 'espresso', title: 'Part I - Espresso Evaluation', maximum: 49, fields: [
    { key: 'espressoCrema', label: 'Crema', max: 1, multiplier: 1, scale: 'Yes = 1, No = 0' },
    { key: 'espressoTasteAccuracy', label: 'Accuracy of Taste Descriptors', max: 3, multiplier: 4, scale: '0 to 3' },
    { key: 'espressoTactileAccuracy', label: 'Accuracy of Tactile Descriptors', max: 3, multiplier: 2, scale: '0 to 3' },
    { key: 'espressoTasteExperience', label: 'Taste Experience', max: 6, multiplier: 3, scale: '0 to 6' },
    { key: 'espressoTactileExperience', label: 'Tactile Experience', max: 6, multiplier: 2, scale: '0 to 6' },
  ] },
  { key: 'milk', title: 'Part II - Milk Beverage Evaluation', maximum: 33, fields: [
    { key: 'milkVisualAppeal', label: 'Visual Appeal', max: 3, multiplier: 1, scale: '0 to 3' },
    { key: 'milkTasteAccuracy', label: 'Accuracy of Taste Descriptors', max: 3, multiplier: 4, scale: '0 to 3' },
    { key: 'milkTasteExperience', label: 'Taste Experience', max: 6, multiplier: 3, scale: '0 to 6' },
  ] },
  { key: 'signature', title: 'Part III - Signature Beverage Evaluation', maximum: 42, fields: [
    { key: 'signatureTasteAccuracy', label: 'Accuracy of Taste Descriptors', max: 3, multiplier: 4, scale: '0 to 3' },
    { key: 'signatureExplained', label: 'Well Explained, Introduced, and Prepared', max: 6, multiplier: 2, scale: '0 to 6' },
    { key: 'signatureTasteExperience', label: 'Taste Experience', max: 6, multiplier: 3, scale: '0 to 6' },
  ] },
  { key: 'barista', title: 'Part IV - Barista Evaluation', maximum: 30, fields: [
    { key: 'baristaAttention', label: 'Attention to Details/All Accessories Available', max: 3, multiplier: 2, scale: '0 to 3' },
    { key: 'baristaPresentation', label: 'Presentation', max: 6, multiplier: 3, scale: '0 to 6' },
    { key: 'baristaKnowledge', label: 'Coffee Knowledge/Use of Equipment & Space', max: 3, multiplier: 2, scale: '0 to 3' },
  ] },
  { key: 'impression', title: "Part V - Judge's Total Impression", maximum: 12, fields: [
    { key: 'totalImpression', label: 'Total Impression', max: 6, multiplier: 2, scale: '0 to 6' },
  ] },
];
const yesNo = (key, label) => ({ key, label, max: 1, multiplier: 1, scale: 'Yes = 1, No = 0' });
const quality = (key, label) => ({ key, label, max: 6, multiplier: 1, scale: '0 to 6' });
const technicalCoffeeFields = (prefix, beverage) => [
  yesNo(`${prefix}Flush`, 'Flushes the Group Head'),
  yesNo(`${prefix}Basket`, 'Dry/Clean Filter Basket Before Dosing'),
  quality(`${prefix}Waste`, 'Acceptable Spill/Waste When Dosing/Grinding'),
  quality(`${prefix}DoseTamp`, 'Consistent Dosing and Tamping'),
  yesNo(`${prefix}Portafilter`, 'Cleans Portafilters Before Insert'),
  yesNo(`${prefix}ImmediateBrew`, 'Insert and Immediate Brew'),
  yesNo(`${prefix}Extraction`, 'Extraction Time Within 3 Second Variance'),
].map((field) => ({ ...field, beverage }));
const technicalGroups = [
  { key: 'startUp', title: 'Part I - Station Evaluation at Start-Up', maximum: 6, fields: [quality('startUpCleanliness', 'Clean Working Area at Start-Up/Clean Cloths')] },
  { key: 'espresso', title: 'Part II - Espresso Evaluation', maximum: 17, fields: technicalCoffeeFields('espresso', 'Espresso') },
  { key: 'milk', title: 'Part III - Milk Beverage Evaluation', maximum: 22, fields: [
    ...technicalCoffeeFields('milk', 'Milk Beverage'),
    yesNo('milkPitcher', 'Empty/Clean Pitcher at Start'),
    yesNo('milkPurgeBefore', 'Purges the Steam Wand Before Steaming'),
    yesNo('milkCleanWand', 'Cleans Steam Wand After Steaming'),
    yesNo('milkPurgeAfter', 'Purges the Steam Wand After Steaming'),
    yesNo('milkWasteEnd', 'Acceptable Milk Waste at End'),
  ] },
  { key: 'signature', title: 'Part IV - Signature Beverage Evaluation', maximum: 17, fields: technicalCoffeeFields('signature', 'Signature Beverage') },
  { key: 'final', title: 'Part V - Technical Evaluation', maximum: 9, fields: [
    quality('finalStation', 'Station Management/Clean Working Area at End'),
    yesNo('finalSpouts', 'Clean Portafilter Spouts/Avoided Placing Spouts in Doser Chamber'),
    yesNo('finalHygiene', 'General Hygiene Throughout Presentation'),
    yesNo('finalCloths', 'Proper Usage of Cloths'),
  ] },
];
const technicalMeasurements = {
  espresso: ['espressoShot1Time', 'espressoShot1Waste', 'espressoShot2Time', 'espressoShot2Waste'],
  milk: ['milkShot1Time', 'milkShot1Waste', 'milkShot2Time', 'milkShot2Waste', 'milkQuantity'],
  signature: ['signatureShot1Time', 'signatureShot1Waste', 'signatureShot2Time', 'signatureShot2Waste'],
};
const measurementLabels = {
  espressoShot1Time: 'Shot 1 time (seconds)', espressoShot1Waste: 'Shot 1 waste (g)', espressoShot2Time: 'Shot 2 time (seconds)', espressoShot2Waste: 'Shot 2 waste (g)',
  milkShot1Time: 'Shot 1 time (seconds)', milkShot1Waste: 'Shot 1 waste (g)', milkShot2Time: 'Shot 2 time (seconds)', milkShot2Waste: 'Shot 2 waste (g)', milkQuantity: 'Milk used (ml/oz)',
  signatureShot1Time: 'Shot 1 time (seconds)', signatureShot1Waste: 'Shot 1 waste (g)', signatureShot2Time: 'Shot 2 time (seconds)', signatureShot2Waste: 'Shot 2 waste (g)',
};
const sensoryFields = sensoryGroups.flatMap((group) => group.fields);
const technicalFields = technicalGroups.flatMap((group) => group.fields);
const roleConfig = {
  sensory: { title: 'Sensory Judge', maximum: 166, fields: sensoryFields, groups: sensoryGroups },
  technical: { title: 'Technical Judge', maximum: 71, fields: technicalFields, groups: technicalGroups },
  head: { title: 'Head Judge' },
  admin: { title: 'Overall Results' },
};
const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
const apiUrl = (path) => `${apiBaseUrl}${path}`;

function Header({ subtitle }) {
  return <header className="hero">
    <div className="topline"><div className="eyebrow">Africa Food Show Kenya 2026</div><div className="kbo-logo-wrap"><img src="/kbo-logo.jpeg" alt="Kenya Barista Organization" className="kbo-logo" /></div></div>
    <div className="hero-row"><div className="hero-brand"><div className="brand-logo-wrap"><img src="/mezani-logo.png" alt="Mezani" className="brand-logo" /></div><h1>Mezani Barista Competition</h1><p>{subtitle || '4th Edition'}</p></div><div className="event-badge"><strong>20-22</strong><span>August 2026</span></div></div>
  </header>;
}

function tokenFor(role) { return sessionStorage.getItem(`mezani-${role}-token`) || ''; }

async function apiRequest(path, options = {}, role) {
  const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...options.headers };
  if (role && tokenFor(role)) headers.Authorization = `Bearer ${tokenFor(role)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.method === 'POST' ? 20_000 : 15_000);
  let response;
  try {
    response = await fetch(apiUrl(path), { cache: 'no-store', ...options, headers, signal: options.signal || controller.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('The server is taking too long. Your marks are still on this screen; press submit again to safely retry.');
    throw new Error('The server could not be reached. Your marks are still on this screen; check your connection and safely retry.');
  } finally { clearTimeout(timeout); }
  const result = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return result;
}

function createSubmissionKey() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function readDraft(key) {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; }
}

function Login({ role, onLogin }) {
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await apiRequest('/api/auth/login', { method: 'POST', body: JSON.stringify({ role, accessCode }) });
      sessionStorage.setItem(`mezani-${role}-token`, result.token);
      onLogin();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }
  return <div className="app-shell"><Header subtitle={roleConfig[role].title} /><main className="login-main"><form className="login-card" onSubmit={submit}><span className="section-number">Protected area</span><h2>{roleConfig[role].title}</h2><p>Enter the access code supplied by the competition administrator.</p><label>Access code<input type="password" value={accessCode} onChange={(event) => setAccessCode(event.target.value)} autoComplete="current-password" required autoFocus /></label>{error && <div className="notice error">{error}</div>}<button className="button" disabled={busy}>{busy ? 'Checking...' : 'Open scoring area'}</button></form></main></div>;
}

function JudgePage({ role, onLogout }) {
  const config = roleConfig[role];
  const emptyScores = () => Object.fromEntries(config.fields.map((field) => [field.key, '']));
  const emptyObservations = () => ({
    representing: '', introduction: '', espressoComment: '', milkComment: '', signatureComment: '',
    espressoShot1Time: '', espressoShot1Waste: '', espressoShot2Time: '', espressoShot2Waste: '',
    milkShot1Time: '', milkShot1Waste: '', milkShot2Time: '', milkShot2Waste: '', milkQuantity: '',
    signatureShot1Time: '', signatureShot1Waste: '', signatureShot2Time: '', signatureShot2Waste: '',
  });
  const [competitors, setCompetitors] = useState([]);
  const [scores, setScores] = useState({});
  const [observations, setObservations] = useState({});
  const [submissions, setSubmissions] = useState([]);
  const [meta, setMeta] = useState({ judgeName: '', date: new Date().toISOString().slice(0, 10), round: '' });
  const [status, setStatus] = useState({});
  const [busy, setBusy] = useState(null);
  const submissionKeys = useRef({});
  const [draftsReady, setDraftsReady] = useState(false);
  const draftKey = `mezani-${role}-draft`;

  useEffect(() => {
    Promise.all([
      apiRequest(`/api/judging/${role}/competitors`, {}, role),
      apiRequest(`/api/judging/${role}/submissions`, {}, role),
    ]).then(([data, history]) => {
      const draft = readDraft(draftKey);
      setCompetitors(data.competitors);
      setSubmissions(history);
      setScores(Object.fromEntries(data.competitors.map((person) => [person.id, { ...emptyScores(), ...draft?.scores?.[person.id] }])));
      setObservations(Object.fromEntries(data.competitors.map((person) => [person.id, { ...emptyObservations(), ...draft?.observations?.[person.id] }])));
      if (draft?.meta) setMeta((current) => ({ ...current, ...draft.meta }));
      setDraftsReady(true);
    }).catch((error) => error.status === 401 ? onLogout() : setStatus({ type: 'error', message: error.message }));
  }, [role]);

  useEffect(() => {
    if (draftsReady) localStorage.setItem(draftKey, JSON.stringify({ meta, scores, observations, savedAt: new Date().toISOString() }));
  }, [draftsReady, draftKey, meta, scores, observations]);

  function updateScore(id, key, value) {
    setScores((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }
  function updateObservation(id, key, value) {
    setObservations((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));
  }
  function totalFor(id) { return config.fields.reduce((sum, field) => sum + Number(scores[id]?.[field.key] || 0) * field.multiplier, 0); }
  function groupTotal(id, group) { return group.fields.reduce((sum, field) => sum + Number(scores[id]?.[field.key] || 0) * field.multiplier, 0); }
  async function submit(person) {
    const key = person.id;
    if (!meta.judgeName.trim()) return setStatus({ type: 'error', key, message: 'Enter your judge name before submitting.' });
    if (!config.fields.every((field) => scores[key]?.[field.key] !== '')) return setStatus({ type: 'error', key, message: `Complete all ${role} criteria for ${person.name}.` });
    setBusy(key); setStatus({});
    try {
      submissionKeys.current[key] ||= createSubmissionKey();
      const result = await apiRequest(`/api/judging/${role}/competitors/${key}`, { method: 'POST', headers: { 'Idempotency-Key': submissionKeys.current[key] }, body: JSON.stringify({ ...meta, scores: scores[key], observations: observations[key] }) }, role);
      delete submissionKeys.current[key];
      setSubmissions((current) => [result, ...current]);
      setStatus({ type: 'success', key, message: `${person.name}'s ${role} score is safely saved. Your entered marks remain intact.` });
    } catch (error) { error.status === 401 ? onLogout() : setStatus({ type: 'error', key, message: error.message }); }
    finally { setBusy(null); }
  }
  return <div className="app-shell"><Header subtitle={config.title} /><main>
    <div className="role-bar no-print"><div><strong>{config.title} area</strong><span>Only {role} criteria and submissions are available here.</span></div><button className="button ghost" onClick={onLogout}>Sign out</button></div>
    <section className="stat-grid no-print"><div className="stat"><span>Competitors</span><strong>{competitors.length}</strong></div><div className="stat"><span>{config.title} maximum</span><strong>{config.maximum}</strong></div><div className="stat"><span>Your submissions</span><strong>{submissions.length}</strong></div></section>
    <form className="score-card" onSubmit={(event) => event.preventDefault()}><div className="section-heading"><div><span className="section-number">01</span><h2>{config.title} details</h2></div></div><div className="meta-grid judge-meta"><label>Judge name<input value={meta.judgeName} onChange={(event) => setMeta({ ...meta, judgeName: event.target.value })} placeholder="Full name" /></label><label>Date<input type="date" value={meta.date} onChange={(event) => setMeta({ ...meta, date: event.target.value })} /></label><label>Round / session<input value={meta.round} onChange={(event) => setMeta({ ...meta, round: event.target.value })} placeholder="e.g. Preliminary 1" /></label></div>
      <div className="section-heading scores-heading"><div><span className="section-number">02</span><h2>{config.title} scores</h2></div><p>Each competitor submits independently.</p></div>
      <div className="judge-grid template-judge-grid">{competitors.map((person) => { const total = totalFor(person.id); return <details className="competitor-card competitor-dropdown" key={person.id}><summary className="competitor-heading"><span className="number-badge">{String(person.id).padStart(2, '0')}</span><div><h3>{person.name}</h3><span>{total.toFixed(1)} / {config.maximum} · {((total / config.maximum) * 100).toFixed(1)}%</span></div><span className="dropdown-indicator" aria-hidden="true">+</span></summary>
        <div className={`sensory-introduction ${role === 'technical' ? 'single-field' : ''}`}><label>Representing<input value={observations[person.id]?.representing ?? ''} onChange={(event) => updateObservation(person.id, 'representing', event.target.value)} placeholder="Company or organization" /></label>{role === 'sensory' && <label>Introduction & Coffee Information<textarea value={observations[person.id]?.introduction ?? ''} onChange={(event) => updateObservation(person.id, 'introduction', event.target.value)} rows="3" /></label>}</div>
        <div className="sensory-sheet">{config.groups.map((group) => <section className="sensory-part" key={group.key}><div className="sensory-part-heading"><strong>{group.title}</strong><span>{groupTotal(person.id, group).toFixed(1)} / {group.maximum}</span></div>
          {role === 'sensory' && ['espresso', 'milk', 'signature'].includes(group.key) && <div className="sensory-observation-grid optional-comment"><label>Comment <small>Optional</small><textarea rows="2" value={observations[person.id]?.[`${group.key}Comment`] ?? ''} onChange={(event) => updateObservation(person.id, `${group.key}Comment`, event.target.value)} placeholder="Add a comment if needed" /></label></div>}
          {role === 'technical' && technicalMeasurements[group.key] && <div className="technical-measurement-grid">{technicalMeasurements[group.key].map((measurement) => <label key={measurement}>{measurementLabels[measurement]}<input type="text" inputMode="decimal" value={observations[person.id]?.[measurement] ?? ''} onChange={(event) => updateObservation(person.id, measurement, event.target.value)} /></label>)}</div>}
          <div className="criteria-breakdown open-breakdown">{group.fields.map((field) => <label key={field.key}><span>{field.label}<small>{field.scale || field.guidance}{field.multiplier > 1 ? ` · ${field.multiplier} × multiplier` : ''}</small></span><span className="weighted-input"><input aria-label={`${person.name} ${field.label}`} type="number" min="0" max={field.max} step="0.1" value={scores[person.id]?.[field.key] ?? ''} onChange={(event) => updateScore(person.id, field.key, event.target.value)} placeholder={`0-${field.max}`} /><b>{field.multiplier > 1 ? `× ${field.multiplier}` : ''}</b></span></label>)}</div>
        </section>)}</div>
        {role === 'sensory' && <div className="evaluation-scales"><strong>Evaluation Scales</strong><span>Yes = 1 · No = 0</span><span>0 to 6: Unacceptable = 0 · Acceptable = 1 · Average = 2 · Good = 3 · Very Good = 4 · Excellent = 5 · Extraordinary = 6</span><span>0 to 3 Accuracy: None to Evaluate = 0 · Not Very Accurate = 1 · Somewhat Accurate = 2 · Very Accurate = 3</span><span>0 to 3 Impression: None to Evaluate = 0 · Not Very = 1 · Somewhat = 2 · Very = 3</span></div>}
        {role === 'technical' && <div className="evaluation-scales"><strong>Evaluation Scale</strong><span>Yes = 1 · No = 0</span><span>Unacceptable = 0 · Acceptable = 1 · Average = 2 · Good = 3 · Very Good = 4 · Excellent = 5 · Extraordinary = 6</span><span>Coffee waste: 0g = 6 · 1g = 5 · 2g = 4 · 3g = 3 · 4g = 2 · 5g = 1 · More than 5g = 0</span></div>}
        <div className="competitor-submit"><div><span>{role === 'sensory' ? 'Sensory Score' : 'Technical Score'}</span><strong>{total.toFixed(1)} / {config.maximum}</strong></div><button type="button" className="criteria-submit" disabled={busy === person.id} onClick={() => submit(person)}>{busy === person.id ? 'Submitting...' : `Submit ${role} score`}</button>{status.key === person.id && <div className={`notice inline-notice ${status.type}`}>{status.message}</div>}</div>
      </details>; })}</div>
    </form>
    <section className="history no-print"><div className="section-heading"><div><span className="section-number">03</span><h2>Your {role} submissions</h2></div></div>{submissions.length === 0 ? <div className="empty-state"><strong>No submissions yet</strong></div> : <div className="history-list">{submissions.map((record) => <article key={record.id}><div><strong>{record.competitorName}</strong><span>{record.total} / {record.maximum} · {record.percentage}% · {record.date}</span></div></article>)}</div>}</section>
  </main><footer>Official competition scoring system · Excellence in every cup</footer></div>;
}

function HeadJudgePage({ onLogout }) {
  const [competitors, setCompetitors] = useState([]);
  const [sensoryRecords, setSensoryRecords] = useState([]);
  const [technicalRecords, setTechnicalRecords] = useState([]);
  const [forms, setForms] = useState({});
  const [meta, setMeta] = useState({ judgeName: '', date: new Date().toISOString().slice(0, 10), round: '' });
  const [busy, setBusy] = useState(null);
  const [status, setStatus] = useState({});
  const submissionKeys = useRef({});
  const [draftsReady, setDraftsReady] = useState(false);
  const draftKey = 'mezani-head-draft';
  const emptyHeadForm = () => ({ sensoryRecordIds: ['', '', '', ''], technicalRecordId: '', withinTime: true, overtimeSeconds: '', observations: { representing: '', stationStart: '', coffeeInformation: '', espressoShot1Time: '', espressoShot1Waste: '', espressoShot2Time: '', espressoShot2Waste: '', milkShot1Time: '', milkShot1Waste: '', milkShot2Time: '', milkShot2Waste: '', milkQuantity: '', signatureShot1Time: '', signatureShot1Waste: '', signatureShot2Time: '', signatureShot2Waste: '', ingredientsVerified: '', stationManagement: '', totalTime: '' } });

  useEffect(() => {
    Promise.all([
      apiRequest('/api/head-judge/competitors', {}, 'head'),
      apiRequest('/api/judging/sensory/submissions', {}, 'head'),
      apiRequest('/api/judging/technical/submissions', {}, 'head'),
    ]).then(([people, sensory, technical]) => {
      const draft = readDraft(draftKey);
      setCompetitors(people); setSensoryRecords(sensory); setTechnicalRecords(technical);
      setForms(Object.fromEntries(people.map((person) => [person.id, { ...emptyHeadForm(), ...draft?.forms?.[person.id], observations: { ...emptyHeadForm().observations, ...draft?.forms?.[person.id]?.observations } }])));
      if (draft?.meta) setMeta((current) => ({ ...current, ...draft.meta }));
      setDraftsReady(true);
    }).catch((error) => error.status === 401 ? onLogout() : setStatus({ type: 'error', message: error.message }));
  }, []);

  useEffect(() => {
    if (draftsReady) localStorage.setItem(draftKey, JSON.stringify({ meta, forms, savedAt: new Date().toISOString() }));
  }, [draftsReady, meta, forms]);

  function updateForm(id, updater) { setForms((current) => ({ ...current, [id]: updater(current[id] || emptyHeadForm()) })); }
  function setSensorySelection(id, index, value) { updateForm(id, (form) => ({ ...form, sensoryRecordIds: form.sensoryRecordIds.map((item, position) => position === index ? value : item) })); }
  function setObservation(id, key, value) { updateForm(id, (form) => ({ ...form, observations: { ...form.observations, [key]: value } })); }
  function recordsFor(personId, records) { return records.filter((record) => record.competitorId === personId); }
  function selectedSensory(form) { return form.sensoryRecordIds.map((id) => sensoryRecords.find((record) => record.id === id)).filter(Boolean); }
  function headTotal(form) {
    const sensoryTotal = selectedSensory(form).reduce((sum, record) => sum + record.total, 0);
    const technical = technicalRecords.find((record) => record.id === form.technicalRecordId)?.total || 0;
    const penalty = form.withinTime ? 0 : Math.min(60, Math.max(0, Number(form.overtimeSeconds) || 0));
    return { sensoryTotal, technical, penalty, total: sensoryTotal + technical - penalty };
  }
  async function submitHead(person) {
    const form = forms[person.id];
    if (!meta.judgeName.trim()) return setStatus({ type: 'error', key: person.id, message: 'Enter the head judge name.' });
    setBusy(person.id); setStatus({});
    try {
      submissionKeys.current[person.id] ||= createSubmissionKey();
      const result = await apiRequest(`/api/head-judge/competitors/${person.id}`, { method: 'POST', headers: { 'Idempotency-Key': submissionKeys.current[person.id] }, body: JSON.stringify({ ...meta, ...form }) }, 'head');
      delete submissionKeys.current[person.id];
      setStatus({ type: 'success', key: person.id, message: `${person.name}'s official head judge score was submitted: ${result.total} / ${result.maximum}.` });
    } catch (error) { error.status === 401 ? onLogout() : setStatus({ type: 'error', key: person.id, message: error.message }); }
    finally { setBusy(null); }
  }

  return <div className="app-shell"><Header subtitle="Head Judge" /><main>
    <div className="role-bar no-print"><div><strong>Head judge workspace</strong><span>Authorized access to sensory and technical submissions.</span></div><button className="button ghost" onClick={onLogout}>Sign out</button></div>
    <section className="score-card"><div className="section-heading"><div><span className="section-number">HJ</span><h2>Head judge & session</h2></div></div><div className="meta-grid judge-meta"><label>Head judge<input value={meta.judgeName} onChange={(event) => setMeta({ ...meta, judgeName: event.target.value })} /></label><label>Date<input type="date" value={meta.date} onChange={(event) => setMeta({ ...meta, date: event.target.value })} /></label><label>Round<input value={meta.round} onChange={(event) => setMeta({ ...meta, round: event.target.value })} placeholder="Semi-Final or Final" /></label></div>
      <div className="section-heading scores-heading"><div><span className="section-number">01</span><h2>Competitor head judge forms</h2></div></div>
      <div className="judge-grid template-judge-grid">{competitors.map((person) => { const form = forms[person.id] || emptyHeadForm(); const availableSensory = recordsFor(person.id, sensoryRecords); const availableTechnical = recordsFor(person.id, technicalRecords); const selected = selectedSensory(form); const totals = headTotal(form); return <details className="competitor-card competitor-dropdown" key={person.id}><summary className="competitor-heading"><span className="number-badge">{String(person.id).padStart(2, '0')}</span><div><h3>{person.name}</h3><span>{selected.length}/4 sensory · {form.technicalRecordId ? 'Technical selected' : 'Technical pending'} · Total {totals.total}</span></div><span className="dropdown-indicator">+</span></summary>
        <div className="sensory-introduction single-field"><label>Representing<input value={form.observations.representing} onChange={(event) => setObservation(person.id, 'representing', event.target.value)} /></label></div>
        <div className="sensory-sheet"><section className="sensory-part"><div className="sensory-part-heading"><strong>Part I - Station Evaluation at Start-Up</strong></div><div className="head-notes"><label>Station evaluation<textarea rows="3" value={form.observations.stationStart} onChange={(event) => setObservation(person.id, 'stationStart', event.target.value)} /></label></div></section>
          <section className="sensory-part"><div className="sensory-part-heading"><strong>Part II - Coffee Information, Presentation, Customer Service Skills</strong></div><div className="head-notes"><label>Coffee information and presentation<textarea rows="4" value={form.observations.coffeeInformation} onChange={(event) => setObservation(person.id, 'coffeeInformation', event.target.value)} /></label></div></section>
          {sensoryGroups.slice(0, 3).map((group, groupIndex) => <section className="sensory-part" key={group.key}><div className="sensory-part-heading"><strong>Part {['III', 'IV', 'V'][groupIndex]} - {group.title.replace(/^Part [^-]+ - /, '')}</strong></div><div className="technical-measurement-grid">{(technicalMeasurements[group.key] || []).map((measurement) => <label key={measurement}>{measurementLabels[measurement]}<input value={form.observations[measurement]} onChange={(event) => setObservation(person.id, measurement, event.target.value)} /></label>)}{group.key === 'signature' && <label>Ingredients verified (no alcohol used)<select value={form.observations.ingredientsVerified} onChange={(event) => setObservation(person.id, 'ingredientsVerified', event.target.value)}><option value="">Select</option><option>Yes</option><option>No</option></select></label>}</div><div className="head-review-table"><table><thead><tr><th>Criterion</th>{[0,1,2,3].map((index) => <th key={index}>S{index + 1}</th>)}</tr></thead><tbody>{group.fields.map((field) => <tr key={field.key}><td>{field.label}</td>{[0,1,2,3].map((index) => <td key={index}>{selected[index]?.breakdown?.[field.key] ?? '-'}</td>)}</tr>)}</tbody></table></div></section>)}
          <section className="sensory-part"><div className="sensory-part-heading"><strong>Part VI - Technical Evaluation, Station Management</strong></div><div className="head-notes"><label>Station Management/Clean Working Area at End<input type="number" min="0" max="6" step="0.1" value={form.observations.stationManagement} onChange={(event) => setObservation(person.id, 'stationManagement', event.target.value)} placeholder="0-6" /></label></div></section>
        </div>
        <div className="head-transfer"><h4>Transferred scores</h4><div className="head-select-grid">{[0,1,2,3].map((index) => <label key={index}>S{index + 1} sensory<select value={form.sensoryRecordIds[index]} onChange={(event) => setSensorySelection(person.id, index, event.target.value)}><option value="">Select sensory judge</option>{availableSensory.map((record) => <option key={record.id} value={record.id}>{record.judgeName} - {record.total}/166</option>)}</select></label>)}<label>Head/technical score<select value={form.technicalRecordId} onChange={(event) => updateForm(person.id, (current) => ({ ...current, technicalRecordId: event.target.value }))}><option value="">Select technical score</option>{availableTechnical.map((record) => <option key={record.id} value={record.id}>{record.judgeName} - {record.total}/71</option>)}</select></label></div><div className="time-grid"><label>Total time<input value={form.observations.totalTime} onChange={(event) => setObservation(person.id, 'totalTime', event.target.value)} placeholder="mm:ss" /></label><label>Within 15 minutes?<select value={form.withinTime ? 'yes' : 'no'} onChange={(event) => updateForm(person.id, (current) => ({ ...current, withinTime: event.target.value === 'yes' }))}><option value="yes">Yes</option><option value="no">No</option></select></label>{!form.withinTime && <label>Seconds overtime<input type="number" min="0" value={form.overtimeSeconds} onChange={(event) => updateForm(person.id, (current) => ({ ...current, overtimeSeconds: event.target.value }))} /></label>}</div><div className="head-equation"><span>HJ {totals.technical}</span><span>+ S1-S4 {totals.sensoryTotal}</span><span>- Overtime {totals.penalty}</span><strong>Total {totals.total} / 735</strong></div><button type="button" className="criteria-submit" disabled={busy === person.id} onClick={() => submitHead(person)}>{busy === person.id ? 'Submitting...' : 'Submit head judge score'}</button>{status.key === person.id && <div className={`notice inline-notice ${status.type}`}>{status.message}</div>}</div>
      </details>; })}</div>
    </section>
  </main><footer>Official competition scoring system · Excellence in every cup</footer></div>;
}

function ResultsPage({ onLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/api/results', {}, 'admin').then(setData).catch((requestError) => requestError.status === 401 ? onLogout() : setError(requestError.message)); }, []);
  const ready = useMemo(() => data?.results.filter((result) => result.ready).length || 0, [data]);
  return <div className="app-shell"><Header subtitle="Overall Results" /><main><div className="role-bar no-print"><div><strong>Administrator results area</strong><span>Sensory, technical, and head judge records meet only in this final table.</span></div><button className="button ghost" onClick={onLogout}>Sign out</button></div>{error && <div className="notice error">{error}</div>}{data && <><section className="stat-grid no-print"><div className="stat"><span>Complete results</span><strong>{ready}/19</strong></div><div className="stat"><span>Combined maximum</span><strong>{data.maximum}</strong></div></section><section className="score-card"><div className="section-heading"><div><span className="section-number">Final</span><h2>Overall competition scores</h2></div></div><div className="table-wrap"><table><thead><tr><th>Rank</th><th>Competitor</th><th>Sensory / 166</th><th>Technical / 71</th><th>Total / 237</th><th>Percentage</th><th>Head Judge Final / 735</th><th>Status</th></tr></thead><tbody>{data.results.map((result, index) => <tr key={result.id}><td data-label="Rank">{result.ready ? index + 1 : '-'}</td><td data-label="Competitor"><strong>{result.name}</strong></td><td data-label="Sensory / 166">{result.sensoryTotal ?? '-'}</td><td data-label="Technical / 71">{result.technicalTotal ?? '-'}</td><td data-label="Total / 237" className="calculated">{result.total ?? '-'}</td><td data-label="Percentage">{result.percentage == null ? '-' : `${result.percentage}%`}</td><td data-label="Head Judge Final / 735">{result.headJudgeScore == null ? 'Pending' : `${result.headJudgeScore} / ${result.headJudgeMaximum}`}</td><td data-label="Status"><span className={`status-pill ${result.ready ? 'ready' : 'waiting'}`}>{result.ready ? 'Complete' : 'Waiting'}</span></td></tr>)}</tbody></table></div></section></>}</main></div>;
}

function Landing() {
  return <div className="app-shell"><Header /><main className="portal-main"><section className="portal-card"><span className="section-number">Secure judging portal</span><h2>Select your assigned area</h2><p>Each area requires its own access code. Judges cannot see the other discipline.</p><div className="portal-grid"><a href="/sensory"><strong>Sensory judge</strong><span>Enter sensory scores only</span></a><a href="/technical"><strong>Technical judge</strong><span>Enter technical scores only</span></a><a href="/head-judge"><strong>Head judge</strong><span>Review sensory and technical scores</span></a><a href="/results"><strong>Overall results</strong><span>Administrator access only</span></a></div></section></main></div>;
}

export default function App() {
  const route = window.location.pathname.replace(/^\/+|\/+$/g, '') || 'home';
  const role = route === 'results' ? 'admin' : route === 'head-judge' ? 'head' : route;
  const [authenticated, setAuthenticated] = useState(Boolean(roleConfig[role] && tokenFor(role)));
  function logout() { sessionStorage.removeItem(`mezani-${role}-token`); setAuthenticated(false); }
  if (!roleConfig[role]) return <Landing />;
  if (!authenticated) return <Login role={role} onLogin={() => setAuthenticated(true)} />;
  if (role === 'admin') return <ResultsPage onLogout={logout} />;
  if (role === 'head') return <HeadJudgePage onLogout={logout} />;
  return <JudgePage role={role} onLogout={logout} />;
}
