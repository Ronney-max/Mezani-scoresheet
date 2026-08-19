import { useEffect, useMemo, useState } from 'react';

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
const technicalSections = [
  { key: 'startUp', label: 'I. Station at start-up', max: 6, multiplier: 1, guidance: 'Clean working area at start-up; clean cloths.' },
  { key: 'espresso', label: 'II. Espresso evaluation', max: 17, multiplier: 1, guidance: 'Flush group head; clean and dry baskets; acceptable dosing waste; consistent dosing and tamping; clean portafilters; immediate brew; extraction-time consistency.' },
  { key: 'milk', label: 'III. Milk beverage', max: 22, multiplier: 1, guidance: 'Espresso technical skills plus empty/clean pitcher, steam-wand purge before and after steaming, clean steam wand, and acceptable milk waste.' },
  { key: 'signature', label: 'IV. Signature beverage', max: 17, multiplier: 1, guidance: 'Clean and dry baskets; acceptable dosing waste; consistent dosing and tamping; clean portafilters; immediate brew; extraction-time consistency.' },
  { key: 'final', label: 'V. Final technical evaluation', max: 9, multiplier: 1, guidance: 'Station management; clean working area at end; clean portafilter spouts; general hygiene; proper use of cloths.' },
];
const sensoryFields = sensoryGroups.flatMap((group) => group.fields);
const technicalGroups = technicalSections.map((field) => ({ key: field.key, title: field.label, maximum: field.max, fields: [field] }));
const roleConfig = {
  sensory: { title: 'Sensory Judge', maximum: 166, fields: sensoryFields, groups: sensoryGroups },
  technical: { title: 'Technical Judge', maximum: 71, fields: technicalSections, groups: technicalGroups },
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
  const response = await fetch(apiUrl(path), { cache: 'no-store', ...options, headers });
  const result = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result?.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return result;
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
  const emptyObservations = () => ({ representing: '', introduction: '', espressoDescriptors: '', espressoExperience: '', milkDescriptors: '', milkExperience: '', signatureDescriptors: '', signatureExperience: '' });
  const [competitors, setCompetitors] = useState([]);
  const [scores, setScores] = useState({});
  const [observations, setObservations] = useState({});
  const [submissions, setSubmissions] = useState([]);
  const [meta, setMeta] = useState({ judgeName: '', date: new Date().toISOString().slice(0, 10), round: '' });
  const [status, setStatus] = useState({});
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    Promise.all([
      apiRequest(`/api/judging/${role}/competitors`, {}, role),
      apiRequest(`/api/judging/${role}/submissions`, {}, role),
    ]).then(([data, history]) => {
      setCompetitors(data.competitors);
      setSubmissions(history);
      setScores(Object.fromEntries(data.competitors.map((person) => [person.id, emptyScores()])));
      setObservations(Object.fromEntries(data.competitors.map((person) => [person.id, emptyObservations()])));
    }).catch((error) => error.status === 401 ? onLogout() : setStatus({ type: 'error', message: error.message }));
  }, [role]);

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
      const result = await apiRequest(`/api/judging/${role}/competitors/${key}`, { method: 'POST', body: JSON.stringify({ ...meta, scores: scores[key], observations: observations[key] }) }, role);
      setSubmissions((current) => [result, ...current]);
      setStatus({ type: 'success', key, message: `${person.name}'s ${role} score was submitted. Your entered marks remain intact.` });
    } catch (error) { error.status === 401 ? onLogout() : setStatus({ type: 'error', key, message: error.message }); }
    finally { setBusy(null); }
  }
  return <div className="app-shell"><Header subtitle={config.title} /><main>
    <div className="role-bar no-print"><div><strong>{config.title} area</strong><span>Only {role} criteria and submissions are available here.</span></div><button className="button ghost" onClick={onLogout}>Sign out</button></div>
    <section className="stat-grid no-print"><div className="stat"><span>Competitors</span><strong>{competitors.length}</strong></div><div className="stat"><span>{config.title} maximum</span><strong>{config.maximum}</strong></div><div className="stat"><span>Your submissions</span><strong>{submissions.length}</strong></div></section>
    <form className="score-card" onSubmit={(event) => event.preventDefault()}><div className="section-heading"><div><span className="section-number">01</span><h2>{config.title} details</h2></div></div><div className="meta-grid judge-meta"><label>Judge name<input value={meta.judgeName} onChange={(event) => setMeta({ ...meta, judgeName: event.target.value })} placeholder="Full name" /></label><label>Date<input type="date" value={meta.date} onChange={(event) => setMeta({ ...meta, date: event.target.value })} /></label><label>Round / session<input value={meta.round} onChange={(event) => setMeta({ ...meta, round: event.target.value })} placeholder="e.g. Preliminary 1" /></label></div>
      <div className="section-heading scores-heading"><div><span className="section-number">02</span><h2>{config.title} scores</h2></div><p>Each competitor submits independently.</p></div>
      <div className={`judge-grid ${role === 'sensory' ? 'sensory-judge-grid' : ''}`}>{competitors.map((person) => { const total = totalFor(person.id); return <article className="competitor-card" key={person.id}><div className="competitor-heading"><span className="number-badge">{String(person.id).padStart(2, '0')}</span><div><h3>{person.name}</h3><span>{total.toFixed(1)} / {config.maximum} · {((total / config.maximum) * 100).toFixed(1)}%</span></div></div>
        {role === 'sensory' && <div className="sensory-introduction"><label>Representing<input value={observations[person.id]?.representing ?? ''} onChange={(event) => updateObservation(person.id, 'representing', event.target.value)} placeholder="Company or organization" /></label><label>Introduction & Coffee Information<textarea value={observations[person.id]?.introduction ?? ''} onChange={(event) => updateObservation(person.id, 'introduction', event.target.value)} rows="3" /></label></div>}
        <div className="sensory-sheet">{config.groups.map((group) => <section className="sensory-part" key={group.key}><div className="sensory-part-heading"><strong>{group.title}</strong><span>{groupTotal(person.id, group).toFixed(1)} / {group.maximum}</span></div>
          {role === 'sensory' && ['espresso', 'milk', 'signature'].includes(group.key) && <div className="sensory-observation-grid"><label>Descriptors<textarea rows="2" value={observations[person.id]?.[`${group.key}Descriptors`] ?? ''} onChange={(event) => updateObservation(person.id, `${group.key}Descriptors`, event.target.value)} /></label><label>Experience<textarea rows="2" value={observations[person.id]?.[`${group.key}Experience`] ?? ''} onChange={(event) => updateObservation(person.id, `${group.key}Experience`, event.target.value)} /></label></div>}
          <div className="criteria-breakdown open-breakdown">{group.fields.map((field) => <label key={field.key}><span>{field.label}<small>{field.scale || field.guidance}{field.multiplier > 1 ? ` · ${field.multiplier} × multiplier` : ''}</small></span><span className="weighted-input"><input aria-label={`${person.name} ${field.label}`} type="number" min="0" max={field.max} step="0.1" value={scores[person.id]?.[field.key] ?? ''} onChange={(event) => updateScore(person.id, field.key, event.target.value)} placeholder={`0-${field.max}`} /><b>{field.multiplier > 1 ? `× ${field.multiplier}` : ''}</b></span></label>)}</div>
        </section>)}</div>
        {role === 'sensory' && <div className="evaluation-scales"><strong>Evaluation Scales</strong><span>Yes = 1 · No = 0</span><span>0 to 6: Unacceptable = 0 · Acceptable = 1 · Average = 2 · Good = 3 · Very Good = 4 · Excellent = 5 · Extraordinary = 6</span><span>0 to 3 Accuracy: None to Evaluate = 0 · Not Very Accurate = 1 · Somewhat Accurate = 2 · Very Accurate = 3</span><span>0 to 3 Impression: None to Evaluate = 0 · Not Very = 1 · Somewhat = 2 · Very = 3</span></div>}
        <div className="competitor-submit"><div><span>{role === 'sensory' ? 'Sensory Score' : 'Technical Score'}</span><strong>{total.toFixed(1)} / {config.maximum}</strong></div><button type="button" className="criteria-submit" disabled={busy === person.id} onClick={() => submit(person)}>{busy === person.id ? 'Submitting...' : `Submit ${role} score`}</button>{status.key === person.id && <div className={`notice inline-notice ${status.type}`}>{status.message}</div>}</div>
      </article>; })}</div>
    </form>
    <section className="history no-print"><div className="section-heading"><div><span className="section-number">03</span><h2>Your {role} submissions</h2></div></div>{submissions.length === 0 ? <div className="empty-state"><strong>No submissions yet</strong></div> : <div className="history-list">{submissions.map((record) => <article key={record.id}><div><strong>{record.competitorName}</strong><span>{record.total} / {record.maximum} · {record.percentage}% · {record.date}</span></div></article>)}</div>}</section>
  </main><footer>Official competition scoring system · Excellence in every cup</footer></div>;
}

