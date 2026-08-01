import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, RefreshCcw, Eye, ShieldCheck, X, Copy, Check,
  User, Globe2, Hash, CalendarClock, FileJson, ChevronRight
} from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';

// Safely parse a JSON string, returning null on failure instead of throwing.
function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Turns a camelCase / snake_case key into a readable label.
function humanizeKey(key) {
  return String(key)
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function AnswerValue({ value }) {
  if (value === null || value === undefined || value === '') {
    return <span style={{ color: 'var(--pm-text-tertiary)', fontStyle: 'italic' }}>—</span>;
  }
  if (Array.isArray(value)) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {value.map((v, i) => (
          <span key={i} className="badge badge-info" style={{ fontWeight: 500 }}>
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  }
  if (typeof value === 'object') {
    return (
      <pre style={{ margin: 0, fontSize: 12, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', color: 'var(--pm-text-secondary)' }}>
        {JSON.stringify(value, null, 2)}
      </pre>
    );
  }
  return <span style={{ color: 'var(--pm-text-primary)', fontWeight: 600 }}>{String(value)}</span>;
}

// Renders a parsed answer payload as a clean list of question/answer rows.
// Falls back gracefully for shapes that aren't a flat object.
function AnswerPanel({ raw, accent }) {
  const parsed = safeParse(raw);

  if (!raw) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        padding: '36px 20px', color: 'var(--pm-text-tertiary)', textAlign: 'center',
      }}>
        <FileJson size={22} strokeWidth={1.5} />
        <span style={{ fontSize: 12.5 }}>No answers were submitted for this stage.</span>
      </div>
    );
  }

  const entries = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
    ? Object.entries(parsed)
    : null;

  if (!entries) {
    // Not a plain object (array, primitive, or unparsable) — show raw payload.
    return (
      <div style={{ background: 'var(--pm-bg)', border: '1px solid var(--pm-border-layout)', borderRadius: 10, padding: '14px 16px' }}>
        <pre style={{ margin: 0, fontSize: 12.5, fontFamily: 'ui-monospace, monospace', whiteSpace: 'pre-wrap', color: 'var(--pm-text-secondary)' }}>
          {parsed ? JSON.stringify(parsed, null, 2) : raw}
        </pre>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--pm-text-tertiary)', fontSize: 12.5 }}>
        Answer payload is empty.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, borderRadius: 10, overflow: 'hidden', border: '1px solid var(--pm-border-layout)' }}>
      {entries.map(([key, value], i) => (
        <div
          key={key}
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(120px, 34%) 1fr',
            gap: 16,
            padding: '11px 14px',
            background: i % 2 === 0 ? 'var(--pm-card)' : 'var(--pm-bg)',
          }}
        >
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 7,
            fontSize: 11.5, fontWeight: 700, color: 'var(--pm-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.03em', paddingTop: 1,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: 999, background: accent, marginTop: 5, flexShrink: 0 }} />
            {humanizeKey(key)}
          </div>
          <div style={{ fontSize: 13, minWidth: 0 }}>
            <AnswerValue value={value} />
          </div>
        </div>
      ))}
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  if (!text) return null;
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable — fail silently
    }
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="btn btn-secondary"
      style={{ padding: '5px 10px', fontSize: 11.5, gap: 5 }}
      title="Copy raw JSON"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'Copied' : 'Copy JSON'}
    </button>
  );
}

