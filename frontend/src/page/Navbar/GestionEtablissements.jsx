import React, { useState } from 'react';
import api from '../../services/api';

function GestionEtablissements() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('geojson');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier avant de lancer l\'importation.');
      return;
    }

    setImporting(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await api.post('/facilities/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de l\'importation.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="dash-section-box">
      <h2 className="dash-section-heading">
        <i className="bi bi-cloud-upload-fill"></i> Gestion d'établissements
      </h2>
      <p style={{ color: '#888', marginBottom: '24px' }}>
        Importez vos données depuis QGIS, GeoJSON ou CSV pour mettre à jour la base d'établissements.
      </p>

      {/* Types d'import */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
        {[
          { id: 'geojson', icon: 'bi-filetype-json', title: 'GeoJSON', desc: 'Format SIG web. Géométries complexes.' },
          { id: 'csv', icon: 'bi-filetype-csv', title: 'CSV / Excel', desc: 'Colonnes lat/lon. Import tabulaire rapide.' },
          { id: 'shp', icon: 'bi-layers-fill', title: 'QGIS / SHP', desc: 'Shapefiles et projections QGIS.' },
        ].map((type) => (
          <div key={type.id}
            onClick={() => setSelectedType(type.id)}
            style={{
              flex: 1,
              border: `2px solid ${selectedType === type.id ? '#6DBE45' : '#e0e0e0'}`,
              borderRadius: '10px',
              padding: '16px',
              cursor: 'pointer',
              background: selectedType === type.id ? 'rgba(109,190,69,0.05)' : '#fff',
              transition: 'all 0.2s'
            }}
          >
            <i className={`bi ${type.icon}`} style={{ fontSize: '24px', color: '#6DBE45' }}></i>
            <div style={{ fontWeight: 'bold', marginTop: '8px' }}>{type.title}</div>
            <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>{type.desc}</div>
          </div>
        ))}
      </div>

      {/* Zone drag & drop */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{
          border: `2px dashed ${selectedFile ? '#6DBE45' : '#ccc'}`,
          borderRadius: '10px',
          padding: '40px',
          textAlign: 'center',
          background: selectedFile ? 'rgba(109,190,69,0.05)' : '#fafafa',
          marginBottom: '16px',
          transition: 'all 0.2s'
        }}
      >
        <i className="bi bi-cloud-upload" style={{ fontSize: '40px', color: selectedFile ? '#6DBE45' : '#ccc' }}></i>

        {selectedFile ? (
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontWeight: 'bold', color: '#6DBE45' }}>
              <i className="bi bi-check-circle-fill"></i> {selectedFile.name}
            </p>
            <p style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
              {(selectedFile.size / 1024).toFixed(1)} KB
            </p>
            <button
              onClick={() => setSelectedFile(null)}
              style={{
                marginTop: '8px', background: 'none',
                border: 'none', color: '#e74c3c',
                cursor: 'pointer', fontSize: '12px'
              }}
            >
              <i className="bi bi-x-circle"></i> Supprimer
            </button>
          </div>
        ) : (
          <>
            <p style={{ margin: '12px 0 8px', fontWeight: 'bold' }}>Glisser-déposer votre fichier ici</p>
            <p style={{ color: '#888', marginBottom: '16px' }}>ou</p>
            <label style={{
              background: '#6DBE45', color: 'white', padding: '10px 24px',
              borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold'
            }}>
              <i className="bi bi-folder2-open"></i> Parcourir
              <input
                type="file"
                accept=".geojson,.json,.csv,.shp"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </>
        )}
      </div>

  

      {/* Messages */}
      {error && (
        <div style={{
          background: 'rgba(231,76,60,0.1)', color: '#e74c3c',
          border: '1px solid rgba(231,76,60,0.3)',
          borderRadius: '8px', padding: '12px', marginBottom: '16px'
        }}>
          <i className="bi bi-x-circle-fill"></i> {error}
        </div>
      )}

      {result && (
        <div style={{
          background: 'rgba(109,190,69,0.1)', color: '#5aa336',
          border: '1px solid rgba(109,190,69,0.3)',
          borderRadius: '8px', padding: '12px', marginBottom: '16px'
        }}>
          <i className="bi bi-check-circle-fill"></i> {result.message} —
          <b> {result.inserted}</b> insérés,
          <b> {result.skipped}</b> ignorés sur
          <b> {result.total}</b> total
        </div>
      )}

      {/* Bouton lancer */}
      <button
        onClick={handleImport}
        disabled={importing || !selectedFile}
        style={{
          width: '100%', padding: '14px',
          background: importing || !selectedFile ? '#ccc' : '#6DBE45',
          color: 'white', border: 'none', borderRadius: '8px',
          fontSize: '15px', fontWeight: 'bold',
          cursor: importing || !selectedFile ? 'not-allowed' : 'pointer'
        }}
      >
        {importing ? (
          <><i className="bi bi-hourglass-split"></i> Importation en cours...</>
        ) : (
          <><i className="bi bi-upload"></i> Lancer l'importation</>
        )}
      </button>
    </div>
  );
}

export default GestionEtablissements;