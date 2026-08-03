import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import './Auth.css';

function Login() {
  const [email,        setEmail]        = useState('');
  const [password,     setPassword]     = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (authService.isAuthenticated()) {
      navigate(authService.isAdmin() ? '/dashboard' : '/app', { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authService.login(email, password);
      navigate(response.user.role === 'admin' ? '/dashboard' : '/app');
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de la connexion. Vérifiez vos identifiants.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      <div className="auth-form-section">
        <div className="auth-form-container">
          <div className="auth-header">
            <h1 className="auth-title">
              Bienvenue<span className="title-dot">.</span>
            </h1>
            <p className="auth-subtitle">
              Pas encore de compte ?{' '}
              <Link to="/register" className="auth-link">S'inscrire</Link>
            </p>
          </div>

          {error && (
            <div className="auth-error">
              <svg className="error-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-field">
              <label htmlFor="email" className="field-label">Email</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="field-input"
                  placeholder="votre@email.com"
                  autoComplete="email"
                />
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="password" className="field-label">Mot de passe</label>
              <div className="input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field-input"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  ) : (
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Connexion en cours...' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>

      <div className="auth-image-section">
        <svg className="auth-illustration" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="150" cy="150" r="120" stroke="#FFFFFF" strokeWidth="2" opacity="0.3" />
          <circle cx="150" cy="150" r="100" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.2" />
          <ellipse cx="150" cy="150" rx="120" ry="40" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <ellipse cx="150" cy="150" rx="120" ry="80" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <ellipse cx="150" cy="150" rx="40" ry="120" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <ellipse cx="150" cy="150" rx="80" ry="120" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <circle cx="150" cy="90"  r="6" fill="#FFFFFF" />
          <circle cx="110" cy="130" r="6" fill="#FFFFFF" />
          <circle cx="190" cy="140" r="6" fill="#FFFFFF" />
          <circle cx="130" cy="180" r="6" fill="#FFFFFF" />
          <circle cx="180" cy="110" r="6" fill="#FFFFFF" />
          <path d="M 150 90 L 110 130"  stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          <path d="M 110 130 L 190 140" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          <path d="M 190 140 L 180 110" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          <path d="M 130 180 L 110 130" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          <g transform="translate(150, 150)">
            <circle cx="0" cy="0" r="25" fill="#FFFFFF" opacity="0.2" />
            <circle cx="0" cy="0" r="15" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="8"  fill="#6DBE45" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default Login;
