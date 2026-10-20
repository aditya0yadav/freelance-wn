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

  // Fallback: If it's an email survey with plain text, synthesize the timeline view automatically
  if (!timelineData && modalData?.type === 'content' && typeof modalData.content === 'string') {
    const rawText = modalData.content.replace(/<[^>]+>/g, '').trim();
    const isEmailProject =
      rawText.includes('[Tag: Email Survey]') ||
      modalData.project?.project_code === 'EMAIL_SURVEY' ||
      modalSurvey?.project_code === 'EMAIL_SURVEY' ||
      modalSurvey?.platform_name === 'WI' ||
      modalSurvey?.platform_name === 'T' ||
      modalSurvey?.platform_name === 'PF' ||
      modalSurvey?.platform_name === 'GWS';

    if (isEmailProject) {
      let targetCountry = 'Global';
      const cMatch = rawText.match(/\(Target:\s*([^)]+)\)/i) || rawText.match(/Market:\s*([^.\n]+)/i);
      if (cMatch) targetCountry = cMatch[1].replace(/[()]/g, '').trim();

      let ageRange = '18 - 65';
      const aMatch =
        rawText.match(/(?:age|ages|between)\s*(\d{1,2}\s*[-–to]\s*\d{1,2})/i) ||
        rawText.match(/(\d{1,2}\s*[-–]\s*\d{1,2})\s*years?/i);
      if (aMatch) ageRange = aMatch[1].trim();

      let occupation = 'General / All Occupations';
      const oMatch = rawText.match(/(?:Industry|Audience|Occupation):\s*([^.\n]+)/i);
      if (oMatch) {
        occupation = oMatch[1].replace(/[()]/g, '').trim();
      } else {
        const occKeywordMatch = rawText.match(/(?:People who influence|Decision-Makers|Workers|Owners|Managers|Directors)[^.\n]*/i);
        if (occKeywordMatch) {
          occupation = occKeywordMatch[0].replace(/[()]/g, '').trim();
        }
      }

      const cleanedNote = rawText
        .replace(/\[Tag:\s*Email Survey\]\s*/i, '')
        .replace(/\(Target:\s*[^)]+\)/i, '')
        .trim();

      const exclusions = [];
      const exMatch = cleanedNote.match(/(?:exclude|excluded|excluding|pause|closed|full)\s*[:\-]?\s*([^.\n]+)/i);
      if (exMatch) {
        exclusions.push(exMatch[0].trim());
      }

      const hasSubsequentUpdate =
        modalData.project?.update_time &&
        modalData.project?.create_time &&
        new Date(modalData.project.update_time).getTime() > new Date(modalData.project.create_time).getTime() + 1000;

      const fallbackLogs = [];
      if (hasSubsequentUpdate) {
        fallbackLogs.push({
          date: modalData.project.update_time,
          email_subject: modalData.project?.project_name || modalSurvey?.project_name || 'Project Update Dispatch',
          subject: modalData.project?.project_name || modalSurvey?.project_name || 'Project Update Dispatch',
          notes: cleanedNote || 'Fieldwork update recorded.',
          summary: cleanedNote || 'Fieldwork update recorded.',
          excluded_groups: exclusions,
          quota: modalData.project?.project_quota || null,
          updated_quota: modalData.project?.project_quota || null,
          cpi: modalData.project?.project_cpi || null,
          updated_cpi: modalData.project?.project_cpi || null,
          status: modalData.project?.is_disable === 1 ? 'PAUSED' : 'ACTIVE'
        });
      }

      timelineData = {
        is_timeline: true,
        target_country: targetCountry,
        base_requirements: {
          country: targetCountry,
          age_range: ageRange,
          occupation: occupation,
          target_demographics: 'Target Demographic Audience',
          initial_quota: modalData.project?.project_quota || modalSurvey?.project_quota || 100,
          initial_cpi: modalData.project?.project_cpi || modalSurvey?.project_cpi || 1.0,
          description: cleanedNote || 'Live project dispatch specifications.'
        },
        update_logs: fallbackLogs
      };
    }
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
                <div className="timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Top Quota Metrics Bar */}
                  <div className="quota-stats" style={{ display: 'grid', gridTemplateColumns: remainingVal !== null ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)', gap: '12px', margin: '0 0 6px 0' }}>
                    <div className="quota-stat" style={{ background: 'var(--bg-3, #f1f5f9)', padding: '14px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border, #e2e8f0)' }}>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--t3, #64748b)', marginBottom: '4px' }}>{t.totalQuota}</span>
                      <strong style={{ fontSize: '20px', fontWeight: 700, color: 'var(--t1, #0f172a)' }}>{totalQuotaVal}</strong>
                    </div>
                    <div className="quota-stat" style={{ background: 'var(--bg-3, #f1f5f9)', padding: '14px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border, #e2e8f0)' }}>
                      <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--t3, #64748b)', marginBottom: '4px' }}>{t.completes}</span>
                      <strong className="stat-green" style={{ fontSize: '20px', fontWeight: 700, color: '#10b981' }}>{completedVal}</strong>
                    </div>
                    {remainingVal !== null && (
                      <div className="quota-stat" style={{ background: 'var(--bg-3, #f1f5f9)', padding: '14px 16px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border, #e2e8f0)' }}>
                        <span style={{ display: 'block', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: 'var(--t3, #64748b)', marginBottom: '4px' }}>{t.remaining}</span>
                        <strong className="stat-blue" style={{ fontSize: '20px', fontWeight: 700, color: '#3b82f6' }}>{remainingVal}</strong>
                      </div>
                    )}
                  </div>

                  {/* 1. Permanent Initial Base Requirements */}
                  <div className="timeline-base-card" style={{ background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', borderLeft: '4px solid #10b981', borderRadius: '12px', padding: '16px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                    <div className="timeline-base-header" style={{ marginBottom: '14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
                        <ShieldCheck size={18} />
                        <span>{t.baseRequirements}</span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: 'var(--t2, #64748b)', lineHeight: '1.4' }}>
                        {t.baseRequirementsDesc}
                      </p>
                    </div>

                    <div className="timeline-base-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {/* Country */}
                      <div className="base-pill" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-3, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#10b981' }}>
                          <Globe size={16} />
                        </div>
                        <div className="pill-content" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--t3, #64748b)', letterSpacing: '0.04em' }}>{t.targetCountry}</span>
                          <strong style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1, #0f172a)' }}>{baseReq.country || timelineData.target_country || 'Global'}</strong>
                        </div>
                      </div>

                      {/* Age Range */}
                      <div className="base-pill" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-3, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#3b82f6' }}>
                          <Users size={16} />
                        </div>
                        <div className="pill-content" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--t3, #64748b)', letterSpacing: '0.04em' }}>{t.ageRange}</span>
                          <strong style={{ fontSize: '13px', fontWeight: 700, color: '#10b981' }}>{baseReq.age_range || 'All ages'}</strong>
                        </div>
                      </div>

                      {/* Occupation / Industry */}
                      <div className="base-pill" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-3, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#f59e0b' }}>
                          <Briefcase size={16} />
                        </div>
                        <div className="pill-content" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--t3, #64748b)', letterSpacing: '0.04em' }}>{t.occupation}</span>
                          <strong style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1, #0f172a)' }}>{baseReq.occupation || 'Open / General'}</strong>
                        </div>
                      </div>

                      {/* Target Demographics */}
                      <div className="base-pill" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-3, #f8fafc)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#8b5cf6' }}>
                          <Tag size={16} />
                        </div>
                        <div className="pill-content" style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600, color: 'var(--t3, #64748b)', letterSpacing: '0.04em' }}>{t.targetDemographics}</span>
                          <strong style={{ fontSize: '13px', fontWeight: 600, color: 'var(--t1, #0f172a)' }}>{baseReq.target_demographics || 'General Audience'}</strong>
                        </div>
                      </div>
                    </div>

                    {baseReq.description && (
                      <div className="base-description-box" style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--bg-3, #f8fafc)', border: '1px dashed var(--border, #cbd5e1)', borderRadius: '8px', fontSize: '12.5px', color: 'var(--t2, #475569)', lineHeight: 1.5 }}>
                        {baseReq.description}
                      </div>
                    )}
                  </div>

                  {/* 2. Chronological Update Timeline */}
                  <div className="timeline-updates-section" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div className="timeline-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13.5px', fontWeight: 700, color: 'var(--t1, #0f172a)' }}>
                      <Clock size={16} style={{ color: '#10b981' }} />
                      <span>{t.updateHistory}</span>
                      <span className="update-count-pill" style={{ background: '#10b981', color: '#fff', fontSize: '11px', fontWeight: 700, borderRadius: '20px', padding: '1px 8px', marginLeft: '4px' }}>
                        {updateLogs.length}
                      </span>
                    </div>

                    {updateLogs.length === 0 ? (
                      <div className="timeline-no-updates" style={{ padding: '14px 16px', background: 'var(--bg-3, #f8fafc)', border: '1px dashed var(--border, #cbd5e1)', borderRadius: '8px', color: 'var(--t2, #64748b)', fontSize: '12.5px', textAlign: 'center' }}>
                        <p style={{ margin: 0 }}>{t.noUpdates}</p>
                      </div>
                    ) : (
                      <div className="timeline-feed" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

                          const subject = log.email_subject || log.subject;
                          const quotaVal = (log.quota !== undefined && log.quota !== null)
                            ? log.quota
                            : (log.updated_quota !== undefined && log.updated_quota !== null ? log.updated_quota : null);
                          const cpiVal = (log.cpi !== undefined && log.cpi !== null)
                            ? log.cpi
                            : (log.updated_cpi !== undefined && log.updated_cpi !== null ? log.updated_cpi : null);

                          const rawStatus = String(log.status || (log.action === 'pause' ? 'PAUSED' : log.action === 'resume' ? 'ACTIVE' : log.action === 'close' ? 'CLOSED' : '')).toUpperCase();
                          const isPaused = rawStatus === 'PAUSED' || log.action === 'pause';
                          const isClosed = rawStatus === 'CLOSED' || log.action === 'close';
                          const isActive = rawStatus === 'ACTIVE' || log.action === 'resume';

                          const dotColor = isPaused ? '#ef4444' : isClosed ? '#64748b' : '#10b981';
                          const dotGlow = isPaused ? 'rgba(239, 68, 68, 0.2)' : isClosed ? 'rgba(100, 116, 139, 0.2)' : 'rgba(16, 185, 129, 0.2)';

                          // Build a clean, informative description so the card is NEVER an empty blank box
                          const noteContent = log.notes || log.summary || log.action_reason || log.description || (
                            isPaused
                              ? (language === 'zh' ? '客户通知已暂停该调研项目的样本投放。' : 'Client requested temporary pause on study fieldwork.')
                              : isClosed
                              ? (language === 'zh' ? '该项目调研已圆满结束并关闭。' : 'Fieldwork concluded and study closed.')
                              : isActive && quotaVal
                              ? (language === 'zh' ? `项目已恢复正常投放，目标配额更新为 ${quotaVal} 份。` : `Study resumed, target quota updated to ${quotaVal} completes.`)
                              : quotaVal
                              ? (language === 'zh' ? `目标配额已更新为 ${quotaVal} 份。` : `Target quota updated to ${quotaVal} completes.`)
                              : (language === 'zh' ? '收到合作调研方最新排期更新通知。' : 'Update notification received from research partner.')
                          );

                          return (
                            <div key={log.update_id || idx} className="timeline-item" style={{ display: 'flex', gap: '12px' }}>
                              <div className="timeline-marker" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '16px', flexShrink: 0, paddingTop: '6px' }}>
                                <span className="timeline-dot" style={{ width: '10px', height: '10px', borderRadius: '50%', background: dotColor, boxShadow: `0 0 0 3px ${dotGlow}` }} />
                                {idx < updateLogs.length - 1 && <span className="timeline-line" style={{ width: '2px', flexGrow: 1, background: 'var(--border, #e2e8f0)', marginTop: '4px' }} />}
                              </div>

                              <div className="timeline-content-card" style={{ flexGrow: 1, background: 'var(--surface, #ffffff)', border: '1px solid var(--border, #e2e8f0)', borderRadius: '10px', padding: '12px 16px', boxShadow: '0 2px 6px rgba(0,0,0,0.02)' }}>
                                <div className="timeline-item-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                                  <div className="timeline-date" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--t2, #64748b)' }}>
                                    <Calendar size={13} />
                                    <span>{logDate}</span>
                                  </div>

                                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                                    {/* Status Badge */}
                                    {isPaused && (
                                      <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                                        ⏸️ {language === 'zh' ? '已暂停' : 'Paused'}
                                      </span>
                                    )}
                                    {isActive && (
                                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                                        ▶️ {language === 'zh' ? '进行中' : 'Active'}
                                      </span>
                                    )}
                                    {isClosed && (
                                      <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '6px' }}>
                                        🛑 {language === 'zh' ? '已结束' : 'Closed'}
                                      </span>
                                    )}

                                    {/* Quota Badge */}
                                    {quotaVal !== null && (
                                      <span className="badge-quota-change" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px' }}>
                                        Quota: {quotaVal}
                                      </span>
                                    )}

                                    {/* CPI Badge */}
                                    {cpiVal !== null && (
                                      <span className="badge-cpi-change" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#059669', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '6px' }}>
                                        CPI: ${cpiVal}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Subject Header */}
                                {subject && (
                                  <div className="timeline-subject" style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--t1, #0f172a)', marginBottom: '6px' }}>
                                    {subject}
                                  </div>
                                )}

                                {/* Updated Demographics (if any) */}
                                {(log.age_range || log.occupation) && (
                                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', margin: '4px 0 8px 0', fontSize: '11.5px' }}>
                                    {log.age_range && (
                                      <span style={{ background: 'rgba(139, 92, 246, 0.08)', color: '#7c3aed', padding: '2px 7px', borderRadius: '4px', fontWeight: 500 }}>
                                        {language === 'zh' ? '年龄' : 'Age'}: {log.age_range}
                                      </span>
                                    )}
                                    {log.occupation && (
                                      <span style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#d97706', padding: '2px 7px', borderRadius: '4px', fontWeight: 500 }}>
                                        {language === 'zh' ? '职业' : 'Occupation'}: {log.occupation}
                                      </span>
                                    )}
                                  </div>
                                )}

                                {/* Excluded Demographic & Occupation Tags */}
                                {exclusions.length > 0 && (
                                  <div className="timeline-exclusions" style={{ marginTop: '8px', padding: '8px 12px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: '8px' }}>
                                    <div className="exclusion-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', marginBottom: '6px' }}>
                                      <UserX size={13} />
                                      <span>{t.excludedGroups}</span>
                                    </div>
                                    <div className="exclusion-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                      {exclusions.map((ex, exIdx) => (
                                        <span key={exIdx} className="exclusion-tag" style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '11.5px', fontWeight: 600, padding: '3px 9px', borderRadius: '6px' }}>
                                          ⛔ {ex}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Update Note / Summary Content */}
                                {noteContent && (
                                  <div className="timeline-notes" style={{ marginTop: '8px', fontSize: '12.5px', color: 'var(--t2, #334155)', lineHeight: 1.5, background: 'var(--bg-3, #f8fafc)', padding: '10px 14px', borderRadius: '8px', borderLeft: isPaused ? '3px solid #ef4444' : isClosed ? '3px solid #64748b' : '3px solid #10b981' }}>
                                    {noteContent}
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
