// Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/api';
import api from '../services/api';
import 'bootstrap-icons/font/bootstrap-icons.css';
import './Dashboard.css';

// ✅ Supprimer l'import inutilisé de TableauDeBord
import TableauDeBord from './Navbar/TableauDeBord';
import GestionEtablissements from './Navbar/GestionEtablissements';
import ListeDonnees from './Navbar/ListeDonnees';
import CarteDashboard from './Navbar/CarteDashboard';
import GestionUtilisateurs from './Navbar/GestionUtilisateurs';
import ClassementZones from './Navbar/ClassementZones';
import ProfilModal from './Navbar/ProfilModal';
import LogoutConfirm from '../components/LogoutConfirm';

function Dashboard() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [now, setNow] = useState(new Date());
  // Région à pré-filtrer quand on arrive sur "Classement des zones" depuis
  // le bouton du panneau carte — null = pas de filtre imposé.
  const [classementRegionFilter, setClassementRegionFilter] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [showProfil, setShowProfil] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  useEffect(() => {
    fetchFacilities();
  }, []);

  const fetchFacilities = async () => {
    try {
      const response = await api.get('/facilities/geojson');
      setFacilities(response.data.features || []);
    } catch (err) {
      console.error('Erreur facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // Appelé par le bouton "Voir le détail par district" du panneau carte
  const goToClassementForRegion = (region) => {
    setClassementRegionFilter(region);
    setActiveMenu('classement');
  };

  const menuItems = [
    { id: 'dashboard', icon: 'bi-grid-fill', label: 'Tableau de bord' },
    { id: 'gestion', icon: 'bi-cloud-upload-fill', label: 'Gestion d\'établissements' },
    { id: 'liste', icon: 'bi-table', label: 'Liste des données' },
    { id: 'carte', icon: 'bi-map-fill', label: 'Carte' },
    { id: 'utilisateurs', icon: 'bi-people-fill', label: 'Gestion utilisateurs' },
    { id: 'classement', icon: 'bi-bar-chart-fill', label: 'Classement des zones' },
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard': 
         return <TableauDeBord onNavigate={(menuId) => setActiveMenu(menuId)} />;
      case 'gestion': 
        return <GestionEtablissements />;
      case 'liste': 
        return <ListeDonnees facilities={facilities} onRefresh={fetchFacilities} />;
      case 'carte': 
        return <CarteDashboard facilities={facilities} onNavigateToClassement={goToClassementForRegion} />;
      case 'utilisateurs': 
        return <GestionUtilisateurs />;
      case 'classement': 
        return <ClassementZones initialRegionFilter={classementRegionFilter} />;
      default: return <TableauDeBord />;
    }
  };

  if (loading) {
    return (
      <div style={{ background: '#f4f6f9', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a2e' }}>
        Chargement...
      </div>
    );
  }

  return (
    <div className="dash-wrapper">
      {/* SIDEBAR */}
      <aside className="dash-sidebar">
        <div className="dash-logo">
          <i className="bi bi-geo-alt-fill" style={{ color: '#6DBE45', fontSize: '24px' }}></i>
          <span>SantéGéo MG</span>
        </div>

        <nav className="dash-nav">
          {menuItems.map(item => (
            <div
              key={item.id}
              className={`dash-nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => {
                // Navigation manuelle via le menu : on efface le filtre région
                // imposé par le bouton du panneau carte, pour ne pas le
                // ré-appliquer par surprise la prochaine fois qu'on arrive
                // sur "Classement des zones".
                setClassementRegionFilter(null);
                setActiveMenu(item.id);
              }}
            >
              <i className={`bi ${item.icon}`}></i>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>

        <div className="dash-user" onClick={() => setShowProfil(true)} style={{ cursor: 'pointer', position: 'relative' }}>
          <div className="dash-avatar">
            {user?.avatar
              ? <img src={user.avatar} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
              : <i className="bi bi-person-fill"></i>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '12px', color: '#333', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.username || user?.email}</div>
            <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="dash-main">
        {/* HEADER */}
        <header className="dash-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginLeft: 'auto' }}>
            <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                {now.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '5px', justifyContent: 'flex-end' }}>
                <i className="bi bi-clock" style={{ color: '#6DBE45', fontSize: '12px' }}></i>
                {now.toLocaleTimeString('fr-FR')}
              </div>
            </div>
            <button className="dash-logout" onClick={handleLogout}>
              <i className="bi bi-box-arrow-right"></i> Déconnexion
            </button>
          </div>
        </header>

        {/* CONTENT */}
        <div className="dash-content">
          {renderContent()}
        </div>
      </div>

      {showProfil && (
        <ProfilModal
          user={user}
          onClose={() => setShowProfil(false)}
          onLogout={handleLogout}
          onUpdate={(u) => {
            setUser({ ...user, ...u });
            setShowProfil(false);
          }}
        />
      )}

      {showLogoutConfirm && (
        <LogoutConfirm onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      )}
    </div>
  );
}

export default Dashboard;