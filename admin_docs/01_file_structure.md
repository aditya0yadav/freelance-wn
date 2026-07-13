# SurveyStream Admin Portal - 01. Complete File & Directory Structure

To build a clean, modular admin portal, the code must be structured inside a dedicated `/admin` folder namespace within the React frontend codebase. Below is the precise directory and file layout down to individual files:

## 📁 Directory Tree
```
frontend/src/
├── App.jsx                               # Modified: Handles root/admin routing
├── index.css                             # Modified: Contains theme CSS variables
├── admin/                                # New: Admin namespace directory
│   ├── components/                       # Shared admin components
│   │   ├── AdminLayout.jsx               # Dashboard parent shell layout
│   │   ├── Sidebar.jsx                   # Collapsible left navigation
│   │   ├── Topbar.jsx                    # Header (search, user actions, theme toggle)
│   │   └── StarRating.jsx                # Interactive level rating component (1-5 stars)
│   ├── context/                          # Admin context providers
│   │   └── AdminThemeContext.jsx         # Theme provider (handles light/dark modes)
│   └── views/                            # Admin page views
│       ├── AdminLoginView.jsx            # Admin login screen
│       ├── AnalyticsDashboard.jsx        # Dashboard overview charts & counters
│       ├── PlatformListView.jsx          # Platforms listing & action logs
│       ├── PlatformModal.jsx             # Add/Edit platform form overlay
│       ├── ProjectListView.jsx           # Survey project database list
│       ├── CurrencyListView.jsx          # Exchange rates and tokens manager
│       └── TeamAuthListView.jsx          # Assigning teams and commission rates
```

---

## 📄 File Profiles & Details

### 1. Root Configuration Files
*   **`frontend/src/App.jsx`**: Handles client-side routing. It registers public login paths and sets up a React Router guard to protect the `/admin/dashboard` sub-paths.
*   **`frontend/src/index.css`**: Defines color keys, layout widths, spacing rules, font overrides, and theme selectors.

### 2. Shared Layout Components (`admin/components/`)
*   **`AdminLayout.jsx`**: Manages the grid container, sidebar state, topbar sizing, and renders page content within an `<Outlet />` wrapper.
*   **`Sidebar.jsx`**: Toggles between collapsed (72px) and expanded (264px) widths. Displays page icons, badges, and log out options.
*   **`Topbar.jsx`**: Displays page titles, search inputs, language selectors, and the user profile dropdown menu.
*   **`StarRating.jsx`**: Renders editable star ratings (using Lucide icons) for platform quality configuration forms.

### 3. Application Contexts (`admin/context/`)
*   **`AdminThemeContext.jsx`**: Sets up state-driven triggers that append the `data-theme` attribute to the document element, persisting user selections inside local storage.

### 4. Admin Views & Forms (`admin/views/`)
*   **`AdminLoginView.jsx`**: Provides a styled form interface for admin login actions.
*   **`AnalyticsDashboard.jsx`**: Renders traffic grids, completion metrics, and transaction tables.
*   **`PlatformListView.jsx`**: Renders platform details inside search-supported data tables.
*   **`PlatformModal.jsx`**: Renders the editor overlay containing form inputs for all platform variables.
*   **`ProjectListView.jsx`**: Renders the survey explorer, including options to filter records by status and search terms.
*   **`CurrencyListView.jsx`**: Renders the currency mapping panel.
*   **`TeamAuthListView.jsx`**: Renders access lists, authorization rate forms, and team mappings.
