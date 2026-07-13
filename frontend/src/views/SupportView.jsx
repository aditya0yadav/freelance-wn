import React, { useState, useEffect } from 'react';

const FAQS = [
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

export default function SupportView({ member, showToast }) {
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
      showToast("Please fill in all ticket details.", true);
      return;
    }

    const newTicket = {
      id: `TKT-${Math.floor(1000 + Math.random() * 9000)}`,
      subject: subject.trim(),
      category,
      message: message.trim(),
      status: 'Received',
      date: new Date().toLocaleString()
    };

    const updatedTickets = [newTicket, ...tickets];
    setTickets(updatedTickets);
    localStorage.setItem('rs_tickets', JSON.stringify(updatedTickets));

    showToast("Support ticket submitted successfully!");
    setSubject('');
    setMessage('');
  };

  const filteredFaqs = FAQS.filter(
    faq => faq.q.toLowerCase().includes(faqSearch.toLowerCase()) || 
           faq.a.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <main className="stats-main">
      <div className="stats-container">
        {/* Banner */}
        <div className="stats-banner">
          <div>
            <h1 className="stats-title">Help & Support Center</h1>
            <p className="stats-subtitle">Search common questions or submit a support ticket to our team.</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '28px', alignItems: 'start' }}>
          {/* FAQ Section */}
          <div className="conversions-section" style={{ height: '100%' }}>
            <h3 className="section-subtitle">Frequently Asked Questions</h3>
            <div className="search-box" style={{ margin: '10px 0 20px 0' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
              <input
                type="text"
                placeholder="Search FAQs..."
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
                <p className="no-rules">No matching FAQs found.</p>
              )}
            </div>
          </div>

          {/* Ticket Submission Section */}
          <div className="conversions-section">
            <h3 className="section-subtitle">Submit a Ticket</h3>
            <form onSubmit={handleSubmitTicket} className="login-form" style={{ gap: '16px', marginTop: '16px' }}>
              <div className="field">
                <label>Ticket Category</label>
                <select className="sort-select" style={{ width: '100%' }} value={category} onChange={e => setCategory(e.target.value)}>
                  <option value="Survey Issue">Survey Issue</option>
                  <option value="Reward/Coins Credit">Reward/Coins Credit</option>
                  <option value="Account Issue">Account Issue</option>
                  <option value="Other / Feedback">Other / Feedback</option>
                </select>
              </div>

              <div className="field">
                <label>Subject</label>
                <input 
                  type="text" 
                  placeholder="Summarize the issue..." 
                  style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--t1)', width: '100%', outline: 'none' }}
                  value={subject} 
                  onChange={e => setSubject(e.target.value)} 
                  required 
                />
              </div>

              <div className="field">
                <label>Message Detail</label>
                <textarea 
                  placeholder="Describe your issue in detail..." 
                  style={{ background: 'var(--input-bg)', border: '1.5px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 12px', color: 'var(--t1)', width: '100%', minHeight: '100px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  value={message} 
                  onChange={e => setMessage(e.target.value)} 
                  required 
                />
              </div>

              <button type="submit" className="btn-primary-sm" style={{ alignSelf: 'flex-start', padding: '12px 24px', cursor: 'pointer' }}>
                Submit Ticket
              </button>
            </form>
          </div>
        </div>

        {/* User Tickets Log */}
        <div className="conversions-section" style={{ marginTop: '28px' }}>
          <h3 className="section-subtitle">Your Support Tickets</h3>
          {tickets.length === 0 ? (
            <p className="no-data-msg">You have not submitted any support tickets yet.</p>
          ) : (
            <div className="table-wrap">
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Category</th>
                    <th>Subject</th>
                    <th>Submitted Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map(t => (
                    <tr key={t.id}>
                      <td className="cell-main">{t.id}</td>
                      <td>{t.category}</td>
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
