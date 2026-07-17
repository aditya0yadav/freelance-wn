import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';

const FAQS_EN = [
  {
    q: "How long do surveys take to complete?",
    a: "Most surveys take between 5 to 20 minutes to complete. The average length of interview (LOI) is shown on each campaign card before you start."
  },
  {
    q: "When are my earned coins credited?",
    a: "Coins are usually credited automatically within 5-15 minutes of a successful survey completion. In rare cases where a platform requires manual validation, it may take up to 24 hours."
  },
  {
    q: "Why was my survey terminated early?",
    a: "Surveys terminate early if you do not qualify for the target audience (known as pre-screen termination) or if the quota for your demographic has already been filled. Always provide honest answers to match with relevant surveys."
  },
  {
    q: "How can I withdraw my coins?",
    a: "Coin redemptions are managed directly by your team administrator. Once you reach the minimum payout threshold, contact your administrator to claim your rewards."
  }
];

const FAQS_ZH = [
  {
    q: "完成一次调查需要多长时间？",
    a: "大多数调查需要 5 到 20 分钟才能完成。在您开始之前，每个渠道卡片上都会显示平均访问长度 (LOI)。"
  },
  {
    q: "我获得的积分金币何时到账？",
    a: "成功完成调查后，金币通常会在 5-15 分钟内自动计入您的账户。在少数需要平台手动审核的特殊情况下，可能最多需要 24 小时。"
  },
  {
    q: "为什么我的调查会提前结束？",
    a: "如果您不符合目标受众（称为甄别不合格）或您的人口统计数据配额已满，调查将提前结束。请务必提供真实回答以匹配最适合您的问卷。"
  },
  {
    q: "我该如何提现/兑换我的积分？",
    a: "金币兑换完全由您的团队管理员管理。达到最低提现额度后，请联系您的管理员申请提现您的奖励。"
  }
];