function ResultsPage({ onLogout }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest('/api/results', {}, 'admin').then(setData).catch((requestError) => requestError.status === 401 ? onLogout() : setError(requestError.message)); }, []);
  const ready = useMemo(() => data?.results.filter((result) => result.ready).length || 0, [data]);
  return <div className="app-shell"><Header subtitle="Overall Results" /><main><div className="role-bar no-print"><div><strong>Administrator results area</strong><span>Sensory and technical marks meet only in this final table.</span></div><button className="button ghost" onClick={onLogout}>Sign out</button></div>{error && <div className="notice error">{error}</div>}{data && <><section className="stat-grid no-print"><div className="stat"><span>Complete results</span><strong>{ready}/19</strong></div><div className="stat"><span>Combined maximum</span><strong>{data.maximum}</strong></div></section><section className="score-card"><div className="section-heading"><div><span className="section-number">Final</span><h2>Overall competition scores</h2></div></div><div className="table-wrap"><table><thead><tr><th>Rank</th><th>Competitor</th><th>Sensory / 166</th><th>Technical / 71</th><th>Total / 237</th><th>Percentage</th><th>Status</th></tr></thead><tbody>{data.results.map((result, index) => <tr key={result.id}><td>{result.ready ? index + 1 : '-'}</td><td><strong>{result.name}</strong></td><td>{result.sensoryTotal ?? '-'}</td><td>{result.technicalTotal ?? '-'}</td><td className="calculated">{result.total ?? '-'}</td><td>{result.percentage == null ? '-' : `${result.percentage}%`}</td><td><span className={`status-pill ${result.ready ? 'ready' : 'waiting'}`}>{result.ready ? 'Complete' : 'Waiting'}</span></td></tr>)}</tbody></table></div></section></>}</main></div>;
}

function Landing() {
  return <div className="app-shell"><Header /><main className="portal-main"><section className="portal-card"><span className="section-number">Secure judging portal</span><h2>Select your assigned area</h2><p>Each area requires its own access code. Judges cannot see the other discipline.</p><div className="portal-grid"><a href="/sensory"><strong>Sensory judge</strong><span>Enter sensory scores only</span></a><a href="/technical"><strong>Technical judge</strong><span>Enter technical scores only</span></a><a href="/results"><strong>Overall results</strong><span>Administrator access only</span></a></div></section></main></div>;
}

export default function App() {
  const route = window.location.pathname.replace(/^\/+|\/+$/g, '') || 'home';
  const role = route === 'results' ? 'admin' : route;
  const [authenticated, setAuthenticated] = useState(Boolean(roleConfig[role] && tokenFor(role)));
  function logout() { sessionStorage.removeItem(`mezani-${role}-token`); setAuthenticated(false); }
  if (!roleConfig[role]) return <Landing />;
  if (!authenticated) return <Login role={role} onLogin={() => setAuthenticated(true)} />;
  return role === 'admin' ? <ResultsPage onLogout={logout} /> : <JudgePage role={role} onLogout={logout} />;
}
