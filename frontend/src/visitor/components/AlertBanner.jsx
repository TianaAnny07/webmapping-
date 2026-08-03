import React, { useState } from 'react';

const CONFIG = {
  warning: {
    icon:       'bi-exclamation-triangle-fill',
    accent:     '#f59e0b',
    bg:         'rgba(254, 243, 199, 0.95)',
    border:     '#fcd34d',
    textColor:  '#92400e',
    btnBg:      '#f59e0b',
  },
  error: {
    icon:       'bi-x-circle-fill',
    accent:     '#ef4444',
    bg:         'rgba(254, 226, 226, 0.95)',
    border:     '#fca5a5',
    textColor:  '#991b1b',
    btnBg:      '#ef4444',
  },
  success: {
    icon:       'bi-check-circle-fill',
    accent:     '#22c55e',
    bg:         'rgba(220, 252, 231, 0.95)',
    border:     '#86efac',
    textColor:  '#166534',
    btnBg:      '#22c55e',
  },
  info: {
    icon:       'bi-info-circle-fill',
    accent:     '#3b82f6',
    bg:         'rgba(219, 234, 254, 0.95)',
    border:     '#93c5fd',
    textColor:  '#1e40af',
    btnBg:      '#3b82f6',
  },
};

function AlertBanner({ message, variant = 'warning', onDismiss, onAction, actionLabel }) {
  const [visible, setVisible] = useState(true);

  if (!message || !visible) return null;

  const cfg = CONFIG[variant] || CONFIG.warning;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  return (
    <div
      className={`alert-banner alert-banner--${variant}`}
      role="alert"
      style={{
        background:   cfg.bg,
        borderColor:  cfg.border,
        color:        cfg.textColor,
      }}
    >
      {/* Icône dans bulle */}
      <div
        className="alert-banner__icon-wrap"
        style={{ background: cfg.accent }}
      >
        <i className={`bi ${cfg.icon}`}></i>
      </div>

      {/* Texte */}
      <span className="alert-banner__text">{message}</span>

      {/* Bouton action */}
      {onAction && (
        <button
          className="alert-banner__action"
          onClick={onAction}
          style={{ background: cfg.btnBg }}
        >
          <i className="bi bi-arrow-repeat"></i>
          <span>{actionLabel || 'Recalculer'}</span>
        </button>
      )}

      {/* Fermer */}
      {onDismiss && (
        <button
          className="alert-banner__close"
          onClick={handleDismiss}
          aria-label="Fermer"
          style={{ color: cfg.textColor }}
        >
          <i className="bi bi-x-lg"></i>
        </button>
      )}
    </div>
  );
}

export default AlertBanner;
