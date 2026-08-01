import { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Trash2, Copy, Eye, X, AlertCircle } from 'lucide-react';
import { adminFetch, getAdminToken } from '../utils/adminApi';
import { useAdminTheme } from '../context/AdminThemeContext';

export default function CharacterTemplateView() {
  const token = getAdminToken();
  const { theme } = useAdminTheme();
  
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  
  // Form states
  const [name, setName] = useState('');
  const [type, setType] = useState(0); // 0=front, 1=backend
  const [sort, setSort] = useState(0);
  
  // Question management states
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  
  // Question form states
  const [qName, setQName] = useState('');
  const [qType, setQType] = useState('text');
  const [qValues, setQValues] = useState('');
  const [qHolder, setQHolder] = useState('');
  const [qMust, setQMust] = useState(0);
  const [qSort, setQSort] = useState(0);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminFetch('/persona/list?limit=100', 'GET', null, token);
      if (res.code === 200) {
        setTemplates(res.data.list || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSaveTemplate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      const body = { persona_name: name.trim(), persona_type: Number(type), sort: Number(sort) };
      let res;
      if (selectedTemplate) {
        body.persona_id = selectedTemplate.persona_id;
        res = await adminFetch('/persona/edit', 'POST', body, token);
      } else {
        res = await adminFetch('/persona/add', 'POST', body, token);
      }
      if (res.code === 200) {
        setModalOpen(false);
        fetchTemplates();
      } else {
        alert(res.msg || 'Save failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteTemplate = async (t) => {
    if (!window.confirm(`Are you sure you want to delete template "${t.persona_name}"?`)) return;
    try {
      const res = await adminFetch('/persona/dele', 'POST', { ids: [t.persona_id] }, token);
      if (res.code === 200) {
        fetchTemplates();
      } else {
        alert(res.msg || 'Delete failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCloneTemplate = async (t) => {
    try {
      const res = await adminFetch('/persona/copy', 'POST', { persona_id: t.persona_id }, token);
      if (res.code === 200) {
        fetchTemplates();
      } else {
        alert(res.msg || 'Clone failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Questions CRUD
  const fetchQuestions = async (templateId) => {
    setQuestionsLoading(true);
    try {
      const res = await adminFetch(`/persona-data/list?persona_id=${templateId}&limit=100`, 'GET', null, token);
      if (res.code === 200) {
        setQuestions(res.data.list || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const handleOpenDetails = (t) => {
    setActiveTemplate(t);
    setDetailsOpen(true);
    fetchQuestions(t.persona_id);
  };

  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    if (!qName.trim()) return;
    try {
      const body = {
        persona_id: activeTemplate.persona_id,
        persona_data_name: qName.trim(),
        persona_data_type: qType,
        persona_data_values: qValues,
        persona_data_holder: qHolder,
        persona_data_must: Number(qMust),
        sort: Number(qSort)
      };
      let res;
      if (selectedQuestion) {
        body.persona_data_id = selectedQuestion.persona_data_id;
        res = await adminFetch('/persona-data/edit', 'POST', body, token);
      } else {
        res = await adminFetch('/persona-data/add', 'POST', body, token);
      }
      if (res.code === 200) {
        setQuestionModalOpen(false);
        fetchQuestions(activeTemplate.persona_id);
      } else {
        alert(res.msg || 'Save question failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      const res = await adminFetch('/persona-data/dele', 'POST', { ids: [q.persona_data_id] }, token);
      if (res.code === 200) {
        fetchQuestions(activeTemplate.persona_id);
      } else {
        alert(res.msg || 'Delete failed');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }} className="anima-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: 24, fontWeight: 800, color: 'var(--pm-text-primary)', margin: 0, letterSpacing: '-0.5px' }}>
            Character Templates
          </h2>
          <p style={{ fontSize: 13, color: 'var(--pm-text-secondary)', margin: '4px 0 0' }}>
            Configure and manage pre-existing or post-character questionnaire templates.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setSelectedTemplate(null); setName(''); setType(0); setSort(0); setModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, background: 'var(--primary-brand)', border: 'none' }}>
          <Plus size={15} /> Create Template
        </button>
      </div>

      {/* Main Table */}
      <div className="table-container">
        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading templates…</div>
        ) : templates.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>No templates configured.</div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr><th>ID</th><th>Template Name</th><th>Type</th><th>Sort</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.persona_id}>
                  <td style={{ color: 'var(--pm-text-secondary)', fontSize: 12 }}>#{t.persona_id}</td>
                  <td style={{ fontWeight: 700 }}>{t.persona_name}</td>
                  <td>
                    <span className={`badge ${t.persona_type === 1 ? 'badge-info' : 'badge-success'}`}>
                      {t.persona_type === 1 ? 'Backend / Post' : 'Pre-existing / Front'}
                    </span>
                  </td>
                  <td>{t.sort}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                      <button className="btn btn-secondary" onClick={() => handleOpenDetails(t)} style={{ padding: '6px' }} title="Manage Questions">
                        <Eye size={14} />
                      </button>
                      <button className="btn btn-secondary" onClick={() => handleCloneTemplate(t)} style={{ padding: '6px' }} title="Clone Template">
                        <Copy size={14} />
                      </button>
                      <button className="btn btn-secondary" onClick={() => { setSelectedTemplate(t); setName(t.persona_name); setType(t.persona_type); setSort(t.sort); setModalOpen(true); }} style={{ padding: '6px' }} title="Edit">
                        <Edit2 size={14} />
                      </button>
                      <button className="btn btn-danger" onClick={() => handleDeleteTemplate(t)} style={{ padding: '6px' }} title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <form onSubmit={handleSaveTemplate} className="dialog-modal" style={{ maxWidth: '460px', width: '100%' }}>
              <div className="dialog-header">
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--pm-text-primary)' }}>
                  {selectedTemplate ? 'Edit Template' : 'Create Template'}
                </h3>
                <button type="button" onClick={() => setModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}><X size={18} /></button>
              </div>

              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Template Name *</label>
                  <input type="text" placeholder="e.g. Female Tech User Profile" value={name} onChange={e => setName(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Template Type</label>
                  <select value={type} onChange={e => setType(Number(e.target.value))} className="form-select">
                    <option value={0}>Pre-existing (Front Persona)</option>
                    <option value={1}>Post-character (Backend Persona)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input type="number" value={sort} onChange={e => setSort(Number(e.target.value))} className="form-input" />
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }}>
                  {selectedTemplate ? 'Save Changes' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details (Questions List) Panel */}
      {detailsOpen && activeTemplate && (
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div className="dialog-modal" style={{ maxWidth: '780px', width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
              <div className="dialog-header">
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--pm-text-primary)' }}>
                  Questions inside: {activeTemplate.persona_name}
                </h3>
                <button type="button" onClick={() => setDetailsOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}><X size={18} /></button>
              </div>

              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'flex-end', borderBottom: '1px solid var(--pm-border-layout)' }}>
                <button className="btn btn-primary" onClick={() => { setSelectedQuestion(null); setQName(''); setQType('text'); setQValues(''); setQHolder(''); setQMust(0); setQSort(0); setQuestionModalOpen(true); }} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, background: 'var(--primary-brand)', border: 'none' }}>
                  <Plus size={14} /> Add Question Input
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {questionsLoading ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>Loading questions…</div>
                ) : questions.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--pm-text-secondary)' }}>No inputs configured in this template yet.</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr><th>Sort</th><th>Question Title</th><th>Input Type</th><th>Must Answer</th><th style={{ textAlign: 'right' }}>Actions</th></tr>
                    </thead>
                    <tbody>
                      {questions.map((q) => (
                        <tr key={q.persona_data_id}>
                          <td>{q.sort}</td>
                          <td style={{ fontWeight: 600 }}>{q.persona_data_name}</td>
                          <td><span className="badge badge-info">{q.persona_data_type}</span></td>
                          <td>
                            <span className={`badge ${q.persona_data_must === 1 ? 'badge-danger' : 'badge-success'}`}>
                              {q.persona_data_must === 1 ? 'Required' : 'Optional'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                              <button className="btn btn-secondary" onClick={() => { setSelectedQuestion(q); setQName(q.persona_data_name); setQType(q.persona_data_type); setQValues(q.persona_data_values || ''); setQHolder(q.persona_data_holder || ''); setQMust(q.persona_data_must); setQSort(q.sort); setQuestionModalOpen(true); }} style={{ padding: '4px' }}>
                                <Edit2 size={13} />
                              </button>
                              <button className="btn btn-danger" onClick={() => handleDeleteQuestion(q)} style={{ padding: '4px' }}>
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Question Modal */}
      {questionModalOpen && (
        <div className="admin-theme" data-theme={theme}>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <form onSubmit={handleSaveQuestion} className="dialog-modal" style={{ maxWidth: '500px', width: '100%' }}>
              <div className="dialog-header">
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: 'var(--pm-text-primary)' }}>
                  {selectedQuestion ? 'Edit Question Input' : 'Add Question Input'}
                </h3>
                <button type="button" onClick={() => setQuestionModalOpen(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--pm-text-secondary)' }}><X size={18} /></button>
              </div>

              <div className="dialog-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label">Question Text *</label>
                  <input type="text" placeholder="e.g. What is your age group?" value={qName} onChange={e => setQName(e.target.value)} className="form-input" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Input Type</label>
                  <select value={qType} onChange={e => setQType(e.target.value)} className="form-select">
                    <option value="text">Text Input</option>
                    <option value="number">Number Input</option>
                    <option value="select">Dropdown Select</option>
                    <option value="radio">Radio Options</option>
                  </select>
                </div>
                {(qType === 'select' || qType === 'radio') && (
                  <div className="form-group">
                    <label className="form-label">Options (comma separated)</label>
                    <input type="text" placeholder="e.g. Under 18, 18-35, 36-50, Over 50" value={qValues} onChange={e => setQValues(e.target.value)} className="form-input" />
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Placeholder / Hint</label>
                  <input type="text" placeholder="e.g. Select your group..." value={qHolder} onChange={e => setQHolder(e.target.value)} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Response Required?</label>
                  <select value={qMust} onChange={e => setQMust(Number(e.target.value))} className="form-select">
                    <option value={0}>Optional</option>
                    <option value={1}>Required</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Sort Order</label>
                  <input type="number" value={qSort} onChange={e => setQSort(Number(e.target.value))} className="form-input" />
                </div>
              </div>

              <div className="dialog-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setQuestionModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--primary-brand)', border: 'none' }}>
                  {selectedQuestion ? 'Save Changes' : 'Add Input'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
