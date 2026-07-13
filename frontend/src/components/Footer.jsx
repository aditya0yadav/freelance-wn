import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function Footer() {
  const navigate = useNavigate();
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer">
      <div className="footer-inner">
        {/* Brand column */}
        <div className="footer-brand">
          <div className="footer-logo" onClick={() => navigate('/')} title="Go to home">
            <img src="/images/logo.png" alt="XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD" className="footer-logo-img" />
            <span className="footer-brand-name">XUZHOU WEIJINGJUYAN</span>
          </div>
          <p className="footer-tagline">
            The professional survey &amp; offerwall management portal for <strong>XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD</strong>. Empowering market-research teams to track, optimise, and reward their performance — all in one place.
          </p>
          <div className="footer-socials">
            <a className="footer-social-btn" href="mailto:support@surveyspecter.com" title="Email us" aria-label="Email">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            </a>
          </div>
        </div>

        {/* Platform links */}
        <div className="footer-col">
          <h4 className="footer-col-title">Platform</h4>
          <ul className="footer-links">
            <li><button onClick={() => navigate('/')}>Dashboard</button></li>
            <li><button onClick={() => navigate('/statistics')}>Statistics</button></li>
            <li><button onClick={() => navigate('/leaderboard')}>Leaderboard</button></li>
            <li><button onClick={() => navigate('/support')}>Support Centre</button></li>
          </ul>
        </div>

        {/* Legal links */}
        <div className="footer-col">
          <h4 className="footer-col-title">Legal</h4>
          <ul className="footer-links">
            <li><button onClick={() => navigate('/privacy')}>Privacy Policy</button></li>
            <li><button onClick={() => navigate('/terms')}>Terms &amp; Conditions</button></li>
            <li><button onClick={() => navigate('/contact')}>Contact Us</button></li>
          </ul>
        </div>

        {/* Company info */}
        <div className="footer-col">
          <h4 className="footer-col-title">Company</h4>
          <ul className="footer-links footer-info-list">
            <li>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
              China
            </li>
            <li>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              support@surveyspecter.com
            </li>
            <li>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Mon–Fri, 9 AM – 6 PM IST
            </li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {year} XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD. All rights reserved.</span>
        <div className="footer-bottom-links">
          <button onClick={() => navigate('/privacy')}>Privacy</button>
          <span className="footer-dot">·</span>
          <button onClick={() => navigate('/terms')}>Terms</button>
          <span className="footer-dot">·</span>
          <button onClick={() => navigate('/contact')}>Contact</button>
        </div>
      </div>
    </footer>
  );
}
