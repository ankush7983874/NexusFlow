import React from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, CheckCircle, Info, X } from 'lucide-react';

export const ToastContainer = () => {
  const { toasts } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        zIndex: 9999,
        maxWidth: 420
      }}
    >
      {toasts.map(toast => {
        const isDanger = toast.type === 'danger';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            style={{
              background: isDanger ? '#fee2e2' : isSuccess ? '#ecfdf5' : '#ffffff',
              color: isDanger ? '#991b1b' : isSuccess ? '#065f46' : '#0f172a',
              border: `1px solid ${isDanger ? '#fca5a5' : isSuccess ? '#a7f3d0' : '#cbd5e1'}`,
              borderRadius: 10,
              padding: '12px 16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
              fontWeight: 500,
              animation: 'modal-pop 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {isDanger ? <AlertTriangle size={18} color="#dc2626" /> : isSuccess ? <CheckCircle size={18} color="#059669" /> : <Info size={18} color="#4f46e5" />}
            <span style={{ flex: 1 }}>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
