import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  Sparkles,
  Download,
  ExternalLink,
  CheckCircle2,
  Calendar,
  Layers,
  Monitor,
  Apple,
  Globe,
  Copy,
  Check
} from 'lucide-react';

export default function ModalAppUpdate({
  isOpen,
  onClose,
  updateInfo,
  onCheckAgain,
  checking
}) {
  const { language } = useLanguage();
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const release = updateInfo?.release || {};
  const hasUpdate = updateInfo?.hasUpdate;
  const currentVersion = updateInfo?.currentVersion || '1.0.0';
  const latestVersion = updateInfo?.latestVersion || currentVersion;

  const title = language === 'zh'
    ? (release.title_zh || release.title || `版本 ${latestVersion}`)
    : (release.title || `Version ${latestVersion}`);

  const notes = language === 'zh'
    ? (release.notes_zh || release.notes || [])
    : (release.notes || []);

  const downloadUrls = release.downloadUrls || {
    windows: release.releaseUrl || 'https://github.com/aditya0yadav/freelance-wn/releases/latest',
    mac: release.releaseUrl || 'https://github.com/aditya0yadav/freelance-wn/releases/latest',
    web: release.releaseUrl || 'https://github.com/aditya0yadav/freelance-wn/releases/latest'
  };

  const handleCopyLink = () => {
    const url = release.releaseUrl || 'https://github.com/aditya0yadav/freelance-wn/releases/latest';
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const openLink = (url) => {
    if (window.desktopApp?.openExternal) {
      window.desktopApp.openExternal(url);
    } else {
      window.open(url, '_blank', 'noreferrer');
    }
  };

  const t = {
    en: {
      updateAvailable: 'New Update Available',
      allUpToDate: 'App is Up to Date',
      allUpToDateDesc: `You are running the latest version (${currentVersion}). No new updates available right now.`,
      currentVer: 'Current',
      latestVer: 'Latest',
      releaseDate: 'Released',
      whatsNew: "What's New in This Release",
      downloadOptions: 'Download & Install Update',
      windowsApp: 'Windows App (.zip)',
      macApp: 'Mac App (.dmg)',
      webBundle: 'Web Server Bundle (.zip)',
      viewGitHub: 'View on GitHub Releases',
      copyLink: 'Copy Link',
      copied: 'Copied!',
      checkAgain: 'Check Again',
      checking: 'Checking GitHub...',
      close: 'Close'
    },
    zh: {
      updateAvailable: '发现新版本可用',
      allUpToDate: '已是最新版本',
      allUpToDateDesc: `当前运行版本为最新版 (${currentVersion})，暂无更新。`,
      currentVer: '当前版本',
      latestVer: '最新版本',
      releaseDate: '发布时间',
      whatsNew: '本次更新内容',
      downloadOptions: '下载更新安装包',
      windowsApp: 'Windows 客户端 (.zip)',
      macApp: 'Mac 客户端 (.dmg)',
      webBundle: 'Web 部署包 (wanhong-web.zip)',
      viewGitHub: '前往 GitHub 发布页面',
      copyLink: '复制链接',
      copied: '已复制!',
      checkAgain: '重新检查',
      checking: '正在连接 GitHub...',
      close: '关闭'
    }
  }[language || 'en'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box update-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '580px' }}>
        {/* Header */}
        <div className="modal-head" style={{ padding: '18px 22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className={`update-icon-circle ${hasUpdate ? 'pulse-update' : ''}`}>
              <Sparkles size={20} style={{ color: hasUpdate ? '#10b981' : 'var(--blue)' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
                {hasUpdate ? t.updateAvailable : t.allUpToDate}
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--t2)' }}>
                {hasUpdate
                  ? `${t.currentVer}: v${currentVersion} ➔ ${t.latestVer}: v${latestVersion}`
                  : `v${currentVersion}`}
              </p>
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {hasUpdate ? (
            <>
              {/* Release Header Banner */}
              <div className="update-banner-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--t1)' }}>
                    {title}
                  </div>
                  {release.releaseDate && (
                    <span className="update-date-badge">
                      <Calendar size={12} /> {release.releaseDate}
                    </span>
                  )}
                </div>
              </div>

              {/* What's New List */}
              {notes.length > 0 && (
                <div className="update-changelog-wrap">
                  <div className="update-section-title">
                    <Layers size={14} />
                    <span>{t.whatsNew}</span>
                  </div>
                  <div className="update-changelog-list">
                    {notes.map((note, idx) => (
                      <div key={idx} className="update-changelog-item">
                        <CheckCircle2 size={14} className="changelog-check-icon" />
                        <span>{note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Download Buttons Grid */}
              <div className="update-downloads-wrap">
                <div className="update-section-title">
                  <Download size={14} />
                  <span>{t.downloadOptions}</span>
                </div>
                <div className="update-downloads-grid">
                  <button
                    className="update-dl-btn dl-windows"
                    onClick={() => openLink(downloadUrls.windows || release.releaseUrl)}
                  >
                    <Monitor size={18} />
                    <div className="dl-btn-text">
                      <strong>Windows</strong>
                      <span>{t.windowsApp}</span>
                    </div>
                  </button>

                  <button
                    className="update-dl-btn dl-mac"
                    onClick={() => openLink(downloadUrls.mac || release.releaseUrl)}
                  >
                    <Apple size={18} />
                    <div className="dl-btn-text">
                      <strong>macOS</strong>
                      <span>{t.macApp}</span>
                    </div>
                  </button>

                  <button
                    className="update-dl-btn dl-web"
                    onClick={() => openLink(downloadUrls.web || release.releaseUrl)}
                  >
                    <Globe size={18} />
                    <div className="dl-btn-text">
                      <strong>Web Server</strong>
                      <span>{t.webBundle}</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Footer Actions */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn-update-subtle"
                  onClick={handleCopyLink}
                >
                  {copied ? <Check size={14} style={{ color: '#10b981' }} /> : <Copy size={14} />}
                  <span>{copied ? t.copied : t.copyLink}</span>
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    className="btn-update-primary"
                    onClick={() => openLink(release.releaseUrl || 'https://github.com/aditya0yadav/freelance-wn/releases/latest')}
                  >
                    <ExternalLink size={14} />
                    <span>{t.viewGitHub}</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Up to date view */
            <div style={{ textAlign: 'center', padding: '30px 10px' }}>
              <div style={{ display: 'inline-flex', padding: '16px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', marginBottom: '16px' }}>
                <CheckCircle2 size={40} />
              </div>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: 'var(--t1)' }}>
                {t.allUpToDate}
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--t2)', maxWidth: '380px', margin: '0 auto 24px auto', lineHeight: '1.5' }}>
                {t.allUpToDateDesc}
              </p>
              <button
                className="btn-primary-sm"
                onClick={onCheckAgain}
                disabled={checking}
                style={{ minWidth: '140px', justifyContent: 'center' }}
              >
                {checking ? t.checking : t.checkAgain}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
