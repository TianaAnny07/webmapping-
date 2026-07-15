import React from 'react';

function LogoutConfirm({ onConfirm, onCancel }) {
  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={onCancel}
    >
      <div
        style={{
          background: '#fff', borderRadius: '14px', padding: '24px',
          width: '320px', maxWidth: '90vw', boxShadow: '0 10px 30px rgba(0,0,0,0.3)', textAlign: 'center',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          width: '52px', height: '52px', borderRadius: '50%', background: '#fff5f5', color: '#e74c3c',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', margin: '0 auto 14px',
        }}>
          <i className="bi bi-box-arrow-right"></i>
        </div>
        <div style={{ fontWeight: 700, fontSize: '16px', color: '#1a1a2e', marginBottom: '6px' }}>
          Se déconnecter ?
        </div>
        <div style={{ fontSize: '13px', color: '#888', marginBottom: '20px' }}>
          Voulez-vous vraiment vous déconnecter ?
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f4f6f9', color: '#555', cursor: 'pointer', fontSize: '13px' }}>
            Annuler
          </button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', background: '#e74c3c', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutConfirm;