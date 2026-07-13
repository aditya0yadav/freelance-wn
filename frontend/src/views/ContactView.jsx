import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function ContactView() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real implementation this would POST to the backend
    setSent(true);
  };

  return (
    <div className="legal-page">
      <div className="legal-hero">
        <button className="legal-back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="legal-hero-badge">Contact Us</div>
        <h1 className="legal-hero-title">Get in Touch</h1>
        <p className="legal-hero-sub">We're here to help — reach out and we'll get back to you within 1–2 business days</p>
      </div>

      <div className="contact-layout">
        {/* Info cards */}
        <div className="contact-info">
          <div className="contact-info-card">
            <div className="contact-info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </div>
            <div>
              <h4>Email</h4>
              <p>support@surveyspecter.com</p>
            </div>
          </div>
          <div className="contact-info-card">
            <div className="contact-info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <div>
              <h4>Response Time</h4>
              <p>1–2 business days</p>
            </div>
          </div>
          <div className="contact-info-card">
            <div className="contact-info-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div>
              <h4>Live Support</h4>
              <p><button className="legal-link-btn" onClick={() => navigate('/support')}>Visit Support Centre →</button></p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="contact-form-wrap">
          {sent ? (
            <div className="contact-success">
              <div className="contact-success-icon">✓</div>
              <h3>Message Sent!</h3>
              <p>Thank you for reaching out. We'll get back to you within 1–2 business days.</p>
              <button className="contact-success-btn" onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                Send Another
              </button>
            </div>
          ) : (
            <form className="contact-form" onSubmit={handleSubmit}>
              <h3>Send a Message</h3>
              <div className="contact-row">
                <div className="field">
                  <label htmlFor="c-name">Full Name</label>
                  <div className="input-wrapper">
                    <input
                      id="c-name"
                      type="text"
                      placeholder="Your name"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      required
                    />
                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="c-email">Email Address</label>
                  <div className="input-wrapper">
                    <input
                      id="c-email"
                      type="email"
                      placeholder="you@example.com"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      required
                    />
                    <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                </div>
              </div>
              <div className="field">
                <label htmlFor="c-subject">Subject</label>
                <div className="input-wrapper">
                  <input
                    id="c-subject"
                    type="text"
                    placeholder="What is this about?"
                    value={form.subject}
                    onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                    required
                  />
                  <svg className="input-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                </div>
              </div>
              <div className="field">
                <label htmlFor="c-message">Message</label>
                <textarea
                  id="c-message"
                  className="contact-textarea"
                  placeholder="Describe your question or issue in detail..."
                  value={form.message}
                  onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                  rows={5}
                  required
                />
              </div>
              <button type="submit" className="btn-login">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
