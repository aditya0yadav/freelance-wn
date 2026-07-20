import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export default function ModalSpecs({ modalOpen, setModalOpen, modalSurvey, modalLoading, modalData }) {
  const { language } = useLanguage();

  if (!modalOpen) return null;

  // Translation keys
  const t = {
    en: {
      title: 'Live Quota & Qualification',
      pulling: 'Pulling live specs...',
      failed: 'Fetch Failed',
      failedDesc: 'Unable to retrieve live specifications.',
      directLink: 'Direct Survey Link',
      openLink: 'Open Link',
      totalQuota: 'Total Quota',
      completes: 'Completes',
      remaining: 'Remaining',
      activeGroups: 'Active Quota Groups',
      targeting: 'Targeting Demographics',
      noRules: 'No targeting rules available.',
      quotaDetails: 'Quota & Qualification Details',
      surveyEntry: 'Open Survey Link'
    },
    zh: {
      title: '实时配额与资质筛选',
      pulling: '正在拉取实时规格...',
      failed: '获取失败',
      failedDesc: '无法检索实时规格说明。',
      directLink: '直连调查链接',
      openLink: '打开链接',
      totalQuota: '总配额',
      completes: '已完成数',
      remaining: '剩余',
      activeGroups: '活动配额组',
      targeting: '目标人群定位特征',
      noRules: '无可用定位规则。',
      quotaDetails: '配额与资质详情',
      surveyEntry: '打开调查链接'
    }
  }[language || 'en'];

  return (
    <div className="modal-overlay" onClick={() => setModalOpen(false)}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{t.title}</h3>
            <p>{modalSurvey?.project_name || modalSurvey?.project_pno}</p>
          </div>
          <button className="modal-close" onClick={() => setModalOpen(false)}>×</button>
        </div>
        <div className="modal-body">
          {modalLoading ? (
            <div className="center-loader"><div className="loader-ring" /><p>{t.pulling}</p></div>
          ) : !modalData ? (
            <div className="empty-screen"><div className="empty-icon">❌</div><h3>{t.failed}</h3><p>{t.failedDesc}</p></div>
          ) : modalData.type === 'link' ? (
            <div className="empty-screen">
              <div className="empty-icon">🔗</div>
              <h3>{t.directLink}</h3>
              <a href={modalData.content} target="_blank" rel="noreferrer" className="btn-primary-sm">{t.openLink}</a>
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

              const hasProjectQuota = modalData.project?.project_quota !== undefined && modalData.project?.project_quota > 0;
              const remainingQuota = hasProjectQuota ? Math.max(0, modalData.project.project_quota - (modalData.project?.project_complete || 0)) : null;

              return (
                <div>
                  <div className="quota-stats">
                    <div className="quota-stat">
                      <span>{t.totalQuota}</span>
                      <strong>{hasProjectQuota ? modalData.project.project_quota : liveQuota}</strong>
                    </div>
                    <div className="quota-stat">
                      <span>{t.completes}</span>
                      <strong className="stat-green">{modalData.project?.project_complete || 0}</strong>
                    </div>
                    {remainingQuota !== null && (
                      <div className="quota-stat">
                        <span>{t.remaining}</span>
                        <strong className="stat-blue">{remainingQuota}</strong>
                      </div>
                    )}
                  </div>

                  {gwsQuotas.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div className="quota-rules-label">{t.activeGroups}</div>
                      <div className="quota-rules" style={{ marginBottom: '18px' }}>
                        {gwsQuotas.map((g, i) => (
                          <div key={i} className="rule-item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '12px' }}>
                              <strong style={{ color: 'var(--blue)' }}>Group #{g.id}</strong>
                              <span style={{ fontWeight: '600', color: 'var(--green)' }}>{t.remaining}: {g.remaining}</span>
                            </div>
                            <span style={{ fontSize: '13px', color: 'var(--t2)', paddingLeft: '0' }}>{g.conditions}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Render Manual Project Content/Qualifications */}
                  {modalData.project?.project_content && (
                    <div style={{ marginTop: '16px' }}>
                      <div className="quota-rules-label">{t.quotaDetails}</div>
                      <div 
                        className="quota-html" 
                        style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '14px', marginTop: '6px', fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}
                        dangerouslySetInnerHTML={{ __html: modalData.project.project_content }}
                      />
                    </div>
                  )}

                  {/* Render Manual Project Redirect Link button */}
                  {modalData.project?.project_link && (
                    <div style={{ textAlign: 'center', marginTop: '20px' }}>
                      <a 
                        href={`${modalData.project.project_link}${modalSurvey?.project_pno}`} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-primary-sm"
                        style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--primary-brand)', color: '#fff', borderRadius: '6px', textDecoration: 'none', fontWeight: '600' }}
                      >
                        {t.surveyEntry}
                      </a>
                    </div>
                  )}

                  {/* Gowebsurveys specific targeting rules */}
                  {(modalData.qualData?.result?.data?.length > 0 || modalData.qualData?.targeting) && (
                    <div style={{ marginTop: '16px' }}>
                      <div className="quota-rules-label">{t.targeting}</div>
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
                          <p className="no-rules">{t.noRules}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()
          ) : <p>No data available.</p>}
        </div>
      </div>
    </div>
  );
}
