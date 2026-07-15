# SurveyStream Admin Portal - 00. Frontend Shell & Architecture Overview

## 📋 Executive Summary
The **SurveyStream Admin Portal** is a high-fidelity, client-side administration panel designed to manage survey platforms, projects, currency settings, and team access. It uses modern React patterns (hooks, contexts, dynamic rendering) to create a dashboard interface.

The design is modeled after the premium, responsive **Wanhong Survey** management interface, incorporating:
*   Collapsible left navigation sidebar.
*   Dual-theme state control (Light and Dark Mode).
*   High-resolution browser zoom rendering.
*   Frosted glass visual elements (`backdrop-filter`).

---

## 🎨 Frontend Tech Stack & Dependencies
The admin portal frontend is built on the following technologies:
1.  **Vite + React**: Core framework for hot-module reloading and component trees.
2.  **React Router DOM**: Client-side routing with nested layout structures and auth guards.
3.  **Lucide React**: Vector icons library for sidebar, actions, and status badges.
4.  **Vanilla CSS Custom Properties (Design Tokens)**: Styling handles that adjust colors, dimensions, and transition durations automatically.

---

## 📂 Documentation Inventory (11-File Set)
This documentation is split into 11 files, providing code implementations for the design:

1.  **[01. Complete File & Directory Structure](file:///Users/aditya/Documents/freelance%20wn/admin_docs/01_file_structure.md)**  
    *Exact folder layouts and filename mappings.*
2.  **[02. Design System & CSS Tokens](file:///Users/aditya/Documents/freelance%20wn/admin_docs/02_design_system_css.md)**  
    *Global CSS rules, dark/light theme variables, resets, and layout styling.*
3.  **[03. Complete Layout Shell Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/03_layout_shell.md)**  
    *The main wrapper component (`AdminLayout.jsx`) routing panels and outlets.*
4.  **[04. Collapsible Sidebar Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/04_sidebar_component.md)**  
    *Collapsible navigation sidebar (`Sidebar.jsx`) with tooltips and responsive drawers.*
5.  **[05. Platform Directory Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/05_platform_page.md)**  
    *Platforms listing table (`PlatformListView.jsx`) with grid columns and action toggles.*
6.  **[06. Platform Configuration Modal Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/06_platform_modal.md)**  
    *The platform add/edit dialog overlay (`PlatformModal.jsx`) managing setup parameters.*
7.  **[07. Project Explorer Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/07_project_page.md)**  
    *Active survey query lists (`ProjectListView.jsx`) with multiple filtering criteria.*
8.  **[08. Currency Configuration Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/08_currency_page.md)**  
    *The currency modifiers table (`CurrencyListView.jsx`) managing points multipliers.*
9.  **[09. Team Authorization & Split Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/09_team_auth_page.md)**  
    *Managing publisher network splits (`TeamAuthListView.jsx`) and platform assignments.*
10. **[10. Analytics Dashboard Component](file:///Users/aditya/Documents/freelance%20wn/admin_docs/10_analytics_page.md)**  
    *The system dashboard dashboard view (`AnalyticsDashboard.jsx`) showing stats.*
11. **[11. Theme & Context Provider](file:///Users/aditya/Documents/freelance%20wn/admin_docs/11_theme_context.md)**  
    *Context provider (`AdminThemeContext.jsx`) handling light and dark theme toggles.*
