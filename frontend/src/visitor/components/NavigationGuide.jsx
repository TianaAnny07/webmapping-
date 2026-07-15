import React, { useEffect, useState } from 'react';
import { haversineKm, formatDistance } from '../utils/geo';
import { describeStep } from '../utils/maneuver';

const STEP_ARRIVAL_THRESHOLD_M = 30;

function Compass({ rotation }) {
  return (
    <svg viewBox="0 0 60 60" width="46" height="46" className="nav-guide__compass">
      <circle cx="30" cy="30" r="27" fill="var(--bg-input)" stroke="var(--border-color)" strokeWidth="2" />
      <text x="30" y="12" textAnchor="middle" fontSize="7" fill="var(--text-secondary)">N</text>
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: '30px 30px', transition: 'transform 0.35s ease' }}>
        <polygon points="30,12 23,36 30,30 37,36" fill="var(--accent)" />
      </g>
    </svg>
  );
}

/**
 * Petit guide de navigation : boussole tournante + note d'instruction
 * ("Tournez à gauche, suivez le chemin sur 200 m"). Avance automatiquement
 * d'étape en étape selon la position courante de l'utilisateur.
 */
function NavigationGuide({ steps, position, destinationName }) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    setStepIndex(0);
  }, [steps]);

  useEffect(() => {
    if (!position || !steps || steps.length === 0) return;
    const current = steps[stepIndex];
    if (!current) return;
    const distM = haversineKm(position[0], position[1], current.location[0], current.location[1]) * 1000;
    if (distM < STEP_ARRIVAL_THRESHOLD_M && stepIndex < steps.length - 1) {
      setStepIndex((i) => i + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position]);

  if (!steps || steps.length === 0) return null;

  const current = steps[stepIndex];
  const next = steps[stepIndex + 1];
  const { text, rotation } = describeStep(current);

  const distToStep = position
    ? haversineKm(position[0], position[1], current.location[0], current.location[1]) * 1000
    : current.distanceMeters;

  return (
    <div className="nav-guide">
      <Compass rotation={rotation} />
      <div className="nav-guide__text">
        <div className="nav-guide__instruction">{text}</div>
        <div className="nav-guide__sub">
          Dans {formatDistance(distToStep)}
          {next ? ` · puis ${describeStep(next).text.toLowerCase()}` : ` · vers ${destinationName || "l'établissement"}`}
        </div>
      </div>
    </div>
  );
}

export default NavigationGuide;