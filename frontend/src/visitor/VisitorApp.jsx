// import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
// import { useNavigate } from 'react-router-dom';
// import api, { authService } from '../services/api';
// import ThemeToggle from '../components/ThemeToggle';
// import useGeolocation from './hooks/useGeolocation';
// import { haversineKm, distanceToRouteMeters } from './utils/geo';
// import { getItinerary } from './utils/osrm';
// import VisitorMap from './components/VisitorMap';
// import ExplorePanel from './components/ExplorePanel';
// import FacilityDetail from './components/FacilityDetail';
// import AlertBanner from './components/AlertBanner';
// import LocationConfirm from './components/LocationConfirm';
// import NavigationGuide from './components/NavigationGuide';
// import MapLegend from './components/MapLegend';
// import ProfileMenu from './components/ProfileMenu';
// import LogoutConfirm from '../components/LogoutConfirm';
// import './VisitorApp.css';

// const OFF_ROUTE_THRESHOLD_M = 300;
// const ARRIVAL_THRESHOLD_M = 60;

// function VisitorApp() {
//   const navigate = useNavigate();
//   const [user, setUser] = useState(authService.getCurrentUser());
//   const [showProfile, setShowProfile] = useState(false);

//   const [facilities, setFacilities] = useState([]);
//   const [loadingFacilities, setLoadingFacilities] = useState(true);
//   const [loadError, setLoadError] = useState(null);

//   const [query, setQuery] = useState('');
//   const [tab, setTab] = useState('search');
//   const [nearbyResults, setNearbyResults] = useState([]);
//   const [nearbyLoading, setNearbyLoading] = useState(false);

//   const [selectedFacility, setSelectedFacility] = useState(null);
//   const [flyTo, setFlyTo] = useState(null);
//   const [sheetExpanded, setSheetExpanded] = useState(false);

//   const [routePreview, setRoutePreview] = useState(null);
//   const [previewLoading, setPreviewLoading] = useState(false);
//   const [activeRoute, setActiveRoute] = useState(null);
//   const [alert, setAlert] = useState(null);
//   const [showLocationConfirm, setShowLocationConfirm] = useState(false);
//   const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
//   const pendingLocateCallbackRef = useRef(null);

//   const { position, error: geoError, watching, locateOnce, startWatch, stopWatch } = useGeolocation();

//   const lastGoodDistanceRef = useRef(null);

//   useEffect(() => {
//     api
//       .get('/facilities/geojson')
//       .then((res) => {
//         setFacilities(res.data.features || []);
//         setLoadError(null);
//       })
//       .catch(() => setLoadError("Impossible de charger les établissements. Vérifiez votre connexion."))
//       .finally(() => setLoadingFacilities(false));
//   }, []);

//   const requestLocation = useCallback((onGranted) => {
//     pendingLocateCallbackRef.current = onGranted || null;
//     setShowLocationConfirm(true);
//   }, []);

//   const handleAcceptLocation = useCallback(() => {
//     setShowLocationConfirm(false);
//     const callback = pendingLocateCallbackRef.current;
//     pendingLocateCallbackRef.current = null;
//     locateOnce(
//       (coords) => {
//         setFlyTo({ coords, zoom: 16 });
//         callback?.(coords);
//       },
//       (msg) => setAlert({ message: msg, variant: 'warning' })
//     );
//   }, [locateOnce]);

//   const handleCancelLocation = useCallback(() => {
//     setShowLocationConfirm(false);
//     pendingLocateCallbackRef.current = null;
//   }, []);

//   const searchResults = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     if (!q) return facilities;
//     return facilities.filter((f) => (f.properties.name || '').toLowerCase().includes(q));
//   }, [facilities, query]);

//   const computeNearby = useCallback(() => {
//     if (!position) {
//       requestLocation(() => {});
//       return;
//     }
//     setNearbyLoading(true);
//     const [lat, lon] = position;
//     const withDistance = facilities
//       .map((f) => {
//         const [flon, flat] = f.geometry.coordinates;
//         const distanceKm = haversineKm(lat, lon, flat, flon);
//         return { ...f, properties: { ...f.properties, __distanceKm: distanceKm } };
//       })
//       .sort((a, b) => a.properties.__distanceKm - b.properties.__distanceKm)
//       .slice(0, 20);
//     setNearbyResults(withDistance);
//     setNearbyLoading(false);
//   }, [position, facilities, requestLocation]);

