import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  AlertCircle,
  ExternalLink,
  Calendar,
  ShieldCheck,
  UserX,
  Clock,
  Tag,
  Globe,
  Briefcase,
  Users
} from 'lucide-react';

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
      surveyEntry: 'Open Survey Link',
      baseRequirements: 'Initial Base Constraints (Permanent)',
      baseRequirementsDesc: 'Original demographic & quota specifications established at project creation.',
      ageRange: 'Age Range',
      occupation: 'Occupation / Industry',
      targetDemographics: 'Target Demographic',
      targetCountry: 'Country / Region',
      initialQuota: 'Initial Quota',
      initialCpi: 'Base CPI',
      updateHistory: 'Chronological Update Log',
      noUpdates: 'No subsequent updates yet. All baseline requirements remain active and open.',
      excludedGroups: 'Excluded / Full Groups (Do Not Answer)',
      updateNotes: 'Update Notes & Email Broadcast',
      updatedOn: 'Updated on'
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
      surveyEntry: '打开调查链接',
      baseRequirements: '项目初始基准条件 (永久保留)',
      baseRequirementsDesc: '立项时确定的基础受众与配额指标，不受后续排期邮件覆盖。',
      ageRange: '年龄范围',
      occupation: '目标职业 / 行业',
      targetDemographics: '目标受众',
      targetCountry: '国家 / 地区',
      initialQuota: '初始配额',
      initialCpi: '基础单价 (CPI)',
      updateHistory: '实时配额与排期更新日志',
      noUpdates: '暂无后续变更通知，项目按初始基准要求正常进行。',
      excludedGroups: '⛔ 已排除/已满额人群 (请勿作答)',
      updateNotes: '邮件更新内容摘要',
      updatedOn: '更新时间'
    }
  }[language || 'en'];

  // Check if modalData has structured chronological timeline
  let timelineData = null;
  if (modalData?.type === 'timeline' && modalData.timeline) {
    timelineData = modalData.timeline;
  } else if (modalData?.type === 'content' && typeof modalData.content === 'string') {
    try {
      const parsed = JSON.parse(modalData.content);
      if (parsed && (parsed.is_timeline || parsed.base_requirements)) {
        timelineData = parsed;
      }
    } catch {}
  }

  return (
    <div className="modal-overlay" onClick={() => setModalOpen(false)}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '680px' }}>
        <div className="modal-head">
          <div>
            <h3>{t.title}</h3>
            <p>{modalSurvey?.project_name || modalSurvey?.project_pno}</p>
          </div>
          <button
            className="modal-close"
            onClick={() => setModalOpen(false)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          {modalLoading ? (
            <div className="center-loader">
              <div className="loader-ring" />
              <p>{t.pulling}</p>
            </div>
          ) : !modalData ? (
            <div className="empty-screen">
              <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <AlertCircle size={32} style={{ color: '#ef4444' }} />
              </div>
              <h3>{t.failed}</h3>
              <p>{t.failedDesc}</p>
            </div>
          ) : modalData.type === 'link' ? (
            <div className="empty-screen">
              <div className="empty-icon" style={{ display: 'flex', justifyContent: 'center' }}>
                <ExternalLink size={32} style={{ color: 'var(--blue)' }} />
              </div>
              <h3>{t.directLink}</h3>
              <a href={modalData.content} target="_blank" rel="noreferrer" className="btn-primary-sm">
                {t.openLink}
              </a>
            </div>
          ) : timelineData ? (
            /* ═══════════════════════════════════════════════════════════════════════════
               CHRONOLOGICAL TIMELINE VIEW (BASE REQUIREMENTS + UPDATE LOGS)
               ═══════════════════════════════════════════════════════════════════════════ */
            (() => {
              const baseReq = timelineData.base_requirements || {};
              const updateLogs = Array.isArray(timelineData.update_logs) ? timelineData.update_logs : [];
              const projectMeta = modalData.project || modalSurvey || {};

              const totalQuotaVal = projectMeta.project_quota > 0 ? projectMeta.project_quota : (baseReq.initial_quota || 'N/A');
              const completedVal = projectMeta.project_complete || 0;
              const remainingVal = totalQuotaVal !== 'N/A' && Number(totalQuotaVal) > 0
                ? Math.max(0, Number(totalQuotaVal) - completedVal)
                : null;

              return (
                <div className="timeline-container">
                  {/* Top Quota Metrics Bar */}
                  <div className="quota-stats">
                    <div className="quota-stat">
                      <span>{t.totalQuota}</span>
                      <strong>{totalQuotaVal}</strong>
                    </div>
                    <div className="quota-stat">
                      <span>{t.completes}</span>
                      <strong className="stat-green">{completedVal}</strong>
                    </div>
                    {remainingVal !== null && (
                      <div className="quota-stat">
                        <span>{t.remaining}</span>
                        <strong className="stat-blue">{remainingVal}</strong>
                      </div>
                    )}
                  </div>

                  {/* 1. Permanent Initial Base Requirements */}
                  <div className="timeline-base-card">
                    <div className="timeline-base-header">
                      <span className="timeline-badge-base">
                        <ShieldCheck size={16} /> {t.baseRequirements}
                      </span>
                      <span className="timeline-base-sub">{t.baseRequirementsDesc}</span>
                    </div>

                    <div className="timeline-base-grid">
                      <div className="base-pill">
                        <Globe size={16} className="pill-icon" />
                        <div className="pill-content">
                          <label>{t.targetCountry}</label>
                          <strong>{baseReq.country || timelineData.target_country || 'Global'}</strong>
                        </div>
                      </div>

                      <div className="base-pill">
                        <Users size={16} className="pill-icon" />
                        <div className="pill-content">
                          <label>{t.ageRange}</label>
                          <strong className="text-highlight">{baseReq.age_range || 'All ages'}</strong>
                        </div>
                      </div>

                      <div className="base-pill">
                        <Briefcase size={16} className="pill-icon" />
                        <div className="pill-content">
                          <label>{t.occupation}</label>
                          <strong>{baseReq.occupation || 'Open / General'}</strong>
                        </div>
                      </div>

                      <div className="base-pill">
                        <Tag size={16} className="pill-icon" />
                        <div className="pill-content">
                          <label>{t.targetDemographics}</label>
                          <span>{baseReq.target_demographics || 'General Audience'}</span>
                        </div>
                      </div>
                    </div>

                    {baseReq.description && (
                      <div className="base-description-box">
                        {baseReq.description}
                      </div>
                    )}
                  </div>

                  {/* 2. Chronological Update Timeline */}
                  <div className="timeline-updates-section">
                    <div className="timeline-section-title">
                      <Clock size={16} />
                      <span>{t.updateHistory}</span>
                      <span className="update-count-pill">{updateLogs.length}</span>
                    </div>

                    {updateLogs.length === 0 ? (
                      <div className="timeline-no-updates">
                        <p>{t.noUpdates}</p>
                      </div>
                    ) : (
                      <div className="timeline-feed">
                        {updateLogs.map((log, idx) => {
                          const logDate = log.date
                            ? new Date(log.date).toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : (log.date_str || 'Recent update');

                          const exclusions = Array.isArray(log.excluded_groups)
                            ? log.excluded_groups
                            : (typeof log.excluded_groups === 'string' && log.excluded_groups ? [log.excluded_groups] : []);

                          return (
                            <div key={log.update_id || idx} className="timeline-item">
                              <div className="timeline-marker">
                                <span className="timeline-dot" />
                                {idx < updateLogs.length - 1 && <span className="timeline-line" />}
                              </div>

                              <div className="timeline-content-card">
                                <div className="timeline-item-header">
                                  <div className="timeline-date">
                                    <Calendar size={13} />
                                    <span>{logDate}</span>
                                  </div>
                                  <div style={{ display: 'flex', gap: '6px' }}>
                                    {log.quota !== undefined && log.quota !== null && (
                                      <span className="badge-quota-change">
                                        Quota: {log.quota}
                                      </span>
                                    )}
                                    {log.cpi !== undefined && log.cpi !== null && (
                                      <span className="badge-cpi-change">
                                        CPI: ${log.cpi}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {log.email_subject && (
                                  <div className="timeline-subject">{log.email_subject}</div>
                                )}

                                {/* Excluded Demographic & Occupation Tags */}
                                {exclusions.length > 0 && (
                                  <div className="timeline-exclusions">
                                    <div className="exclusion-title">
                                      <UserX size={13} />
                                      <span>{t.excludedGroups}</span>
                                    </div>
                                    <div className="exclusion-tags">
                                      {exclusions.map((ex, exIdx) => (
                                        <span key={exIdx} className="exclusion-tag">
                                          ⛔ {ex}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {log.notes && (
                                  <div className="timeline-notes">
                                    {log.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
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
