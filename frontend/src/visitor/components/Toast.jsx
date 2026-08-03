// src/visitor/components/Toast.jsx

import React, { useEffect, useState } from 'react';

const ICONS = {
  success: 'bi-check-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
  error:   'bi-x-circle-fill',
  info:    'bi-info-circle-fill',
};

function Toast({ message, variant = 'success', duration = 3000, onDismiss }) {
  const [phase, setPhase] = useState('enter'); // enter | idle | exit

  useEffect(() => {
    const idleTimer = setTimeout(() => setPhase('exit'), duration);
    return () => clearTimeout(idleTimer);
  }, [duration]);

  useEffect(() => {
    if (phase === 'exit') {
      const t = setTimeout(() => onDismiss?.(), 320);
      return () => clearTimeout(t);
    }
  }, [phase, onDismiss]);

  const dismiss = () => {
    setPhase('exit');
  };

  // Nettoyer les emojis éventuels restants dans le message
  const cleanMessage = typeof message === 'string'
    ? message.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim()
    : message;

  return (
    <div className={`toast toast--${variant} toast--${phase}`} role="alert" aria-live="polite">
      <div className="toast__icon">
        <i className={`bi ${ICONS[variant] || ICONS.info}`}></i>
      </div>
      <span className="toast__message">{cleanMessage}</span>
      <button className="toast__close" onClick={dismiss} aria-label="Fermer">
        <i className="bi bi-x"></i>
      </button>
      <div
        className="toast__progress"
        style={{ animationDuration: `${duration}ms` }}
      />
    </div>
  );
}

export default Toast;
