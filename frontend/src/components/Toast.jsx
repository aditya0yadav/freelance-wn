import React from 'react';

export default function Toast({ toast }) {
  if (!toast.visible) return null;
  return (
    <div className={`toast-bar ${toast.error ? 'toast-error' : 'toast-success'}`}>
      <span className="toast-icon">{toast.error ? '⚠' : '✓'}</span>
      <span>{toast.message}</span>
    </div>
  );
}