//   useEffect(() => {
//     if (tab === 'nearby' && position) computeNearby();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [position, tab]);

//   const handleSelectFacility = useCallback((feature) => {
//     setSelectedFacility(feature);
//     setRoutePreview(null);
//     setSheetExpanded(true);
//   }, []);

//   const handleBackToList = useCallback(() => {
//     setSelectedFacility(null);
//     setRoutePreview(null);
//   }, []);

//   const handlePreviewMode = useCallback(
//     async (mode, coordsOverride) => {
//       if (!selectedFacility) return;
//       const coords = coordsOverride || position;
//       if (!coords) {
//         requestLocation((granted) => handlePreviewMode(mode, granted));
//         return;
//       }
//       setPreviewLoading(true);
//       setRoutePreview(null);
//       try {
//         const [lon, lat] = selectedFacility.geometry.coordinates;
//         const result = await getItinerary(coords[0], coords[1], lat, lon, mode);
//         setRoutePreview({ mode, ...result });
//       } catch {
//         setAlert({ message: "Impossible de calculer l'itinéraire pour le moment.", variant: 'warning' });
//       } finally {
//         setPreviewLoading(false);
//       }
//     },
//     [selectedFacility, position, requestLocation]
//   );

//   const handleCancelPreview = useCallback(() => setRoutePreview(null), []);

//   const handleValidateRoute = useCallback(() => {
//     if (!routePreview || !selectedFacility) return;
//     const [lon, lat] = selectedFacility.geometry.coordinates;
//     setActiveRoute({
//       facilityId: selectedFacility.properties.id,
//       facilityName: selectedFacility.properties.name,
//       destination: [lat, lon],
//       mode: routePreview.mode,
//       geometry: routePreview.geometry,
//       steps: routePreview.steps,
//       distanceMeters: routePreview.distanceMeters,
//       durationSeconds: routePreview.durationSeconds,
//     });
//     setRoutePreview(null);
//     lastGoodDistanceRef.current = Date.now();
//     startWatch();
//     setAlert({ message: `Navigation démarrée vers ${selectedFacility.properties.name || "l'établissement"}.`, variant: 'success' });
//   }, [routePreview, selectedFacility, startWatch]);

//   const handleStopNavigation = useCallback(() => {
//     setActiveRoute(null);
//     stopWatch();
//     setAlert(null);
//   }, [stopWatch]);

//   useEffect(() => {
//     if (!activeRoute || !position) return;

//     const distToDestKm = haversineKm(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1]);
//     if (distToDestKm * 1000 <= ARRIVAL_THRESHOLD_M) {
//       setAlert({ message: 'Vous êtes arrivé à destination.', variant: 'success' });
//       setActiveRoute(null);
//       stopWatch();
//       return;
//     }

//     const offRouteM = distanceToRouteMeters(position[0], position[1], activeRoute.geometry);
//     if (offRouteM > OFF_ROUTE_THRESHOLD_M) {
//       setAlert({
//         message: `Vous semblez être hors de l'itinéraire prévu (à ${Math.round(offRouteM)} m). Vous êtes peut-être perdu.`,
//         variant: 'warning',
//       });
//     } else if (alert?.variant === 'warning') {
//       setAlert(null);
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [position, activeRoute]);

//   const handleRecalculate = useCallback(async () => {
//     if (!activeRoute || !position) return;
//     try {
//       const result = await getItinerary(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1], activeRoute.mode);
//       setActiveRoute((prev) => ({ ...prev, geometry: result.geometry, steps: result.steps, distanceMeters: result.distanceMeters, durationSeconds: result.durationSeconds }));
//       setAlert(null);
//     } catch {
//       setAlert({ message: 'Impossible de recalculer pour le moment.', variant: 'warning' });
//     }
//   }, [activeRoute, position]);

//   const handleLogout = () => {
//     setShowLogoutConfirm(true);
//   };

//   const confirmLogout = () => {
//     authService.logout();
//     navigate('/login');
//   };

//   const mapRoute = activeRoute
//     ? { geometry: activeRoute.geometry, active: true, mode: activeRoute.mode }
//     : routePreview
//     ? { geometry: routePreview.geometry, active: false }
//     : null;

