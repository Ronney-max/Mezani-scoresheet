import { useEffect, useMemo, useState } from 'react';

const emptyMeta = {
  sensoryJudgeName: '', technicalJudgeName: '', date: new Date().toISOString().slice(0, 10), round: '',
  sensoryMax: 166, technicalMax: 71, comments: '',
};

const sensorySections = [
  { key: 'espresso', label: 'I. Espresso evaluation', max: 49, guidance: 'Crema; accuracy of taste and tactile descriptors; taste experience; tactile experience.' },
  { key: 'milk', label: 'II. Milk beverage evaluation', max: 33, guidance: 'Visual appeal; accuracy of taste descriptors; taste experience.' },
  { key: 'signature', label: 'III. Signature beverage evaluation', max: 42, guidance: 'Accuracy of taste descriptors; explanation, introduction and preparation; taste experience.' },
  { key: 'barista', label: 'IV. Barista evaluation', max: 30, guidance: 'Attention to detail and accessories; presentation; coffee knowledge and use of equipment and space.' },
  { key: 'impression', label: 'V. Total impression', max: 12, guidance: 'Judge\'s overall impression of the competitor and presentation.' },
];

const technicalSections = [
  { key: 'startUp', label: 'I. Station at start-up', max: 6, guidance: 'Clean working area at start-up; clean cloths.' },
  { key: 'espresso', label: 'II. Espresso evaluation', max: 17, guidance: 'Flush group head; clean and dry baskets; acceptable dosing waste; consistent dosing and tamping; clean portafilters; immediate brew; extraction-time consistency.' },
  { key: 'milk', label: 'III. Milk beverage', max: 22, guidance: 'Espresso technical skills plus empty/clean pitcher, steam-wand purge before and after steaming, clean steam wand, and acceptable milk waste.' },
  { key: 'signature', label: 'IV. Signature beverage', max: 17, guidance: 'Clean and dry baskets; acceptable dosing waste; consistent dosing and tamping; clean portafilters; immediate brew; extraction-time consistency.' },
  { key: 'final', label: 'V. Final technical evaluation', max: 9, guidance: 'Station management; clean working area at end; clean portafilter spouts; general hygiene; proper use of cloths.' },
];

const emptyTechnical = () => Object.fromEntries(technicalSections.map((section) => [section.key, '']));
const emptySensory = () => Object.fromEntries(sensorySections.map((section) => [section.key, '']));

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : '-';
}

async function requestJson(url) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  return response.json();
}