export default function SupportView({ member, showToast }) {
  const { language, t } = useLanguage();
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Survey Issue');
  const [message, setMessage] = useState('');
  const [faqSearch, setFaqSearch] = useState('');
  const [faqOpen, setFaqOpen] = useState({});

  useEffect(() => {
    const savedTickets = localStorage.getItem('rs_tickets');
    if (savedTickets) {
      try {
        setTickets(JSON.parse(savedTickets));
      } catch (e) {
        console.error("Failed to parse support tickets from localStorage", e);
      }
    }
  }, []);

  const handleToggleFaq = (index) => {
    setFaqOpen(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      showToast(language === 'en' ? "Please fill in all ticket details." : "请填写所有工单详情。", true);
      return;
    }

    const newTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: subject.trim(),
      category: category,
      message: message.trim(),
      status: language === 'en' ? 'Received' : '已收到',
      date: new Date().toLocaleString()
    };

    const updatedTickets = [newTicket, ...tickets];
    setTickets(updatedTickets);
    localStorage.setItem('rs_tickets', JSON.stringify(updatedTickets));

    showToast(t('ticketSubmitted'));
    setSubject('');
    setMessage('');
  };

  const activeFaqs = language === 'en' ? FAQS_EN : FAQS_ZH;

  const filteredFaqs = activeFaqs.filter(
    faq => faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
           faq.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <main className="stats-main">
      <div className="stats-container">
        {/* Banner */}
        <div className="stats-banner">
          <div>
            <h1 className="stats-title">{t('technicalSupport')}</h1>
            <p className="stats-subtitle">{t('supportSub')}</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
          {/* FAQ Section */}
          <div className="conversions-section" style={{ height: '100%' }}>
            <h3 className="section-subtitle">{language === 'en' ? 'Frequently Asked Questions' : '常见问题解答 (FAQ)'}</h3>
            <div className="search-box" style={{ margin: '10px 0 20px 0' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                placeholder={language === 'en' ? 'Search FAQs...' : '搜索常见问题...'}
                value={faqSearch}
                onChange={e => setFaqSearch(e.target.value)}
              />
            </div>

            <div className="quota-rules" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, i) => (
                  <div key={i} className="rule-item" style={{ borderRadius: 'var(--r)', border: '1px solid var(--border)' }}>
                    <div 
                      onClick={() => handleToggleFaq(i)}
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        cursor: 'pointer',
                        fontWeight: 600,
                        color: 'var(--t1)'
                      }}
                    >
                      <span>{faq.q}</span>
                      <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: faqOpen[i] ? 'rotate(90deg)' : 'none' }}>▶</span>
                    </div>
                    {faqOpen[i] && (
                      <div style={{ marginTop: '8px', color: 'var(--t2)', fontSize: '13px', borderTop: '1px solid var(--border)', paddingTop: '8px', lineHeight: '1.6' }}>
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="no-rules">{language === 'en' ? 'No matching FAQs found.' : '未找到匹配的常见问题。'}</p>
              )}
            </div>
          </div>

          {/* Ticket Submission Section */}
          <div className="conversions-section">
            <h3 className="section-subtitle">{language === 'en' ? 'Submit a Ticket' : '提交支持工单'}</h3>
            <form onSubmit={handleSubmitTicket} className="login-form" style={{ gap: '16px', marginTop: '16px' }}>
              <div className="field">
                <label>{language === 'en' ? 'Ticket Category' : '工单类型'}</label>
                <select className="sort-select" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Survey Issue">{language === 'en' ? 'Survey Issue' : '调查问卷问题'}</option>
                  <option value="Reward/Coins Credit">{language === 'en' ? 'Reward/Coins Credit' : '积分金币未到账'}</option>
                  <option value="Account Issue">{language === 'en' ? 'Account Issue' : '账号与登录问题'}</option>
                  <option value="Other / Feedback">{language === 'en' ? 'Other / Feedback' : '其他问题 / 意见反馈'}</option>
                </select>
              </div>

              <div className="field">
                <label>{t('subject')}</label>
                <input 
                  type="text" 
                  placeholder={language === 'en' ? 'Summarize the issue...' : '请简要描述您遇到的问题...'} 
                  style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--t1)', width: '100%', outline: 'none' }}
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  required 
                />
              </div>

              <div className="field">
                <label>{language === 'en' ? 'Message Detail' : '工单详细内容'}</label>
                <textarea 
                  placeholder={language === 'en' ? 'Describe your issue in detail...' : '请详细描述您遇到的问题以及重现步骤...'} 
                  style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--t1)', width: '100%', minHeight: '100px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn-primary-sm" style={{ alignSelf: 'flex-start', padding: '12px 24px', cursor: 'pointer' }}>
                {t('submit')}
              </button>
            </form>
          </div>
        </div>

        {/* User Tickets Log */}
        <div className="conversions-section" style={{ marginTop: '28px' }}>
          <h3 className="section-subtitle">{language === 'en' ? 'Your Support Tickets' : '您的历史工单记录'}</h3>
          {tickets.length === 0 ? (
            <p className="no-data-msg">{language === 'en' ? 'You have not submitted any support tickets yet.' : '您目前尚未提交过任何支持工单。'}</p>
          ) : (
            <div className="table-wrap">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>{language === 'en' ? 'Ticket ID' : '工单 ID'}</th>
                    <th>{language === 'en' ? 'Category' : '类型'}</th>
                    <th>{t('subject')}</th>
                    <th>{language === 'en' ? 'Submitted Time' : '提交时间'}</th>
                    <th>{t('status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td className="cell-main">{t.id}</td>
                      <td>{t.category === 'Survey Issue' ? (language === 'en' ? 'Survey Issue' : '调查问卷问题') :
                           t.category === 'Reward/Coins Credit' ? (language === 'en' ? 'Reward/Coins Credit' : '积分金币未到账') :
                           t.category === 'Account Issue' ? (language === 'en' ? 'Account Issue' : '账号与登录问题') :
                           (language === 'en' ? 'Other / Feedback' : '其他问题 / 意见反馈')}</td>
                      <td>{t.subject}</td>
                      <td className="cell-time">{t.date}</td>
                      <td>
                        <span className="status-badge-inline badge-success" style={{ background: 'rgba(139, 92, 246, 0.1)', color: 'var(--indigo)', borderColor: 'rgba(139, 92, 246, 0.2)' }}>
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
