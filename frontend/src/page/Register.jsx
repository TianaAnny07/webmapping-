import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import './Auth.css';

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('visitor');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
const [username, setUsername] = useState('');
  useEffect(() => {
    // Si déjà connecté, rediriger
    if (authService.isAuthenticated()) {
      if (authService.isAdmin()) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/app', { replace: true });
      }
    }
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // const response = await authService.register(email, password, role);
      const response = await authService.register(email, password, role, username);
      
      if (response.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/app');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Échec de l\'inscription. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-layout">
      {/* Colonne gauche - Formulaire */}
      <div className="auth-form-section">
        <div className="auth-theme-toggle"><ThemeToggle /></div>
        <div className="auth-form-container">
          <div className="auth-header">
            <h1 className="auth-title">
              Créer un compte<span className="title-dot">.</span>
            </h1>
            <p className="auth-subtitle">
              Déjà membre ? <Link to="/login" className="auth-link">Se connecter</Link>
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
                />
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                </svg>
              </div>
            </div>


<div className="form-field">
  <label htmlFor="username" className="field-label">Nom d'utilisateur</label>
  <div className="input-wrapper">
    <input
      type="text"
      id="username"
      value={username}
      onChange={(e) => setUsername(e.target.value)}
      className="field-input"
      placeholder="Votre nom (optionnel)"
    />
    <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  </div>
</div>







            <div className="form-field">
              <label htmlFor="password" className="field-label">Mot de passe</label>
              <div className="input-wrapper">
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="field-input"
                  placeholder="••••••••"
                  minLength="6"
                />
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </div>

            <div className="form-field">
              <label htmlFor="role" className="field-label">Rôle</label>
              <div className="input-wrapper">
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  required
                  className="field-input field-select"
                >
                  <option value="visitor">Visiteur</option>
                  <option value="admin">Administrateur</option>
                </select>
                <svg className="input-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            </div>

            <button type="submit" className="btn-submit" disabled={loading}>
              {loading ? 'Inscription en cours...' : 'S\'inscrire'}
            </button>
          </form>
        </div>
      </div>

      {/* Colonne droite - Illustration SVG */}
      <div className="auth-image-section">
        <svg className="auth-illustration" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Globe/Cercle principal */}
          <circle cx="150" cy="150" r="120" stroke="#FFFFFF" strokeWidth="2" opacity="0.3" />
          <circle cx="150" cy="150" r="100" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.2" />
          
          {/* Lignes de latitude */}
          <ellipse cx="150" cy="150" rx="120" ry="40" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <ellipse cx="150" cy="150" rx="120" ry="80" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          
          {/* Ligne de longitude centrale */}
          <ellipse cx="150" cy="150" rx="40" ry="120" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <ellipse cx="150" cy="150" rx="80" ry="120" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          
          {/* Points de localisation sur le globe */}
          <circle cx="150" cy="90" r="6" fill="#FFFFFF" />
          <circle cx="110" cy="130" r="6" fill="#FFFFFF" />
          <circle cx="190" cy="140" r="6" fill="#FFFFFF" />
          <circle cx="130" cy="180" r="6" fill="#FFFFFF" />
          <circle cx="180" cy="110" r="6" fill="#FFFFFF" />
          
          {/* Lignes de connexion entre points */}
          <path d="M 150 90 L 110 130" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          <path d="M 110 130 L 190 140" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          <path d="M 190 140 L 180 110" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          <path d="M 130 180 L 110 130" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" strokeDasharray="3 3" />
          
          {/* Pin de localisation principal au centre */}
          <g transform="translate(150, 150)">
            <circle cx="0" cy="0" r="25" fill="#FFFFFF" opacity="0.2" />
            <circle cx="0" cy="0" r="15" fill="#FFFFFF" />
            <circle cx="0" cy="0" r="8" fill="#6DBE45" />
          </g>
        </svg>
      </div>
    </div>
  );
}

export default Register;
