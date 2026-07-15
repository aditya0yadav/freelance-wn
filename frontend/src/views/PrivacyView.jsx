import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyView() {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <div className="legal-hero">
        <button className="legal-back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="legal-hero-badge">Privacy Policy</div>
        <h1 className="legal-hero-title">Your Privacy Matters</h1>
        <p className="legal-hero-sub">Last updated: July 2025 &nbsp;·&nbsp; Effective immediately</p>
      </div>

      <div className="legal-body">
        <div className="legal-toc">
          <h3>Contents</h3>
          <ol>
            <li><a href="#s1">Information We Collect</a></li>
            <li><a href="#s2">How We Use Your Data</a></li>
            <li><a href="#s3">Data Sharing &amp; Disclosure</a></li>
            <li><a href="#s4">Cookies &amp; Tracking</a></li>
            <li><a href="#s5">Data Retention</a></li>
            <li><a href="#s6">Your Rights</a></li>
            <li><a href="#s7">Security</a></li>
            <li><a href="#s8">Contact Us</a></li>
          </ol>
        </div>

        <div className="legal-content">
          <section id="s1">
            <h2>1. Information We Collect</h2>
            <p>Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD collects information that you provide directly and data generated through your use of the platform:</p>
            <ul>
              <li><strong>Account data</strong> – nickname, hashed password, and team affiliation supplied during account creation.</li>
              <li><strong>Activity data</strong> – survey completions, offer interactions, coins earned, and timestamp of each action.</li>
              <li><strong>Technical data</strong> – IP address, browser type, device identifiers, and session logs collected automatically when you access the platform.</li>
            </ul>
            <p>We do <em>not</em> collect sensitive personal information such as government-issued IDs, financial account numbers, or biometric data.</p>
          </section>

          <section id="s2">
            <h2>2. How We Use Your Data</h2>
            <p>Your data is used exclusively to operate and improve the Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD service:</p>
            <ul>
              <li>Authenticate your account and maintain secure sessions.</li>
              <li>Credit coins for completed surveys and offerwall actions.</li>
              <li>Generate leaderboard rankings and team statistics.</li>
              <li>Detect and prevent fraudulent or abusive behaviour.</li>
              <li>Improve platform performance and personalise your experience.</li>
              <li>Communicate service updates and important notices.</li>
            </ul>
          </section>

          <section id="s3">
            <h2>3. Data Sharing &amp; Disclosure</h2>
            <p>We do not sell your personal data. We may share limited information with:</p>
            <ul>
              <li><strong>Survey network partners</strong> – project codes and completion tokens required to validate rewards. No personal identifiers are passed.</li>
              <li><strong>Infrastructure providers</strong> – cloud hosting and database services that process data on our behalf under strict data-processing agreements.</li>
              <li><strong>Legal authorities</strong> – when required by applicable law, court order, or government regulation.</li>
            </ul>
          </section>

          <section id="s4">
            <h2>4. Cookies &amp; Tracking</h2>
            <p>Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD uses only <strong>essential</strong> cookies and browser local-storage tokens to:</p>
            <ul>
              <li>Maintain your authenticated session (JWT stored in <code>localStorage</code>).</li>
              <li>Remember your UI preferences such as light/dark mode.</li>
            </ul>
            <p>We do not use third-party advertising cookies or cross-site tracking pixels.</p>
          </section>

          <section id="s5">
            <h2>5. Data Retention</h2>
            <p>Account and activity data is retained for as long as your account is active plus a 90-day grace period after closure. Anonymised aggregate statistics may be retained indefinitely for business-intelligence purposes.</p>
          </section>

          <section id="s6">
            <h2>6. Your Rights</h2>
            <p>Depending on your jurisdiction you may have the right to:</p>
            <ul>
              <li>Access a copy of the personal data we hold about you.</li>
              <li>Request correction of inaccurate information.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Object to or restrict certain processing activities.</li>
            </ul>
            <p>To exercise any of these rights please contact your team administrator or reach us via the Support Centre.</p>
          </section>

          <section id="s7">
            <h2>7. Security</h2>
            <p>We protect your data with industry-standard safeguards including TLS encryption in transit, bcrypt password hashing, and role-based access controls. While we take every reasonable precaution, no system is completely immune to risk and we encourage you to keep your credentials confidential.</p>
          </section>

          <section id="s8">
            <h2>8. Contact Us</h2>
            <p>Questions about this policy? Reach us through the <button className="legal-link-btn" onClick={() => navigate('/support')}>Support Centre</button> or ask your team administrator. We will respond within 5 business days.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
