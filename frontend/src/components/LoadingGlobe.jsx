// src/components/LoadingGlobe.jsx

import React from 'react';
import './LoadingGlobe.css';

function LoadingGlobe({ message = 'Chargement des données...' }) {
  return (
    <div className="loading-globe-container">
      <div className="loading-globe-wrapper">
        {/* Globe 3D */}
        <div className="globe-3d">
          <div className="globe-sphere">
            {/* Cercles de latitude */}
            <div className="globe-ring ring-1"></div>
            <div className="globe-ring ring-2"></div>
            <div className="globe-ring ring-3"></div>

            {/* Points (établissements) */}
            <div className="globe-dot dot-1"></div>
            <div className="globe-dot dot-2"></div>
            <div className="globe-dot dot-3"></div>
            <div className="globe-dot dot-4"></div>
            <div className="globe-dot dot-5"></div>
            <div className="globe-dot dot-6"></div>
            <div className="globe-dot dot-7"></div>
            <div className="globe-dot dot-8"></div>
            <div className="globe-dot dot-9"></div>
            <div className="globe-dot dot-10"></div>

            {/* Reflet */}
            <div className="globe-shine"></div>
          </div>
        </div>

        <div className="loading-text">{message}</div>
        <div className="loading-subtext">Veuillez patienter...</div>
        <div className="loading-progress">
          <div className="loading-progress-fill"></div>
        </div>
      </div>
    </div>
  );
}

export default LoadingGlobe;
