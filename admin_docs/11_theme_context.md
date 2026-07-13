# SurveyStream Admin Portal - 11. Theme & Context Provider

This document contains the complete JSX source code for the theme manager context (`frontend/src/admin/context/AdminThemeContext.jsx`). It coordinates state changes, updates HTML attributes, and persists preferences.

```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';

// Create Theme Context
const AdminThemeContext = createContext(null);

export function AdminThemeProvider({ children }) {
  // Read theme setting from storage (defaults to 'dark' for premium styling)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('admin_theme') || 'dark';
  });

  // Sync theme changes to the DOM and storage
  useEffect(() => {
    const rootElement = document.documentElement;
    
    // Update data-theme selector attribute
    if (theme === 'dark') {
      rootElement.setAttribute('data-theme', 'dark');
    } else {
      rootElement.removeAttribute('data-theme');
    }
    
    localStorage.setItem('admin_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <AdminThemeContext.Provider value={{ theme, setTheme, toggleTheme, isDarkMode: theme === 'dark' }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

// React Hook to access theme state context variables
export function useAdminTheme() {
  const context = useContext(AdminThemeContext);
  if (!context) {
    throw new Error('useAdminTheme must be used within an AdminThemeProvider.');
  }
  return context;
}
```
