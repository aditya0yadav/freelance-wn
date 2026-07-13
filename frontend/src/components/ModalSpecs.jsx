import React from 'react';

export default function ModalSpecs({ modalOpen, setModalOpen, modalSurvey, modalLoading, modalData }) {
  if (!modalOpen) return null;

  return (
    <div className="modal-overlay" onClick={() => setModalOpen(false)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>Live Quota & Qualification</h3>
            <p>{modalSurvey?.project_name || modalSurvey?.project_pno}</p>
          </div>
          <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
        </div>
        <div className="modal-body">
          {modalLoading ? (
            <div className="center-loader"><div className="loader-ring" /><p>Pulling live specs...</p></div>
          ) : !modalData ? (
            <div className="empty-screen"><div className="empty-icon">❌</div><h3>Fetch Failed</h3><p>Unable to retrieve live specifications.</p></div>
          ) : modalData.type === 'link' ? (
            <div className="empty-screen">
              <div className="empty-icon">🔗</div>
              <h3>Direct Survey Link</h3>
              <a href={modalData.content} target="_blank" rel="noreferrer" className="btn-primary-sm">Open Link</a>
            </div>
          ) : modalData.type === 'content' ? (
            <div className="quota-html" dangerouslySetInnerHTML={{ __html: modalData.content }} />
          ) : modalData.type === 'structured' ? (
            (() => {
              const info = modalData.surveyInfo?.[0] || {};
              const liveQuota = info.surveyTargetCount !== undefined ? info.surveyTargetCount : (modalData.project?.project_quota || 'N/A');
              const gwsQuotas = [];
              if (info.Quota) {
                Object.entries(info.Quota).forEach(([quotaId, qObj]) => {
                  const remaining = qObj.remainingQuota?.[0] || 'N/A';
                  if (qObj.conditions) {
                    const conditionsList = qObj.conditions.map(cond => {
                      let question = cond.profileQuestionKey || 'Targeting';
                      let val = cond.OptionText || '';
                      if (cond.min !== undefined && cond.max !== undefined && cond.min !== null) {
                        val = `${cond.min} - ${cond.max} years`;
                      }
                      return `${question}: ${val}`;
                    }).join(', ');
                    gwsQuotas.push({
                      id: quotaId,
                      conditions: conditionsList,
                      remaining: remaining
                    });
                  }
                });
              }

              return (
                <div>
                  <div className="quota-stats">
                    <div className="quota-stat">
                      <span>Total Quota</span>
                      <strong>{liveQuota}</strong>
                    </div>
                    <div className="quota-stat">
                      <span>Completes</span>
                      <strong className="stat-green">{modalData.project?.project_complete || 0}</strong>
                    </div>
                  </div>

                  {gwsQuotas.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div className="quota-rules-label">Active Quota Groups</div>
                      <div className="quota-rules" style={{ marginBottom: '18px' }}>
                        {gwsQuotas.map((g, i) => (
                          <div key={i} className="rule-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px' }}>
                              <strong style={{ color: 'var(--blue)' }}>Group #{g.id}</strong>
                              <span style={{ fontWeight: '600', color: 'var(--green)' }}>Remaining: {g.remaining}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: 'var(--t2)', paddingLeft: '0' }}>{g.conditions}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="quota-rules-label">Targeting Demographics</div>
                  <div className="quota-rules">
                    {modalData.qualData?.result?.data?.length > 0 ? (
                      modalData.qualData.result.data.map((q, i) => (
                        <div key={i} className="rule-item">
                          <strong>{q.QuestionText || q.QuestionID}</strong>
                          <span>{q.AnswerCodes?.join(', ') || 'Open'}</span>
                        </div>
                      ))
                    ) : modalData.qualData?.targeting ? (
                      Object.entries(modalData.qualData.targeting).map(([key, list]) => {
                        if (!list || list.length === 0) return null;
                        return (
                          <div key={key} className="rule-item">
                            <strong style={{ textTransform: 'capitalize' }}>{key}</strong>
                            <span>
                              {list.map(r => {
                                if (r.min !== undefined && r.max !== undefined) {
                                  return `${r.min} - ${r.max} years`;
                                }
                                return r.OptionText || r.profileAnswerKey || '';
                              }).filter(Boolean).join(', ')}
                            </span>
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-rules">No targeting rules available.</p>
                    )}
                  </div>
                </div>
              );
            })()
          ) : <p>No data available.</p>}
        </div>
      </div>
    </div>
  );
}
