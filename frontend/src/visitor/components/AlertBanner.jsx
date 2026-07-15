import React from 'react';

function AlertBanner({ message, variant = 'warning', onDismiss, onAction, actionLabel }) {
  if (!message) return null;

  return (
    <div className={`visitor-alert visitor-alert--${variant}`} role="alert">
      <i className={`bi ${variant === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'}`}></i>
      <span className="visitor-alert__text">{message}</span>
      {onAction && (
        <button className="visitor-alert__action" onClick={onAction}>
          {actionLabel || 'Recalculer'}
        </button>
      )}
      {onDismiss && (
        <button className="visitor-alert__close" onClick={onDismiss} aria-label="Fermer">
          <i className="bi bi-x-lg"></i>
        </button>
      )}
    </div>
  );
}

export default AlertBanner;
