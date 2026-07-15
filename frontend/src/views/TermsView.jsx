import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsView() {
  const navigate = useNavigate();
  return (
    <div className="legal-page">
      <div className="legal-hero">
        <button className="legal-back-btn" onClick={() => navigate(-1)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          Back
        </button>
        <div className="legal-hero-badge">Terms &amp; Conditions</div>
        <h1 className="legal-hero-title">Rules of Engagement</h1>
        <p className="legal-hero-sub">Last updated: July 2025 &nbsp;·&nbsp; Please read carefully before using the platform</p>
      </div>

      <div className="legal-body">
        <div className="legal-toc">
          <h3>Contents</h3>
          <ol>
            <li><a href="#t1">Acceptance of Terms</a></li>
            <li><a href="#t2">Eligibility</a></li>
            <li><a href="#t3">Account Responsibilities</a></li>
            <li><a href="#t4">Coin Rewards &amp; Redemption</a></li>
            <li><a href="#t5">Prohibited Conduct</a></li>
            <li><a href="#t6">Intellectual Property</a></li>
            <li><a href="#t7">Disclaimers &amp; Liability</a></li>
            <li><a href="#t8">Termination</a></li>
            <li><a href="#t9">Governing Law</a></li>
            <li><a href="#t10">Changes to These Terms</a></li>
          </ol>
        </div>

        <div className="legal-content">
          <section id="t1">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using the Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD platform ("Service"), you agree to be bound by these Terms &amp; Conditions ("Terms"). If you do not agree, please discontinue use immediately. Your continued use after any modification constitutes acceptance of the updated Terms.</p>
          </section>

          <section id="t2">
            <h2>2. Eligibility</h2>
            <p>Access to Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD is granted exclusively to individuals who have been onboarded by an authorised team administrator. The platform is intended for professional market-research panellist teams and is not open to the general public. You must be at least 18 years old to participate.</p>
          </section>

          <section id="t3">
            <h2>3. Account Responsibilities</h2>
            <ul>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You agree to notify your administrator immediately upon discovering any unauthorised use of your account.</li>
              <li>Each member may hold only one account. Duplicate accounts will be terminated without notice.</li>
              <li>You are solely responsible for all activity that occurs under your account.</li>
            </ul>
          </section>

          <section id="t4">
            <h2>4. Coin Rewards &amp; Redemption</h2>
            <p>Coins are virtual incentive points with no cash value unless otherwise stated by your team administrator:</p>
            <ul>
              <li>Coins are credited only for <strong>genuine, completed</strong> survey or offerwall actions verified by the respective network partner.</li>
              <li>Coins may be adjusted, corrected, or revoked if a reversal or quality flag is issued by a network partner.</li>
              <li>Redemption methods, minimum thresholds, and processing times are determined by your team administrator.</li>
              <li>Unused coins may expire after 12 months of account inactivity.</li>
            </ul>
          </section>

          <section id="t5">
            <h2>5. Prohibited Conduct</h2>
            <p>The following actions are strictly prohibited and may result in immediate account suspension:</p>
            <ul>
              <li>Submitting false, fraudulent, or low-quality survey responses.</li>
              <li>Using bots, scripts, VPNs, or automated tools to generate completions.</li>
              <li>Sharing account credentials or survey links with unauthorised parties.</li>
              <li>Attempting to reverse-engineer, bypass, or exploit any part of the platform.</li>
              <li>Harassing, threatening, or abusing other team members or platform staff.</li>
            </ul>
          </section>

          <section id="t6">
            <h2>6. Intellectual Property</h2>
            <p>All content, designs, logos, and software comprising the Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD platform are the exclusive property of Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD and its licensors. You may not reproduce, distribute, or create derivative works without express written permission.</p>
          </section>

          <section id="t7">
            <h2>7. Disclaimers &amp; Liability</h2>
            <p>The Service is provided <strong>"as is"</strong> without warranties of any kind. Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD shall not be liable for:</p>
            <ul>
              <li>Loss of earnings arising from survey disqualifications or quota closures.</li>
              <li>Interruptions in service due to maintenance, network issues, or force majeure.</li>
              <li>Actions taken by third-party survey network partners.</li>
            </ul>
            <p>In no event shall our aggregate liability exceed the total coins earned by you in the 30 days preceding a claim.</p>
          </section>

          <section id="t8">
            <h2>8. Termination</h2>
            <p>Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD reserves the right to suspend or permanently terminate any account that violates these Terms, at our sole discretion, with or without prior notice. Upon termination, accumulated coins may be forfeited if the termination is due to violation of these Terms.</p>
          </section>

          <section id="t9">
            <h2>9. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which Wanhong Survey by XUZHOU WEIJINGJUYAN TECHNOLOGY CO.,LTD is registered, without regard to its conflict-of-law provisions.</p>
          </section>

          <section id="t10">
            <h2>10. Changes to These Terms</h2>
            <p>We may update these Terms at any time. Significant changes will be communicated through the platform or email. Continued use of the Service after changes take effect constitutes your acceptance of the revised Terms.</p>
            <p>Questions? Visit the <button className="legal-link-btn" onClick={() => navigate('/support')}>Support Centre</button>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