export default function PerformancePersonaView() {
  const token = getAdminToken();
  const { theme } = useAdminTheme();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [activeStage, setActiveStage] = useState('front'); // 'front' | 'backend'

  const fetchRecords = useCallback(async (p = 1, q = search) => {
    setLoading(true);
    try {
      // Fetch flowings with questionnaire answers (rs_content)
      const qs = `?page=${p}&limit=15${q ? `&search=${encodeURIComponent(q)}` : ''}`;
      const res = await adminFetch(`/reward/list${qs}`, 'GET', null, token);
      if (res.code === 200) {
        setRecords(res.data.list || []);
        setTotal(res.data.count || 0);
        setPages(res.data.pages || 1);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token, search]);

  useEffect(() => {
    fetchRecords(1, '');
  }, []);

  const handleOpenDetail = (record) => {
    setSelectedRecord(record);
    setActiveStage(record.front_rs ? 'front' : 'backend');
    setDetailModalOpen(true);
  };

  const stageConfig = {
    front: { label: 'Pre-answer', sublabel: 'Front-end', accent: 'var(--pm-accent)', data: selectedRecord?.front_rs },
    backend: { label: 'Post-answer', sublabel: 'Back-end', accent: 'var(--pm-info)', data: selectedRecord?.backend_rs },
  };
  const active = selectedRecord ? stageConfig[activeStage] : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      <div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--pm-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
          Performance Persona Answers
        </h2>
        <p style={{ fontSize: 13, color: 'var(--pm-text-secondary)', margin: '4px 0 0' }}>
          Inspect target demographics profile answers registered from survey redirects.
        </p>
      </div>

      {/* Filter Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, background: 'var(--pm-bg-card)', padding: '16px 20px', borderRadius: 10, border: '1px solid var(--pm-border-layout)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--pm-text-secondary)' }} />
            <input className="form-input" placeholder="Search project/member…" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchRecords(1, search)} style={{ paddingLeft: 32, width: 240 }} />
          </div>
          <button className="btn btn-secondary" onClick={() => fetchRecords(1, search)}><Search size={13} /> Search</button>
          <button className="btn btn-secondary" onClick={() => { setSearch(''); fetchRecords(1, ''); }}><RefreshCcw size={13} /> Reset</button>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading logs…</div>
        ) : records.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>No answers logged.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>UUID / TXN</th><th>Member</th><th>Project No</th><th>Platform</th><th>Pre-Answer (Front)</th><th>Post-Answer (Backend)</th><th>Date</th><th style={{ textAlign: 'right' }}>Action</th></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.reward_id}>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.uuid}</div>
                    <div style={{ color: 'var(--pm-text-secondary)', fontSize: 11 }}>TXN: {r.txn_id}</div>
                  </td>
                  <td style={{ fontWeight: 700 }}>{r.member?.nickname || `ID: ${r.member_id}`}</td>
                  <td>{r.project_no}</td>
                  <td>{r.platform?.platform_name}</td>
                  <td>
                    {r.front_rs ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={11} /> Captured
                      </span>
                    ) : (
                      <span style={{ color: 'var(--pm-text-secondary)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td>
                    {r.backend_rs ? (
                      <span className="badge badge-info" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={11} /> Captured
                      </span>
                    ) : (
                      <span style={{ color: 'var(--pm-text-secondary)', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--pm-text-secondary)' }}>
                    {r.create_time ? new Date(r.create_time).toLocaleString() : 'N/A'}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-secondary" onClick={() => handleOpenDetail(r)} style={{ padding: '6px' }} title="View Answers Details">
                      <Eye size={13} /> Inspect
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          {Array.from({ length: pages }, (_, i) => i + 1).map(pg => (
            <button key={pg} className={`btn ${page === pg ? 'btn-primary' : 'btn-secondary'}`} style={{ width: 36, height: 36, padding: 0 }} onClick={() => { setPage(pg); fetchRecords(pg, search); }}>{pg}</button>
          ))}
        </div>
      )}

      {/* Details Dialog */}
      {detailModalOpen && selectedRecord && createPortal(
        <div className="admin-theme" data-theme={theme}>
          <div
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
            onClick={() => setDetailModalOpen(false)}
          >
            <div
              className="dialog-modal"
              style={{ maxWidth: '680px', width: '100%', maxHeight: '86vh', boxShadow: 'var(--pm-shadow-lg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="dialog-header" style={{ padding: '18px 24px', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: 'var(--pm-accent-bg)', border: '1px solid var(--pm-border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--pm-accent)',
                  }}>
                    <FileJson size={17} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: 'var(--pm-text-primary)' }}>
                      Captured Persona Answers
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3, fontSize: 11.5, color: 'var(--pm-text-tertiary)', fontFamily: 'ui-monospace, monospace' }}>
                      <Hash size={11} style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedRecord.uuid}</span>
                      <span style={{ opacity: 0.5 }}>·</span>
                      <span>TXN {selectedRecord.txn_id}</span>
                    </div>
                  </div>
                </div>
                <button type="button" onClick={() => setDetailModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)', flexShrink: 0, padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Meta strip */}
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 8, padding: '12px 24px',
                borderBottom: '1px solid var(--pm-border-layout)', background: 'var(--pm-bg)',
              }}>
                {[
                  { icon: User, label: selectedRecord.member?.nickname || `ID: ${selectedRecord.member_id}` },
                  { icon: Globe2, label: selectedRecord.platform?.platform_name || '—' },
                  { icon: ChevronRight, label: `Project ${selectedRecord.project_no}` },
                  { icon: CalendarClock, label: selectedRecord.create_time ? new Date(selectedRecord.create_time).toLocaleString() : 'N/A' },
                ].map((item, i) => (
                  <span key={i} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11.5, fontWeight: 600, color: 'var(--pm-text-secondary)',
                    background: 'var(--pm-card)', border: '1px solid var(--pm-border-layout)',
                    borderRadius: 999, padding: '5px 10px',
                  }}>
                    <item.icon size={11} style={{ opacity: 0.7 }} />
                    {item.label}
                  </span>
                ))}
              </div>

              {/* Body */}
              <div className="dialog-body" style={{ padding: '18px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Stage tabs */}
                <div style={{
                  display: 'inline-flex', gap: 3, padding: 3, background: 'var(--pm-bg)',
                  border: '1px solid var(--pm-border-layout)', borderRadius: 10, alignSelf: 'flex-start',
                }}>
                  {Object.entries(stageConfig).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveStage(key)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7,
                        padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                        fontSize: 12.5, fontWeight: 700,
                        background: activeStage === key ? 'var(--pm-card)' : 'transparent',
                        color: activeStage === key ? 'var(--pm-text-primary)' : 'var(--pm-text-tertiary)',
                        boxShadow: activeStage === key ? 'var(--pm-shadow-sm)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: 999, background: cfg.accent, flexShrink: 0 }} />
                      {cfg.label}
                      <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--pm-text-tertiary)' }}>· {cfg.sublabel}</span>
                      {cfg.data
                        ? <ShieldCheck size={12} style={{ color: 'var(--pm-success)' }} />
                        : <span style={{ fontSize: 10, color: 'var(--pm-text-tertiary)' }}>empty</span>}
                    </button>
                  ))}
                </div>

                {/* Active panel */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                    <CopyButton text={active?.data} />
                  </div>
                  <AnswerPanel raw={active?.data} accent={active?.accent} />
                </div>
              </div>

              <div className="dialog-footer" style={{ padding: '14px 24px' }}>
                <button type="button" className="btn btn-secondary" style={{ padding: '8px 20px' }} onClick={() => setDetailModalOpen(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}