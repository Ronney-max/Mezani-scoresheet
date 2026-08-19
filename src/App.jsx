import { useEffect, useMemo, useState } from 'react';

const emptyMeta = {
  judgeName: '', date: new Date().toISOString().slice(0, 10), round: '',
  sensoryMax: 60, technicalMax: 71, comments: '',
};

const technicalSections = [
  { key: 'startUp', label: 'I. Station at start-up', max: 6, guidance: 'Clean working area at start-up; clean cloths.' },
  { key: 'espresso', label: 'II. Espresso evaluation', max: 17, guidance: 'Flush group head; clean and dry baskets; acceptable dosing waste; consistent dosing and tamping; clean portafilters; immediate brew; extraction-time consistency.' },
  { key: 'milk', label: 'III. Milk beverage', max: 22, guidance: 'Espresso technical skills plus empty/clean pitcher, steam-wand purge before and after steaming, clean steam wand, and acceptable milk waste.' },
  { key: 'signature', label: 'IV. Signature beverage', max: 17, guidance: 'Clean and dry baskets; acceptable dosing waste; consistent dosing and tamping; clean portafilters; immediate brew; extraction-time consistency.' },
  { key: 'final', label: 'V. Final technical evaluation', max: 9, guidance: 'Station management; clean working area at end; clean portafilter spouts; general hygiene; proper use of cloths.' },
];

const emptyTechnical = () => Object.fromEntries(technicalSections.map((section) => [section.key, '']));

