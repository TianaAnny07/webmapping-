import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
  BarChart, Bar
} from 'recharts';

function InvalidateMapSize() {
  const map = useMap();
  useEffect(() => {
    const t1 = setTimeout(() => map.invalidateSize(), 100);
    const t2 = setTimeout(() => map.invalidateSize(), 400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function TableauDeBord({ onNavigate }) {
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/facilities/geojson')
      .then(res => setFacilities(res.data.features || []))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  // Stats calculées
  const totalFS = facilities.length;
  const hopitaux = facilities.filter(f => f.properties.healthcare === 'hospital' || f.properties.amenity === 'hospital').length;
  const csb2 = facilities.filter(f => (f.properties.name || '').toUpperCase().includes('CSB II') || (f.properties.name || '').toUpperCase().includes('CSB 2')).length;
  const csb1 = facilities.filter(f => (f.properties.name || '').toUpperCase().includes('CSB I') && !(f.properties.name || '').toUpperCase().includes('CSB II')).length;
  const pharmacies = facilities.filter(f => f.properties.amenity === 'pharmacy').length;
  const infirmiers = facilities.filter(f => f.properties.healthcare === 'nurse').length;
  const regions = [...new Set(facilities.map(f => f.properties.adm1Name).filter(Boolean))];
  const tauxCouverture = Math.round((totalFS / 28000) * 100);

  // Données graphique linéaire
  const evolutionData = [
    { annee: '2020', taux: 42 },
    { annee: '2021', taux: 48 },
    { annee: '2022', taux: 55 },
    { annee: '2023', taux: 61 },
    { annee: '2024', taux: 68 },
    { annee: '2025', taux: Math.min(tauxCouverture + 60, 95) },
  ];

  // Données donut
  const donutData = [
    { name: 'Hôpitaux', value: hopitaux, color: '#e74c3c' },
    { name: 'CSB II', value: csb2, color: '#2980b9' },
    { name: 'CSB I', value: csb1, color: '#5dade2' },
    { name: 'Pharmacies', value: pharmacies, color: '#27ae60' },
    { name: 'Infirmiers', value: infirmiers, color: '#16a085' },
  ].filter(d => d.value > 0);

  // Données barres — top 8 régions
  const regionData = regions.map(r => ({
    name: r.length > 12 ? r.substring(0, 12) + '...' : r,
    total: facilities.filter(f => f.properties.adm1Name === r).length,
  })).sort((a, b) => b.total - a.total).slice(0, 8);

  // ===== FONCTION POUR REDIRIGER VERS LA CARTE =====
  const handleMapClick = () => {
    console.log('Carte cliquée ! Redirection vers /carte');
    if (onNavigate) {
      onNavigate('carte');
    } else {
      navigate('/carte');  
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#64748b' }}>
      <i className="bi bi-hourglass-split" style={{ fontSize: '32px', marginBottom: '12px', color: '#6DBE45' }}></i>
      <p>Chargement des données...</p>
    </div>
  );

  // STYLES INLINE
  const styles = {
    container: {
      display: 'flex',
      gap: '20px',
      padding: '20px',
      minHeight: '100vh',
      background: 'var(--bg-secondary, #f8f9fa)',
      fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
    },
    sidebar: {
      width: '280px',
      flexShrink: 0,
      display: 'flex'
    },
    sidebarCard: {
      background: 'var(--bg-card, #ffffff)',
      borderRadius: '16px',
      border: '1px solid var(--border-color, #e8edf2)',
      boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      overflow: 'hidden',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      flexDirection: 'column',
      width: '100%'
    },
    sidebarHeader: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px 20px',
      background: 'var(--bg-card, #ffffff)',
      color: 'var(--text-primary, #0f172a)',
      borderBottom: '1px solid var(--border-color, #e8edf2)',
      flexShrink: 0
    },
    sidebarMap: {
      flex: 1,
      display: 'flex',
      minHeight: '200px',
      position: 'relative',
      cursor: 'pointer'
    },
    sidebarMapOverlay: {
      position: 'absolute',
      inset: 0,
      zIndex: 1000,
      cursor: 'pointer',
      background: 'transparent',
      pointerEvents: 'auto'  // ← IMPORTANT : permet de capter le clic
    },
    sidebarFooter: {
      padding: '14px 20px',
      textAlign: 'center',
      fontSize: '13px',
      fontWeight: 500,
      color: '#6DBE45',
      borderTop: '1px solid var(--border-color, #e8edf2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      flexShrink: 0,
      cursor: 'pointer'
    },
    main: {
      flex: 1,
      minWidth: 0
    },
    kpiGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '16px',
      marginBottom: '20px'
    },
    kpiCard: {
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e8edf2)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    },
    kpiCardContent: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start'
    },
    kpiLabel: {
      fontSize: '12px',
      color: 'var(--text-secondary, #64748b)',
      marginBottom: '8px'
    },
    kpiValue: {
      fontSize: '28px',
      fontWeight: 700,
      color: 'var(--text-primary, #0f172a)'
    },
    kpiSub: {
      fontSize: '11px',
      color: 'var(--text-secondary, #94a3b8)',
      marginTop: '4px'
    },
    kpiIcon: {
      width: '44px',
      height: '44px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      flexShrink: 0
    },
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: '16px',
      marginBottom: '20px'
    },
    chartCard: {
      background: 'var(--bg-card, #ffffff)',
      border: '1px solid var(--border-color, #e8edf2)',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    },
    chartHeader: {
      marginBottom: '16px'
    },
    chartTitle: {
      fontSize: '14px',
      fontWeight: 600,
      color: 'var(--text-primary, #0f172a)',
      display: 'block'
    },
    chartSubtitle: {
      fontSize: '12px',
      color: 'var(--text-secondary, #94a3b8)',
      marginTop: '2px'
    }
  };

  return (
    <div style={styles.container}>

      {/* ===== SIDEBAR GAUCHE AVEC LA CARTE ===== */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarCard}>
          <div style={styles.sidebarHeader}>
            <i className="bi bi-map-fill" style={{ fontSize: '18px', color: '#6DBE45' }}></i>
            <span style={{ fontSize: '14px', fontWeight: 600, flex: 1, marginLeft: '10px' }}>Carte interactive</span>
            <i className="bi bi-chevron-right" style={{ fontSize: '14px', opacity: 0.6 }}></i>
          </div>

          {/* ===== MINI CARTE LEAFLET ===== */}
          <div style={styles.sidebarMap}>
            {/* Overlay transparent pour capter le clic */}
            <div style={styles.sidebarMapOverlay} onClick={handleMapClick}></div>
            
            <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
              <MapContainer
                center={[-18.9249, 47.5185]}
                zoom={6}
                style={{ height: '100%', width: '100%', minHeight: '200px' }}
                zoomControl={false}
                dragging={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
                keyboard={false}
                boxZoom={false}
                touchZoom={false}
              >
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <InvalidateMapSize />
              </MapContainer>
            </div>
          </div>

          <div style={styles.sidebarFooter} onClick={handleMapClick}>
            <i className="bi bi-arrow-right-circle"></i>
            Voir la carte complète
          </div>
        </div>
      </aside>

      {/* ===== CONTENU PRINCIPAL ===== */}
      <main style={styles.main}>

        {/* KPI CARDS - 3 */}
        <div style={styles.kpiGrid}>
          {[
            { label: 'Établissements', value: totalFS, icon: 'bi-hospital-fill', color: '#6DBE45', bg: 'rgba(109,190,69,0.1)', sub: 'formations sanitaires' },
            { label: "Taux d'accessibilité", value: `${tauxCouverture + 60}%`, icon: 'bi-graph-up-arrow', color: '#2980b9', bg: 'rgba(41,128,185,0.1)', sub: 'population couverte' },
            { label: 'Régions couvertes', value: regions.length, icon: 'bi-map-fill', color: '#9b59b6', bg: 'rgba(155,89,182,0.1)', sub: 'sur 23 régions' },
          ].map(kpi => (
            <div key={kpi.label} style={styles.kpiCard}>
              <div style={styles.kpiCardContent}>
                <div>
                  <div style={styles.kpiLabel}>{kpi.label}</div>
                  <div style={styles.kpiValue}>{kpi.value}</div>
                  <div style={styles.kpiSub}>{kpi.sub}</div>
                </div>
                <div style={{ ...styles.kpiIcon, background: kpi.bg, color: kpi.color }}>
                  <i className={`bi ${kpi.icon}`}></i>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* GRAPHIQUES LIGNE + DONUT */}
        <div style={styles.chartsGrid}>

          {/* Ligne - Evolution */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <span style={styles.chartTitle}>Évolution du taux de couverture</span>
              <span style={styles.chartSubtitle}>2020 — 2025</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={evolutionData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradientTaux" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6DBE45" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6DBE45" stopOpacity={0.02}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8edf2" strokeOpacity={0.4}/>
                <XAxis dataKey="annee" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false}/>
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} unit="%" axisLine={false} tickLine={false} width={35}/>
                <Tooltip
                  formatter={(v) => [`${v}%`, 'Taux']}
                  contentStyle={{ background: '#ffffff', border: '1px solid #e8edf2', borderRadius: '8px', fontSize: '13px', color: '#0f172a' }}
                  labelStyle={{ color: '#64748b' }}
                />
                <Area
                  type="monotone"
                  dataKey="taux"
                  stroke="#6DBE45"
                  strokeWidth={3}
                  fill="url(#gradientTaux)"
                  dot={{ fill: '#6DBE45', r: 4, stroke: '#6DBE45', strokeWidth: 1 }}
                  activeDot={{ r: 6, fill: '#6DBE45', stroke: '#ffffff', strokeWidth: 2 }}
                  animationDuration={1500}
                  animationEasing="ease-out"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Donut - Répartition */}
          <div style={styles.chartCard}>
            <div style={styles.chartHeader}>
              <span style={styles.chartTitle}>Répartition par type</span>
              <span style={styles.chartSubtitle}>Total : {totalFS} FS</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={donutData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                >
                  {donutData.map((entry, index) => (
                    <Cell key={index} fill={entry.color}/>
                  ))}
                </Pie>
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: '11px', color: '#64748b' }}>{value}</span>}
                />
                <Tooltip formatter={(v, name) => [v, name]}/>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRAPHIQUE BARRES - Par région */}
        <div style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <span style={styles.chartTitle}>Établissements par région</span>
            <span style={styles.chartSubtitle}>Top 8 régions</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regionData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }}/>
              <YAxis tick={{ fontSize: 11, fill: '#888' }}/>
              <Tooltip/>
              <Bar dataKey="total" fill="#6DBE45" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </main>
    </div>
  );
}

export default TableauDeBord;