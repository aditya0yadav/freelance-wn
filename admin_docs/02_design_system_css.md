# SurveyStream Admin Portal - 02. Complete Design System & CSS Tokens

This document contains the complete CSS styling system for the Admin Portal. Add these declarations to your global layout stylesheet (`frontend/src/index.css` or a dedicated `admin.css` file).

```css
/* ==========================================================================
   1. DESIGN TOKENS & SYSTEM VARIABLES
   ========================================================================== */
:root {
  /* Brand Theme Colors */
  --pm-accent: #10B981;              /* Pure Emerald Green */
  --pm-accent-deep: #059669;         /* Darker Emerald */
  --pm-accent-dark: #065F46;         /* Deep Forest Green */
  --pm-accent-mint: #6EE7B7;         /* Mint Accent Tint */
  --pm-accent-gradient: linear-gradient(135deg, #10B981 0%, #059669 100%);
  --pm-accent-glow: rgba(16, 185, 129, 0.30);
  
  /* Brand Accent Opacities */
  --pm-accent-bg: rgba(16, 185, 129, 0.08);
  --pm-accent-bg-hover: rgba(16, 185, 129, 0.12);
  --pm-border: rgba(16, 185, 129, 0.14);
  --pm-border-strong: rgba(16, 185, 129, 0.30);

  /* Status Colors */
  --pm-success: #10B981;
  --pm-danger: #F43F5E;             /* Rose Red */
  --pm-warning: #FFAB00;            /* Amber Yellow */
  --pm-info: #3B82F6;               /* Electric Blue */
  --pm-info-bg: rgba(59, 130, 246, 0.08);
  --pm-danger-bg: rgba(244, 63, 94, 0.08);
  --pm-warning-bg: rgba(255, 171, 0, 0.08);
  
  /* Fonts */
  --pm-font-main: 'Public Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

  /* Spacing */
  --sidebar-width: 264px;

  /* LIGHT MODE CONFIG (Default) */
  --pm-bg: #F8FAFC;                 /* Soft slate white */
  --pm-card: #FFFFFF;               /* Solid card white */
  --pm-sidebar: #FFFFFF;
  --pm-sidebar-hover: #F1F5F9;
  --pm-text-primary: #1E293B;       /* Deep slate grey */
  --pm-text-secondary: #64748B;     /* Muted slate grey */
  --pm-text-tertiary: #94A3B8;      /* Lighter labels */
  --pm-border-layout: #E2E8F0;      /* Thin light grey border */
  --pm-overlay: rgba(15, 23, 42, 0.4);
  --pm-shadow-sm: 0 1px 2px rgba(15, 23, 42, 0.05);
  --pm-shadow-md: 0 4px 12px rgba(15, 23, 42, 0.05);
  --pm-shadow-lg: 0 10px 25px rgba(15, 23, 42, 0.08);
  --pm-shadow-xl: 0 20px 40px rgba(15, 23, 42, 0.12);
  --pm-glass-bg: rgba(255, 255, 255, 0.85);
  --pm-glass-border: rgba(226, 232, 240, 0.8);
}

/* DARK MODE CONFIG */
[data-theme="dark"] {
  --pm-bg: #0B0F19;                 /* Absolute deep slate black */
  --pm-card: #151D30;               /* Dark Navy Cards */
  --pm-sidebar: #0F1626;            /* Deep sidebar background */
  --pm-sidebar-hover: #1E293B;
  --pm-text-primary: #F8FAFC;       /* Off-white text */
  --pm-text-secondary: #94A3B8;     /* Muted grey-blue */
  --pm-text-tertiary: #64748B;      /* Dim labels */
  --pm-border-layout: #1E293B;      /* Slate border */
  --pm-overlay: rgba(0, 0, 0, 0.7);
  --pm-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --pm-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --pm-shadow-lg: 0 10px 25px rgba(0, 0, 0, 0.5);
  --pm-shadow-xl: 0 20px 40px rgba(0, 0, 0, 0.6);
  --pm-glass-bg: rgba(21, 29, 48, 0.85);
  --pm-glass-border: rgba(30, 41, 59, 0.8);
}

/* ==========================================================================
   2. CORE GLOBAL RESET & HIGH-RESOLUTION LAYOUT SCALE
   ========================================================================== */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: var(--pm-font-main);
  background-color: var(--pm-bg);
  color: var(--pm-text-primary);
  line-height: 1.5;
  overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
}

/* High-resolution layout scaling for desktop screens */
@media (min-width: 1440px) {
  body {
    zoom: 0.90;
  }
}

/* ==========================================================================
   3. PREMIUM COMPONENTS (GLASSMORPHISM, BADGES, BUTTONS)
   ========================================================================== */
.premium-surface {
  background: var(--pm-glass-bg);
  backdrop-filter: blur(16px) saturate(120%);
  -webkit-backdrop-filter: blur(16px) saturate(120%);
  border: 1px solid var(--pm-glass-border);
  box-shadow: var(--pm-shadow-md);
  border-radius: 16px;
}

/* Core Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: var(--pm-font-main);
}

.btn-primary {
  background: var(--pm-accent-gradient);
  color: #FFFFFF;
  box-shadow: 0 4px 14px var(--pm-accent-glow);
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px var(--pm-accent-glow);
  filter: brightness(1.05);
}

.btn-secondary {
  background: var(--pm-card);
  border: 1px solid var(--pm-border-layout);
  color: var(--pm-text-primary);
  box-shadow: var(--pm-shadow-sm);
}

.btn-secondary:hover {
  background: var(--pm-sidebar-hover);
  color: var(--pm-text-primary);
}

.btn-danger {
  background: var(--pm-danger);
  color: #FFFFFF;
}

.btn-danger:hover {
  filter: brightness(1.1);
  transform: translateY(-1px);
}

/* Forms and Inputs */
.form-group {
  margin-bottom: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--pm-text-secondary);
}

.form-input, .form-select, .form-textarea {
  width: 100%;
  padding: 0.625rem 0.875rem;
  font-size: 0.875rem;
  background-color: var(--pm-bg);
  border: 1px solid var(--pm-border-layout);
  border-radius: 8px;
  color: var(--pm-text-primary);
  outline: none;
  font-family: var(--pm-font-main);
  transition: all 0.2s ease;
}

.form-input:focus, .form-select:focus, .form-textarea:focus {
  border-color: var(--pm-accent);
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
}

.form-textarea {
  min-height: 100px;
  resize: vertical;
}

/* Data Tables */
.table-container {
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid var(--pm-border-layout);
  background: var(--pm-card);
}

.admin-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.875rem;
}

.admin-table th {
  background-color: var(--pm-bg);
  color: var(--pm-text-secondary);
  font-weight: 600;
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--pm-border-layout);
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
}

.admin-table td {
  padding: 1rem;
  border-bottom: 1px solid var(--pm-border-layout);
  color: var(--pm-text-primary);
}

.admin-table tr:last-child td {
  border-bottom: none;
}

.admin-table tr:hover td {
  background-color: var(--pm-sidebar-hover);
}

/* Status Badges */
.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-success {
  background-color: var(--pm-accent-bg);
  color: var(--pm-success);
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.badge-danger {
  background-color: var(--pm-danger-bg);
  color: var(--pm-danger);
  border: 1px solid rgba(244, 63, 94, 0.2);
}

.badge-warning {
  background-color: var(--pm-warning-bg);
  color: var(--pm-warning);
  border: 1px solid rgba(255, 171, 0, 0.2);
}

.badge-info {
  background-color: var(--pm-info-bg);
  color: var(--pm-info);
  border: 1px solid rgba(59, 130, 246, 0.2);
}

/* Interactive switches */
.switch-container {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  cursor: pointer;
  user-select: none;
}

.switch-control {
  position: relative;
  width: 44px;
  height: 24px;
  background-color: var(--pm-border-layout);
  border-radius: 9999px;
  transition: background-color 0.2s ease;
}

.switch-control::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  background-color: #FFFFFF;
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.switch-container.active .switch-control {
  background-color: var(--pm-accent);
}

.switch-container.active .switch-control::after {
  transform: translateX(20px);
}

/* Dialog Modals */
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--pm-overlay);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.dialog-modal {
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  background: var(--pm-card);
  border: 1px solid var(--pm-border-layout);
  border-radius: 20px;
  box-shadow: var(--pm-shadow-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalScaleUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes modalScaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.dialog-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--pm-border-layout);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.dialog-footer {
  padding: 1.25rem 1.5rem;
  border-top: 1px solid var(--pm-border-layout);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background-color: var(--pm-bg);
}
```
