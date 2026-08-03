import React, { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { formatDistance, formatDuration } from '../utils/geo';
import './DistancePanel.css';

const MODES = [
  { key: 'walking', label: 'À pied',  icon: 'bi-person-walking' },
  { key: 'cycling', label: 'Moto',    icon: 'bi-scooter'        },
  { key: 'driving', label: 'Voiture', icon: 'bi-car-front-fill' },
];

/* Recherche Nominatim avec debounce */
async function searchNominatim(query) {
  if (!query || query.trim().length < 2) return [];
  const { data } = await axios.get('https://nominatim.openstreetmap.org/search', {
    params: {
      q: query,
      format: 'json',
      limit: 5,
      countrycodes: 'mg',        // priorité Madagascar
      'accept-language': 'fr',
    },
    headers: { 'Accept-Language': 'fr' },
  });
  return data.map((r) => ({
    label: r.display_name,
    coords: [parseFloat(r.lat), parseFloat(r.lon)],
  }));
}

/* Champ de recherche avec suggestions */
function LocationInput({ badge, placeholder, value, onSelect, disabled }) {
  const [query, setQuery]         = useState(value?.label || '');
  const [suggestions, setSugg]    = useState([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const timerRef                  = useRef(null);
  const wrapRef                   = useRef(null);

  // Fermer si clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Sync label si le point est réinitialisé depuis l'extérieur
  useEffect(() => {
    if (!value) setQuery('');
  }, [value]);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    clearTimeout(timerRef.current);
    if (q.trim().length < 2) { setSugg([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchNominatim(q);
        setSugg(results);
        setOpen(results.length > 0);
      } catch {
        setSugg([]);
      } finally {
        setLoading(false);
      }
    }, 400);
  };

  const handleSelect = (item) => {
    setQuery(item.label.split(',')[0]); // afficher juste le nom court
    setSugg([]);
    setOpen(false);
    onSelect(item.coords, item.label.split(',')[0]);
  };

  const handleClear = () => {
    setQuery('');
    setSugg([]);
    setOpen(false);
    onSelect(null, '');
  };

  return (
    <div className="dp__input-wrap" ref={wrapRef}>
      <div className={`dp__input-row ${disabled ? 'dp__input-row--disabled' : ''}`}>
        <span className={`dp__input-badge dp__input-badge--${badge.toLowerCase()}`}>{badge}</span>
        <input
          className="dp__input"
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={handleChange}
          disabled={disabled}
          autoComplete="off"
        />
        {loading && <i className="bi bi-arrow-repeat spin dp__input-spin"></i>}
        {query && !loading && (
          <button className="dp__input-clear" onClick={handleClear} tabIndex={-1}>
            <i className="bi bi-x"></i>
          </button>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul className="dp__suggestions">
          {suggestions.map((s, i) => (
            <li key={i} className="dp__suggestion" onMouseDown={() => handleSelect(s)}>
              <i className="bi bi-geo-alt-fill"></i>
              <span>{s.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* Panneau principal */
function DistancePanel({ pointA, pointB, straightLineKm, route, loading, error, onComputeRoute, onReset, onClose, onSetPoint }) {
  const [selectedMode, setSelectedMode] = useState('driving');
  const [labelA, setLabelA] = useState('');
  const [labelB, setLabelB] = useState('');

  const step = !pointA ? 1 : !pointB ? 2 : route ? 4 : 3;

  const handleSelectA = useCallback((coords, label) => {
    setLabelA(label);
    onSetPoint('A', coords);
  }, [onSetPoint]);

  const handleSelectB = useCallback((coords, label) => {
    setLabelB(label);
    onSetPoint('B', coords);
  }, [onSetPoint]);

  const handleReset = () => {
    setLabelA('');
    setLabelB('');
    onReset();
  };

  return (
    <div className="dp">
      {/* ── Header ── */}
      <div className="dp__header">
        <div className="dp__header-left">
          <div className="dp__header-icon">
            <i className="bi bi-rulers"></i>
          </div>
          <span className="dp__header-title">Mesurer une distance</span>
        </div>
        <button className="dp__close" onClick={onClose} aria-label="Fermer">
          <i className="bi bi-x-lg"></i>
        </button>
      </div>

      {/* ── Stepper ── */}
      <div className="dp__stepper">
        {[{ n: 1, label: 'Départ' }, { n: 2, label: 'Arrivée' }, { n: 3, label: 'Résultat' }].map(({ n, label }, i) => (
          <React.Fragment key={n}>
            <div className={`dp__step ${step >= n ? 'dp__step--done' : ''} ${step === n ? 'dp__step--active' : ''}`}>
              <div className="dp__step-circle">
                {step > n ? <i className="bi bi-check-lg"></i> : n}
              </div>
              <span className="dp__step-label">{label}</span>
            </div>
            {i < 2 && <div className={`dp__step-line ${step > n ? 'dp__step-line--done' : ''}`} />}
          </React.Fragment>
        ))}
      </div>

      {/* ── Champs de recherche ── */}
      <div className="dp__fields">
        <LocationInput
          badge="A"
          placeholder="Lieu de départ…"
          value={pointA ? { label: labelA } : null}
          onSelect={handleSelectA}
        />
        <div className="dp__fields-arrow">
          <i className="bi bi-arrow-down"></i>
        </div>
        <LocationInput
          badge="B"
          placeholder="Lieu d'arrivée…"
          value={pointB ? { label: labelB } : null}
          onSelect={handleSelectB}
          disabled={!pointA}
        />
      </div>

      {/* ── Distance à vol d'oiseau ── */}
      {straightLineKm != null && (
        <div className="dp__straight">
          <i className="bi bi-arrow-left-right"></i>
          <span>Vol d'oiseau : <strong>{straightLineKm.toFixed(2)} km</strong></span>
        </div>
      )}

      {/* ── Mode + Valider ── */}
      {pointA && pointB && !route && (
        <div className="dp__validate-section">
          <p className="dp__mode-label">Mode de transport</p>
          <div className="dp__modes">
            {MODES.map((m) => (
              <button
                key={m.key}
                className={`dp__mode-btn ${selectedMode === m.key ? 'dp__mode-btn--active' : ''}`}
                onClick={() => setSelectedMode(m.key)}
                disabled={loading}
              >
                <i className={`bi ${m.icon}`}></i>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
          <button className="dp__validate-btn" onClick={() => onComputeRoute(selectedMode)} disabled={loading}>
            {loading
              ? <><i className="bi bi-arrow-repeat spin"></i> Calcul en cours…</>
              : <><i className="bi bi-check2-circle"></i> Calculer l'itinéraire</>
            }
          </button>
        </div>
      )}

      {/* ── Erreur ── */}
      {error && (
        <div className="dp__error">
          <i className="bi bi-exclamation-circle-fill"></i>
          <span>{error}</span>
        </div>
      )}

      {/* ── Résultat ── */}
      {route && !loading && (
        <div className="dp__result">
          <div className="dp__result-row">
            <div className="dp__result-item">
              <i className="bi bi-signpost-split"></i>
              <div>
                <div className="dp__result-value">{formatDistance(route.distanceMeters)}</div>
                <div className="dp__result-label">Par la route</div>
              </div>
            </div>
            <div className="dp__result-divider" />
            <div className="dp__result-item">
              <i className="bi bi-clock-fill"></i>
              <div>
                <div className="dp__result-value">{formatDuration(route.durationSeconds)}</div>
                <div className="dp__result-label">Durée estimée</div>
              </div>
            </div>
          </div>
          <p className="dp__result-hint">
            <i className="bi bi-info-circle"></i> Itinéraire tracé sur la carte
          </p>
        </div>
      )}

      {/* ── Reset ── */}
      <button className="dp__reset" onClick={handleReset}>
        <i className="bi bi-arrow-counterclockwise"></i>
        <span>Recommencer</span>
      </button>
    </div>
  );
}

export default DistancePanel;