//   const highlightedIds = useMemo(() => {
//     if (selectedFacility) return null;
//     if (tab === 'nearby' && nearbyResults.length > 0) {
//       return new Set(nearbyResults.map((f) => f.properties.id));
//     }
//     if (tab === 'search' && query.trim()) {
//       return new Set(searchResults.map((f) => f.properties.id));
//     }
//     return null;
//   }, [tab, query, searchResults, nearbyResults, selectedFacility]);

//   const navigatingInfo = activeRoute
//     ? { facilityId: activeRoute.facilityId, mode: activeRoute.mode, distanceMeters: activeRoute.distanceMeters, durationSeconds: activeRoute.durationSeconds }
//     : null;

//   return (
//     <div className="visitor-app">
//       {showLocationConfirm && (
//         <LocationConfirm onAccept={handleAcceptLocation} onCancel={handleCancelLocation} />
//       )}

//       {showLogoutConfirm && (
//         <LogoutConfirm onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
//       )}

//       <header className="visitor-header">
//         <div className="visitor-header__brand">
//           <i className="bi bi-heart-pulse-fill"></i> Santé Madagascar
//         </div>
//         <div className="visitor-header__actions">
//           <button className="visitor-header__icon-btn" onClick={() => requestLocation()} title="Me localiser">
//             <i className={`bi bi-crosshair ${watching ? 'is-active' : ''}`}></i>
//           </button>
//           <ThemeToggle />
//           {user && (
//             <div className="visitor-header__profile-wrap">
//               <button className="visitor-header__avatar-btn" onClick={() => setShowProfile((v) => !v)} title="Mon profil">
//                 {user.avatar ? (
//                   <img src={user.avatar} alt="avatar" />
//                 ) : (
//                   <span>{(user.username || user.email || '?').charAt(0).toUpperCase()}</span>
//                 )}
//               </button>
//               {showProfile && (
//                 <ProfileMenu
//                   onClose={() => setShowProfile(false)}
//                   onUpdate={(updatedUser) => {
//                     setUser(updatedUser);
//                     setShowProfile(false);
//                   }}
//                   onLogout={() => {
//                     setShowProfile(false);
//                     handleLogout();
//                   }}
//                 />
//               )}
//             </div>
//           )}
//         </div>
//       </header>

//       <div className="visitor-body">
//         <div className="visitor-map-wrap">
//           <VisitorMap
//             facilities={facilities}
//             userPosition={position}
//             selectedFacility={selectedFacility}
//             onSelectFacility={handleSelectFacility}
//             flyTo={flyTo}
//             route={mapRoute}
//             highlightedIds={highlightedIds}
//           />

//           <div className="visitor-map-overlay-top">
//             {activeRoute && (
//               <NavigationGuide steps={activeRoute.steps} position={position} destinationName={activeRoute.facilityName} />
//             )}
//             <AlertBanner
//               message={alert?.message}
//               variant={alert?.variant}
//               onDismiss={() => setAlert(null)}
//               onAction={activeRoute && alert?.variant === 'warning' ? handleRecalculate : undefined}
//               actionLabel="Recalculer l'itinéraire"
//             />
//           </div>

//           <MapLegend />

//           {loadingFacilities && (
//             <div className="visitor-map-loading">
//               <i className="bi bi-arrow-repeat spin"></i> Chargement des établissements…
//             </div>
//           )}
//           {loadError && <div className="visitor-map-loading visitor-map-loading--error">{loadError}</div>}
//         </div>

//         <div className={`visitor-panel ${sheetExpanded ? 'is-expanded' : ''}`}>
//           <button className="visitor-panel__handle" onClick={() => setSheetExpanded((v) => !v)} aria-label="Afficher/masquer le panneau">
//             <span />
//           </button>