function formatPercent(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)}%` : '-';
}

export default function App() {
  const [competitors, setCompetitors] = useState([]);
  const [meta, setMeta] = useState(emptyMeta);
  const [scores, setScores] = useState({});
  const [saved, setSaved] = useState([]);
  const [status, setStatus] = useState({ type: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/competitors').then((res) => res.json()),
      fetch('/api/scores').then((res) => res.json()),
    ]).then(([people, history]) => {
      setCompetitors(people);
      setSaved(history);
      setScores(Object.fromEntries(people.map((person) => [person.id, { sensory: '', technical: emptyTechnical() }])));
    }).catch(() => setStatus({ type: 'error', message: 'Unable to connect to the scoring server.' }));
  }, []);

  const combinedMax = Number(meta.sensoryMax || 0) + Number(meta.technicalMax || 0);
  const ranked = useMemo(() => competitors.map((person) => {
    const row = scores[person.id] || {};
    const sensory = Number(row.sensory || 0);
    const technical = technicalSections.reduce((sum, section) => sum + Number(row.technical?.[section.key] || 0), 0);
    const total = sensory + technical;
    return { ...person, sensory: row.sensory, technical, total, percentage: combinedMax ? total / combinedMax * 100 : 0 };
  }).sort((a, b) => b.total - a.total), [competitors, scores, combinedMax]);

  const completed = competitors.filter((person) => scores[person.id]?.sensory !== '' && technicalSections.every((section) => scores[person.id]?.technical?.[section.key] !== '')).length;

  function updateMeta(event) {
    const { name, value } = event.target;
    setMeta((current) => ({ ...current, [name]: value }));
  }

  function updateScore(id, field, value) {
    setScores((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
  }

  function updateTechnicalScore(id, section, value) {
    setScores((current) => ({
      ...current,
      [id]: { ...current[id], technical: { ...current[id].technical, [section]: value } },
    }));
  }

  function resetForm() {
    setScores(Object.fromEntries(competitors.map((person) => [person.id, { sensory: '', technical: emptyTechnical() }])));
    setMeta((current) => ({ ...emptyMeta, judgeName: current.judgeName }));
    setStatus({ type: '', message: '' });
  }

  async function saveScores(event) {
    event.preventDefault();
    if (completed !== competitors.length) {
      setStatus({ type: 'error', message: `Complete all scores first (${completed}/${competitors.length} done).` });
      return;
    }
    setSaving(true);
    setStatus({ type: '', message: '' });
    const entries = competitors.map((person) => ({ competitorId: person.id, ...scores[person.id] }));
    try {
      const response = await fetch('/api/scores', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...meta, entries }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setSaved((current) => [result, ...current]);
      setStatus({ type: 'success', message: "Scoresheet submitted to Wesley's Formspree storage and saved successfully." });
    } catch (error) {
      setStatus({ type: 'error', message: error.message || 'Unable to save scoresheet.' });
    } finally { setSaving(false); }
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
          <div className="stat"><span>Saved sheets</span><strong>{saved.length}</strong></div>
        </section>

        <section className="progress-panel no-print" aria-label="Scoring progress">
          <div>
            <span>Scoring progress</span>
            <strong>{competitors.length ? Math.round((completed / competitors.length) * 100) : 0}% complete</strong>
          </div>
          <div className="progress-track"><span style={{ width: `${competitors.length ? (completed / competitors.length) * 100 : 0}%` }} /></div>
          <p>{completed === competitors.length && competitors.length ? 'All competitors are ready for submission.' : `${competitors.length - completed} competitors remaining`}</p>
        </section>

        <form onSubmit={saveScores} className="score-card">
          <div className="section-heading">
            <div><span className="section-number">01</span><h2>Judge & session</h2></div>
            <p>Set the score limits before judging.</p>
          </div>
          <div className="meta-grid">
            <label>Judge's name<input name="judgeName" value={meta.judgeName} onChange={updateMeta} placeholder="Enter full name" required /></label>
            <label>Date<input type="date" name="date" value={meta.date} onChange={updateMeta} required /></label>
            <label>Round / session<input name="round" value={meta.round} onChange={updateMeta} placeholder="e.g. Preliminary 1" /></label>
            <label>Maximum sensory<input type="number" min="1" name="sensoryMax" value={meta.sensoryMax} onChange={updateMeta} required /></label>
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
                  <td data-label={`Sensory / ${meta.sensoryMax || 0}`}><input aria-label={`${person.name} sensory score`} type="number" min="0" max={meta.sensoryMax} step="0.1" value={scores[person.id]?.sensory ?? ''} onChange={(e) => updateScore(person.id, 'sensory', e.target.value)} placeholder="0" required /></td>
                  <td data-label="Technical / 71" className="technical-cell">
                    <details>
                      <summary><span>{row.technical?.toFixed(1) ?? '0.0'} / 71</span><small>Score 5 sections</small></summary>
                      <div className="technical-breakdown">
                        {technicalSections.map((section) => <label key={section.key} title={section.guidance}>
                          <span>{section.label}<small>{section.guidance}</small></span>
                          <input aria-label={`${person.name} ${section.label}`} type="number" min="0" max={section.max} step="0.1" value={scores[person.id]?.technical?.[section.key] ?? ''} onChange={(e) => updateTechnicalScore(person.id, section.key, e.target.value)} placeholder={`0-${section.max}`} required />
                        </label>)}
                      </div>
                    </details>
                  </td>
                  <td data-label={`Total / ${combinedMax}`} className="calculated">{row.total?.toFixed(1) ?? '0.0'}</td>
                  <td data-label="Percentage"><span className="percent-pill">{formatPercent(row.percentage || 0)}</span></td>
                </tr>;
              })}</tbody>
            </table>
          </div>

          <div className="section-heading comments-heading">
            <div><span className="section-number">03</span><h2>Notes & submission</h2></div>
          </div>
          <label className="comments-label">General comments<textarea name="comments" value={meta.comments} onChange={updateMeta} rows="4" placeholder="Add observations, decisions, or notes for the head judge..." /></label>
          {status.message && <div className={`notice ${status.type}`} role="status">{status.message}</div>}
          <div className="actions">
            <button type="button" className="button ghost no-print" onClick={resetForm}>Clear sheet</button>
            <button type="button" className="button secondary no-print" onClick={() => window.print()}>Print / PDF</button>
            <button className="button primary no-print" disabled={saving}>{saving ? 'Saving...' : 'Save scoresheet'}</button>
            <div className="signature print-only">Judge's signature: __________________________________</div>
          </div>
        </form>

        <section className="history no-print">
          <div className="section-heading"><div><span className="section-number">04</span><h2>Saved score sheets</h2></div></div>
          {saved.length === 0 ? <div className="empty-state"><strong>No saved sheets yet</strong><span>Completed judging sessions will appear here.</span></div> :
            <div className="history-list">{saved.map((record) => <article key={record.id}>
              <div><strong>{record.judgeName}</strong><span>{record.date} · {record.round || 'Unspecified session'}</span></div>
              <button onClick={() => removeRecord(record.id)} aria-label={`Delete scoresheet by ${record.judgeName}`}>Delete</button>
            </article>)}</div>}
        </section>
      </main>
      <footer>Official competition scoring system · Excellence in every cup</footer>
    </div>
  );
}