export default function App() {
  const [competitors, setCompetitors] = useState([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [scores, setScores] = useState({});
  const [saved, setSaved] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [submittingKey, setSubmittingKey] = useState(null);
  const [submittedSections, setSubmittedSections] = useState(new Set());

  useEffect(() => {
    Promise.all([
      requestJson('/api/competitors'),
      requestJson('/api/scores'),
    ]).then(([people, history]) => {
      if (!Array.isArray(people)) throw new Error('Competitor data is invalid.');
      setCompetitors(people);
      setSaved(Array.isArray(history) ? history : []);
      setScores(Object.fromEntries(people.map((person) => [person.id, { sensory: emptySensory(), technical: emptyTechnical() }])));
    }).catch((error) => setStatus({ type: 'error', message: error.message || 'Unable to connect to the scoring server.' }));
  }, []);

  const combinedMax = Number(meta.sensoryMax || 0) + Number(meta.technicalMax || 0);
  const ranked = useMemo(() => competitors.map((person) => {
    const row = scores[person.id] || {};
    const sensory = sensorySections.reduce((sum, section) => sum + Number(row.sensory?.[section.key] || 0), 0);
    const technical = technicalSections.reduce((sum, section) => sum + Number(row.technical?.[section.key] || 0), 0);
    const total = sensory + technical;
    return { ...person, sensory, technical, total, percentage: combinedMax ? total / combinedMax * 100 : 0 };
  }).sort((a, b) => b.total - a.total), [competitors, scores, combinedMax]);

  const completed = competitors.filter((person) => sensorySections.every((section) => scores[person.id]?.sensory?.[section.key] !== '') && technicalSections.every((section) => scores[person.id]?.technical?.[section.key] !== '')).length;

  function updateMeta(event) {
    const { name, value } = event.target;
    setMeta((current) => ({ ...current, [name]: value }));
  }

  function updateTechnicalScore(id, section, value) {
    setScores((current) => ({
      ...current,
      [id]: { ...current[id], technical: { ...current[id].technical, [section]: value } },
    }));
  }

  function updateSensoryScore(id, section, value) {
    setScores((current) => ({
      ...current,
      [id]: { ...current[id], sensory: { ...current[id].sensory, [section]: value } },
    }));
  }

  function resetForm() {
    setScores(Object.fromEntries(competitors.map((person) => [person.id, { sensory: emptySensory(), technical: emptyTechnical() }])));
    setMeta((current) => ({ ...emptyMeta, sensoryJudgeName: current.sensoryJudgeName, technicalJudgeName: current.technicalJudgeName }));
    setSubmittedSections(new Set());
    setStatus({ type: '', message: '' });
  }

  async function submitSection(person, sectionType) {
    const isSensory = sectionType === 'sensory';
    const judgeName = isSensory ? meta.sensoryJudgeName : meta.technicalJudgeName;
    const sections = isSensory ? sensorySections : technicalSections;
    const sectionScores = scores[person.id]?.[sectionType];
    const label = isSensory ? 'Sensory' : 'Technical';
    const submissionKey = `${sectionType}-${person.id}`;
    if (!judgeName.trim()) {
      setStatus({ type: 'error', message: `Enter the ${label.toLowerCase()} judge name before submitting.` });
      return;
    }
    const complete = sections.every((section) => sectionScores?.[section.key] !== '');
    if (!complete) {
      setStatus({ type: 'error', message: `Complete all ${label.toLowerCase()} criteria for ${person.name} before submitting.` });
      return;
    }
    setSubmittingKey(submissionKey);
    setStatus({ type: '', message: '' });
    try {
      const response = await fetch(`/api/scores/competitor/${person.id}/${sectionType}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ judgeName, date: meta.date, round: meta.round, scores: sectionScores }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setSaved((current) => [result, ...current]);
      setSubmittedSections((current) => new Set([...current, submissionKey]));
      setStatus({ type: 'success', message: `${person.name}'s ${label.toLowerCase()} score was submitted by ${judgeName}. All entered data remains intact.` });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || `Unable to submit ${person.name}'s ${label.toLowerCase()} score.` });
    } finally { setSubmittingKey(null); }
  }

  async function removeRecord(id) {
    const response = await fetch(`/api/scores/${id}`, { method: 'DELETE' });
    if (response.ok) setSaved((current) => current.filter((record) => record.id !== id));
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="topline">
          <div className="eyebrow">Africa Food Show Kenya 2026</div>
          <div className="portal-chip">Official judging portal</div>
        </div>
        <div className="hero-row">
          <div>
            <h1>Mezani Scoresheet</h1>
            <p>The Best of Mezani - Barista Competition</p>
          </div>
          <div className="event-badge"><strong>19-21</strong><span>August 2026</span></div>
        </div>
      </header>

      <main>
        <section className="stat-grid no-print">
          <div className="stat"><span>Competitors</span><strong>{competitors.length}</strong></div>
          <div className="stat"><span>Scored</span><strong>{completed}/{competitors.length}</strong></div>
          <div className="stat"><span>Combined maximum</span><strong>{combinedMax}</strong></div>
          <div className="stat"><span>Submissions</span><strong>{saved.length}</strong></div>
        </section>

        <section className="progress-panel no-print" aria-label="Scoring progress">
          <div>
            <span>Scoring progress</span>
            <strong>{competitors.length ? Math.round((completed / competitors.length) * 100) : 0}% complete</strong>
          </div>
          <div className="progress-track"><span style={{ width: `${competitors.length ? (completed / competitors.length) * 100 : 0}%` }} /></div>
          <p>{completed === competitors.length && competitors.length ? 'All competitors are ready for submission.' : `${competitors.length - completed} competitors remaining`}</p>
        </section>

        <form onSubmit={(event) => event.preventDefault()} className="score-card">
          <div className="section-heading">
            <div><span className="section-number">01</span><h2>Judge & session</h2></div>
            <p>Set the score limits before judging.</p>
          </div>
          <div className="meta-grid">
            <label>Sensory judge<input name="sensoryJudgeName" value={meta.sensoryJudgeName} onChange={updateMeta} placeholder="Sensory judge's full name" /></label>
            <label>Technical judge<input name="technicalJudgeName" value={meta.technicalJudgeName} onChange={updateMeta} placeholder="Technical judge's full name" /></label>
            <label>Date<input type="date" name="date" value={meta.date} onChange={updateMeta} required /></label>
            <label>Round / session<input name="round" value={meta.round} onChange={updateMeta} placeholder="e.g. Preliminary 1" /></label>
            <label>Sensory maximum<input value="166 points" readOnly aria-label="Sensory maximum" /></label>
            <label>Technical maximum<input value="71 points" readOnly aria-label="Technical maximum" /></label>
          </div>

          <div className="section-heading scores-heading">
            <div><span className="section-number">02</span><h2>Competitor scores</h2></div>
            <p>Total and percentage calculate automatically.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Competitor</th><th>Sensory / {meta.sensoryMax || 0}</th><th>Technical / 71</th><th>Total / {combinedMax}</th><th>Percentage</th></tr></thead>
              <tbody>{competitors.map((person) => {
                const row = ranked.find((item) => item.id === person.id) || {};
                return <tr key={person.id}>
                  <td data-label="Number"><span className="number-badge">{String(person.id).padStart(2, '0')}</span></td>
                  <td data-label="Competitor"><strong>{person.name}</strong></td>
                  <td data-label="Sensory / 166" className="criteria-cell sensory-cell">
                    <details>
                      <summary><span>{row.sensory?.toFixed(1) ?? '0.0'} / 166</span><small>Score 5 sections</small></summary>
                      <div className="criteria-breakdown">
                        {sensorySections.map((section) => <label key={section.key} title={section.guidance}>
                          <span>{section.label}<small>{section.guidance}</small></span>
                          <input aria-label={`${person.name} ${section.label}`} type="number" min="0" max={section.max} step="0.1" value={scores[person.id]?.sensory?.[section.key] ?? ''} onChange={(e) => updateSensoryScore(person.id, section.key, e.target.value)} placeholder={`0-${section.max}`} required />
                        </label>)}
                        <button type="button" className={`criteria-submit ${submittedSections.has(`sensory-${person.id}`) ? 'submitted' : ''}`} disabled={submittingKey === `sensory-${person.id}`} onClick={() => submitSection(person, 'sensory')}>{submittingKey === `sensory-${person.id}` ? 'Submitting...' : submittedSections.has(`sensory-${person.id}`) ? 'Submit sensory again' : 'Submit sensory'}</button>
                      </div>
                    </details>
                  </td>
                  <td data-label="Technical / 71" className="criteria-cell technical-cell">
                    <details>
                      <summary><span>{row.technical?.toFixed(1) ?? '0.0'} / 71</span><small>Score 5 sections</small></summary>
                      <div className="criteria-breakdown technical-breakdown">
                        {technicalSections.map((section) => <label key={section.key} title={section.guidance}>
                          <span>{section.label}<small>{section.guidance}</small></span>
                          <input aria-label={`${person.name} ${section.label}`} type="number" min="0" max={section.max} step="0.1" value={scores[person.id]?.technical?.[section.key] ?? ''} onChange={(e) => updateTechnicalScore(person.id, section.key, e.target.value)} placeholder={`0-${section.max}`} required />
                        </label>)}
                        <button type="button" className={`criteria-submit ${submittedSections.has(`technical-${person.id}`) ? 'submitted' : ''}`} disabled={submittingKey === `technical-${person.id}`} onClick={() => submitSection(person, 'technical')}>{submittingKey === `technical-${person.id}` ? 'Submitting...' : submittedSections.has(`technical-${person.id}`) ? 'Submit technical again' : 'Submit technical'}</button>
                      </div>
                    </details>
                  </td>
                  <td data-label={`Total / ${combinedMax}`} className="calculated">{row.total?.toFixed(1) ?? '0.0'}</td>
                  <td data-label="Percentage"><span className="percent-pill">{formatPercent(row.percentage || 0)}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>

          <div className="table-footer no-print">
            {status.message && <div className={`notice ${status.type}`} role="status">{status.message}</div>}
          </div>
          <div className="actions no-print">
            <button type="button" className="button ghost no-print" onClick={resetForm}>Clear sheet</button>
            <button type="button" className="button secondary no-print" onClick={() => window.print()}>Print / PDF</button>
          </div>
          <div className="signature print-only">Judge's signature: __________________________________</div>
        </form>

        <section className="history no-print">
          <div className="section-heading"><div><span className="section-number">04</span><h2>Saved score sheets</h2></div></div>
          {saved.length === 0 ? <div className="empty-state"><strong>No saved sheets yet</strong><span>Completed judging sessions will appear here.</span></div> :
            <div className="history-list">{saved.map((record) => <article key={record.id}>
              <div><strong>{record.competitorName || record.judgeName}</strong><span>{record.submissionType ? `${record.submissionType.charAt(0).toUpperCase() + record.submissionType.slice(1)} · ` : ''}{record.competitorName ? `Judge: ${record.judgeName} · ` : ''}{record.date} · {record.round || 'Unspecified session'}</span></div>
              <button onClick={() => removeRecord(record.id)} aria-label={`Delete scoresheet by ${record.judgeName}`}>Delete</button>
            </article>)}</div>}
        </section>
      </main>
      <footer>Official competition scoring system · Excellence in every cup</footer>
    </div>
  );
}