//           {selectedFacility ? (
//             <FacilityDetail
//               feature={selectedFacility}
//               onBack={handleBackToList}
//               routePreview={routePreview}
//               previewLoading={previewLoading}
//               onPreviewMode={handlePreviewMode}
//               onValidateRoute={handleValidateRoute}
//               onCancelPreview={handleCancelPreview}
//               navigating={navigatingInfo}
//               onStopNavigation={handleStopNavigation}
//             />
//           ) : (
//             <ExplorePanel
//               query={query}
//               onQueryChange={(v) => {
//                 setQuery(v);
//                 setTab('search');
//               }}
//               tab={tab}
//               onTabChange={setTab}
//               searchResults={searchResults}
//               nearbyResults={nearbyResults}
//               nearbyLoading={nearbyLoading}
//               onSelectFacility={handleSelectFacility}
//               onRequestNearby={computeNearby}
//               geoError={geoError}
//             />
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// export default VisitorApp;

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { authService } from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import useGeolocation from './hooks/useGeolocation';
import useDistanceMeasure from './hooks/useDistanceMeasure';
import { haversineKm, distanceToRouteMeters } from './utils/geo';
import { getItinerary } from './utils/osrm';
import VisitorMap from './components/VisitorMap';
import ExplorePanel from './components/ExplorePanel';
import FacilityDetail from './components/FacilityDetail';
import AlertBanner from './components/AlertBanner';
import LocationConfirm from './components/LocationConfirm';
import NavigationGuide from './components/NavigationGuide';
import MapLegend from './components/MapLegend';
import ProfileMenu from './components/ProfileMenu';
import DistancePanel from './components/DistancePanel';
import LogoutConfirm from '../components/LogoutConfirm';
import './VisitorApp.css';
 
const OFF_ROUTE_THRESHOLD_M = 300;
const ARRIVAL_THRESHOLD_M = 60;
 
function VisitorApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [showProfile, setShowProfile] = useState(false);
 
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [loadError, setLoadError] = useState(null);
 
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('search');
  const [nearbyResults, setNearbyResults] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
 
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
 
  const [routePreview, setRoutePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pendingLocateCallbackRef = useRef(null);
 
  const { position, error: geoError, watching, locateOnce, startWatch, stopWatch } = useGeolocation();
 
  // Mesure de distance entre deux points cliqués sur la carte —
  // fonctionne totalement indépendamment de la géolocalisation ci-dessus.
  const measure = useDistanceMeasure();
 
  const lastGoodDistanceRef = useRef(null);
 
  useEffect(() => {
    api
      .get('/facilities/geojson')
      .then((res) => {
        setFacilities(res.data.features || []);
        setLoadError(null);
      })
      .catch(() => setLoadError("Impossible de charger les établissements. Vérifiez votre connexion."))
      .finally(() => setLoadingFacilities(false));
  }, []);
 
  const requestLocation = useCallback((onGranted) => {
    pendingLocateCallbackRef.current = onGranted || null;
    setShowLocationConfirm(true);
  }, []);
 
  const handleAcceptLocation = useCallback(() => {
    setShowLocationConfirm(false);
    const callback = pendingLocateCallbackRef.current;
    pendingLocateCallbackRef.current = null;
    locateOnce(
      (coords) => {
        setFlyTo({ coords, zoom: 16 });
        callback?.(coords);
      },
      (msg) => setAlert({ message: msg, variant: 'warning' })
    );
  }, [locateOnce]);
 
  const handleCancelLocation = useCallback(() => {
    setShowLocationConfirm(false);
    pendingLocateCallbackRef.current = null;
  }, []);
 
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return facilities;
    return facilities.filter((f) => (f.properties.name || '').toLowerCase().includes(q));
  }, [facilities, query]);
 
  const computeNearby = useCallback(() => {
    if (!position) {
      requestLocation(() => {});
      return;
    }
    setNearbyLoading(true);
    const [lat, lon] = position;
    const withDistance = facilities
      .map((f) => {
        const [flon, flat] = f.geometry.coordinates;
        const distanceKm = haversineKm(lat, lon, flat, flon);
        return { ...f, properties: { ...f.properties, __distanceKm: distanceKm } };
      })
      .sort((a, b) => a.properties.__distanceKm - b.properties.__distanceKm)
      .slice(0, 20);
    setNearbyResults(withDistance);
    setNearbyLoading(false);
  }, [position, facilities, requestLocation]);
 
  useEffect(() => {
    if (tab === 'nearby' && position) computeNearby();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, tab]);
 
  const handleSelectFacility = useCallback((feature) => {
    setSelectedFacility(feature);
    setRoutePreview(null);
    setSheetExpanded(true);
  }, []);
 
  const handleBackToList = useCallback(() => {
    setSelectedFacility(null);
    setRoutePreview(null);
  }, []);
 
  const handlePreviewMode = useCallback(
    async (mode, coordsOverride) => {
      if (!selectedFacility) return;
      const coords = coordsOverride || position;
      if (!coords) {
        requestLocation((granted) => handlePreviewMode(mode, granted));
        return;
      }
      setPreviewLoading(true);
      setRoutePreview(null);
      try {
        const [lon, lat] = selectedFacility.geometry.coordinates;
        const result = await getItinerary(coords[0], coords[1], lat, lon, mode);
        setRoutePreview({ mode, ...result });
      } catch {
        setAlert({ message: "Impossible de calculer l'itinéraire pour le moment.", variant: 'warning' });
      } finally {
        setPreviewLoading(false);
      }
    },
    [selectedFacility, position, requestLocation]
  );
 
  const handleCancelPreview = useCallback(() => setRoutePreview(null), []);
 
  const handleValidateRoute = useCallback(() => {
    if (!routePreview || !selectedFacility) return;
    const [lon, lat] = selectedFacility.geometry.coordinates;
    setActiveRoute({
      facilityId: selectedFacility.properties.id,
      facilityName: selectedFacility.properties.name,
      destination: [lat, lon],
      mode: routePreview.mode,
      geometry: routePreview.geometry,
      steps: routePreview.steps,
      distanceMeters: routePreview.distanceMeters,
      durationSeconds: routePreview.durationSeconds,
    });
    setRoutePreview(null);
    lastGoodDistanceRef.current = Date.now();
    startWatch();
    setAlert({ message: `Navigation démarrée vers ${selectedFacility.properties.name || "l'établissement"}.`, variant: 'success' });
  }, [routePreview, selectedFacility, startWatch]);
 
  const handleStopNavigation = useCallback(() => {
    setActiveRoute(null);
    stopWatch();
    setAlert(null);
  }, [stopWatch]);
 
  useEffect(() => {
    if (!activeRoute || !position) return;
 
    const distToDestKm = haversineKm(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1]);
    if (distToDestKm * 1000 <= ARRIVAL_THRESHOLD_M) {
      setAlert({ message: 'Vous êtes arrivé à destination.', variant: 'success' });
      setActiveRoute(null);
      stopWatch();
      return;
    }
 
    const offRouteM = distanceToRouteMeters(position[0], position[1], activeRoute.geometry);
    if (offRouteM > OFF_ROUTE_THRESHOLD_M) {
      setAlert({
        message: `Vous semblez être hors de l'itinéraire prévu (à ${Math.round(offRouteM)} m). Vous êtes peut-être perdu.`,
        variant: 'warning',
      });
    } else if (alert?.variant === 'warning') {
      setAlert(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, activeRoute]);
 
  const handleRecalculate = useCallback(async () => {
    if (!activeRoute || !position) return;
    try {
      const result = await getItinerary(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1], activeRoute.mode);
      setActiveRoute((prev) => ({ ...prev, geometry: result.geometry, steps: result.steps, distanceMeters: result.distanceMeters, durationSeconds: result.durationSeconds }));
      setAlert(null);
    } catch {
      setAlert({ message: 'Impossible de recalculer pour le moment.', variant: 'warning' });
    }
  }, [activeRoute, position]);
 
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };
 
  const confirmLogout = () => {
    authService.logout();
    navigate('/login');
  };
 
  // Activer le mode "mesurer une distance" ferme la fiche établissement
  // ouverte, pour éviter toute confusion entre les deux flux.
  const handleToggleMeasure = useCallback(() => {
    setSelectedFacility(null);
    setRoutePreview(null);
    measure.toggle();
  }, [measure]);
 
  const mapRoute = activeRoute
    ? { geometry: activeRoute.geometry, active: true, mode: activeRoute.mode }
    : routePreview
    ? { geometry: routePreview.geometry, active: false }
    : null;
 
  const highlightedIds = useMemo(() => {
    if (selectedFacility) return null;
    if (tab === 'nearby' && nearbyResults.length > 0) {
      return new Set(nearbyResults.map((f) => f.properties.id));
    }
    if (tab === 'search' && query.trim()) {
      return new Set(searchResults.map((f) => f.properties.id));
    }
    return null;
  }, [tab, query, searchResults, nearbyResults, selectedFacility]);
 
  const navigatingInfo = activeRoute
    ? { facilityId: activeRoute.facilityId, mode: activeRoute.mode, distanceMeters: activeRoute.distanceMeters, durationSeconds: activeRoute.durationSeconds }
    : null;
 
  return (
    <div className="visitor-app">
      {showLocationConfirm && (
        <LocationConfirm onAccept={handleAcceptLocation} onCancel={handleCancelLocation} />
      )}
 
      {showLogoutConfirm && (
        <LogoutConfirm onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      )}
 
      <header className="visitor-header">
        <div className="visitor-header__brand">
          <i className="bi bi-heart-pulse-fill"></i> Santé Madagascar
        </div>
        <div className="visitor-header__actions">
          <button
            className="visitor-header__icon-btn"
            onClick={handleToggleMeasure}
            title="Mesurer une distance entre deux points"
          >
            <i className={`bi bi-rulers ${measure.active ? 'is-active' : ''}`}></i>
          </button>
          <button className="visitor-header__icon-btn" onClick={() => requestLocation()} title="Me localiser">
            <i className={`bi bi-crosshair ${watching ? 'is-active' : ''}`}></i>
          </button>
          <ThemeToggle />
          {user && (
            <div className="visitor-header__profile-wrap">
              
              <button className="visitor-header__avatar-btn" onClick={() => { console.log('CLIC AVATAR', showProfile); setShowProfile((v) => !v); }} title="Mon profil">
                {user.avatar ? (
                  <img src={user.avatar} alt="avatar" />
                ) : (
                  <span>{(user.username || user.email || '?').charAt(0).toUpperCase()}</span>
                )}
              </button>
              {showProfile && (
                <ProfileMenu
                  onClose={() => setShowProfile(false)}
                  onUpdate={(updatedUser) => {
                    setUser(updatedUser);
                    setShowProfile(false);
                  }}
                  onLogout={() => {
                    setShowProfile(false);
                    handleLogout();
                  }}
                />
              )}
            </div>
          )}
        </div>
      </header>
 
      <div className="visitor-body">
        <div className="visitor-map-wrap">
          <VisitorMap
            facilities={facilities}
            userPosition={position}
            selectedFacility={selectedFacility}
            onSelectFacility={handleSelectFacility}
            flyTo={flyTo}
            route={mapRoute}
            highlightedIds={highlightedIds}
            measureActive={measure.active}
            onMeasureClick={measure.handleMapClick}
            measurePointA={measure.pointA}
            measurePointB={measure.pointB}
          />
 
          <div className="visitor-map-overlay-top">
            {activeRoute && (
              <NavigationGuide steps={activeRoute.steps} position={position} destinationName={activeRoute.facilityName} />
            )}
            <AlertBanner
              message={alert?.message}
              variant={alert?.variant}
              onDismiss={() => setAlert(null)}
              onAction={activeRoute && alert?.variant === 'warning' ? handleRecalculate : undefined}
              actionLabel="Recalculer l'itinéraire"
            />
            {measure.active && (
              <DistancePanel
                pointA={measure.pointA}
                pointB={measure.pointB}
                straightLineKm={measure.straightLineKm}
                route={measure.route}
                loading={measure.loading}
                error={measure.error}
                onComputeRoute={measure.computeRoute}
                onReset={measure.reset}
                onClose={handleToggleMeasure}
              />
            )}
          </div>
 
          <MapLegend />
 
          {loadingFacilities && (
            <div className="visitor-map-loading">
              <i className="bi bi-arrow-repeat spin"></i> Chargement des établissements…
            </div>
          )}
          {loadError && <div className="visitor-map-loading visitor-map-loading--error">{loadError}</div>}
        </div>
 
        <div className={`visitor-panel ${sheetExpanded ? 'is-expanded' : ''}`}>
          <button className="visitor-panel__handle" onClick={() => setSheetExpanded((v) => !v)} aria-label="Afficher/masquer le panneau">
            <span />
          </button>
 
          {selectedFacility ? (
            <FacilityDetail
              feature={selectedFacility}
              onBack={handleBackToList}
              routePreview={routePreview}
              previewLoading={previewLoading}
              onPreviewMode={handlePreviewMode}
              onValidateRoute={handleValidateRoute}
              onCancelPreview={handleCancelPreview}
              navigating={navigatingInfo}
              onStopNavigation={handleStopNavigation}
            />
          ) : (
            <ExplorePanel
              query={query}
              onQueryChange={(v) => {
                setQuery(v);
                setTab('search');
              }}
              tab={tab}
              onTabChange={setTab}
              searchResults={searchResults}
              nearbyResults={nearbyResults}
              nearbyLoading={nearbyLoading}
              onSelectFacility={handleSelectFacility}
              onRequestNearby={computeNearby}
              geoError={geoError}
            />
          )}
        </div>
      </div>
    </div>
  );
}
 
export default VisitorApp;
 