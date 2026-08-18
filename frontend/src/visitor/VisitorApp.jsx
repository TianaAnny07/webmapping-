// src/visitor/VisitorApp.jsx

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { authService } from '../services/api';
import useGeolocation from './hooks/useGeolocation';
import useDistanceMeasure from './hooks/useDistanceMeasure';
import { haversineKm, distanceToRouteMeters } from './utils/geo';
import { getItinerary, buildFallbackRoute } from './utils/osrm';
import { buildStepInstruction } from '../services/instructions';
import VisitorMap from './components/VisitorMap';
import ExplorePanel from './components/ExplorePanel';
import FacilityDetail from './components/FacilityDetail';
import AlertBanner from './components/AlertBanner';
import LocationConfirm from './components/LocationConfirm';
import MapLegend from './components/MapLegend';
import ProfileMenu from './components/ProfileMenu';
import DistancePanel from './components/DistancePanel';
import LogoutConfirm from '../components/LogoutConfirm';
import NavigationOverlay from './components/NavigationOverlay';
import VoiceGuide from './components/VoiceGuide';
import Toast from './components/Toast';
import { useFacilitiesCache } from './hooks/useFacilitiesCache';
import './VisitorApp.css';

const OFF_ROUTE_THRESHOLD_M = 300;
const ARRIVAL_THRESHOLD_M = 60;
const STEP_ADVANCE_THRESHOLD_M = 40; // distance au point de manœuvre suivant pour considérer l'étape franchie
const GPS_NOISE_FLOOR_M = 8; // seuil plancher, utilisé si le navigateur ne fournit pas de précision

function buildInstructionState(step) {
  if (!step) return { instruction: 'Continuer tout droit', distance: '' };
  return {
    instruction: buildStepInstruction(step),
    distance: step.distanceMeters ? `${Math.round(step.distanceMeters)} m` : '',
  };
}

function VisitorApp() {
  const navigate = useNavigate();
  const [user, setUser] = useState(authService.getCurrentUser());
  const [showProfile, setShowProfile] = useState(false);

  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [usingCache, setUsingCache] = useState(false);
  const { cachedData, saveToCache, isLoading: cacheLoading } = useFacilitiesCache();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState('search');
  const [nearbyResults, setNearbyResults] = useState([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const [selectedFacility, setSelectedFacility] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [manualLocationMode, setManualLocationMode] = useState(false);

  const [routePreview, setRoutePreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeRoute, setActiveRoute] = useState(null);
  const [alert, setAlert] = useState(null);
  const [showLocationConfirm, setShowLocationConfirm] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const pendingLocateCallbackRef = useRef(null);

  // État pour le guidage vocal
  const [voiceGuideRoute, setVoiceGuideRoute] = useState(null);
  const [offRouteMeters, setOffRouteMeters] = useState(0);
  const voiceGuideRef = useRef(null);

  const { position, accuracy, heading, error: geoError, watching, locateOnce, startWatch, stopWatch, setPosition } = useGeolocation();

  // États pour le toast
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  // Mesure de distance entre deux points cliqués sur la carte
  const measure = useDistanceMeasure();

  // Calcul du pourcentage de progression
  const [progressPercent, setProgressPercent] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Suivi de l'étape actuelle pour l'instruction (basé sur la position GPS réelle)
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState({ instruction: 'Continuer tout droit', distance: '' });
  const currentStepIndexRef = useRef(0);

  // Dernière position "stable" utilisée pour filtrer le bruit GPS naturel
  const lastStablePositionRef = useRef(null);

  // ===== CHARGEMENT DES ÉTABLISSEMENTS AVEC CACHE =====
  useEffect(() => {
    // Si le cache est encore en train de charger, on attend
    if (cacheLoading) return;

    // Si on a des données en cache, on les affiche immédiatement
    if (cachedData?.features?.length > 0) {
      setFacilities(cachedData.features);
      setUsingCache(true);
      setLoadingFacilities(false);
      setLoadError(null);
    }

    // Tentative de chargement depuis le serveur (mise à jour en arrière-plan)
    api
      .get('/facilities/geojson')
      .then((res) => {
        const features = res.data.features || [];
        setFacilities(features);
        setUsingCache(false);
        setLoadError(null);
        // Sauvegarder dans le cache pour la prochaine fois
        saveToCache(features);
      })
      .catch(() => {
        // Si pas de cache et pas de réseau, on affiche une erreur
        if (!cachedData?.features?.length) {
          setLoadError("Impossible de charger les établissements. Vérifiez votre connexion. Certaines données peuvent être disponibles hors-ligne.");
        }
      })
      .finally(() => setLoadingFacilities(false));
  }, [cachedData, saveToCache, cacheLoading]);

  // ===== MISE À JOUR DE LA PROGRESSION ET DE L'ÉTAPE ACTUELLE =====
  // L'étape courante avance uniquement quand la position réelle se rapproche du
  // point de manœuvre suivant. C'est cette valeur (currentStepIndex) qui pilote
  // à la fois l'affichage (currentInstruction) ET l'annonce vocale (VoiceGuide).
  useEffect(() => {
    if (!activeRoute || !position) {
      setProgressPercent(0);
      setDistanceRemaining(0);
      setTimeRemaining(0);
      lastStablePositionRef.current = null;
      return;
    }

    // Filtrer le bruit GPS : si le déplacement depuis la dernière position stable
    // est plus petit que la précision réelle du capteur (accuracy), c'est du bruit,
    // pas un vrai déplacement. On garde un plancher minimum au cas où le navigateur
    // ne fournit pas cette info.
    const noiseThreshold = Math.max(GPS_NOISE_FLOOR_M, (accuracy || 0) * 0.8);
    const lastStable = lastStablePositionRef.current;
    if (lastStable) {
      const movedKm = haversineKm(position[0], position[1], lastStable[0], lastStable[1]);
      if (movedKm * 1000 < noiseThreshold) {
        return; // pas un vrai déplacement, on ne recalcule rien
      }
    }
    lastStablePositionRef.current = position;

    const totalDistance = activeRoute.distanceMeters || 1;
    const distToDestKm = haversineKm(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1]);
    const distToDestM = distToDestKm * 1000;

    const progress = Math.max(0, Math.min(100, ((totalDistance - distToDestM) / totalDistance) * 100));
    setProgressPercent(progress);
    setDistanceRemaining(distToDestM);

    const speed = activeRoute.mode === 'walking' ? 5 : activeRoute.mode === 'cycling' ? 15 : 30;
    const timeHours = distToDestKm / speed;
    setTimeRemaining(Math.round(timeHours * 60));

    const steps = activeRoute.steps;
    if (!steps || steps.length === 0) return;

    // Avancer d'autant d'étapes que nécessaire si on est déjà proche du point suivant
    // (steps[i].location est déjà au format [lat, lon], voir osrm.js)
    let idx = currentStepIndexRef.current;
    while (idx < steps.length - 1) {
      const nextLocation = steps[idx + 1]?.location;
      if (!nextLocation) break;
      const distToNextKm = haversineKm(position[0], position[1], nextLocation[0], nextLocation[1]);
      if (distToNextKm * 1000 <= STEP_ADVANCE_THRESHOLD_M) {
        idx += 1;
      } else {
        break;
      }
    }

    if (idx !== currentStepIndexRef.current) {
      currentStepIndexRef.current = idx;
      setCurrentStepIndex(idx);
      setCurrentInstruction(buildInstructionState(steps[idx]));
    }
  }, [activeRoute, position, accuracy]);

  // ===== GÉOLOCALISATION =====
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
        setFlyTo({ coords, zoom: 16, ts: Date.now() });
        callback?.(coords);
      },
      (msg) => setAlert({ message: msg, variant: 'warning' })
    );
  }, [locateOnce]);

  const handleCancelLocation = useCallback(() => {
    setShowLocationConfirm(false);
    pendingLocateCallbackRef.current = null;
  }, []);

  // ===== RECHERCHE ET RÉSULTATS =====
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

  // ===== SÉLECTION D'ÉTABLISSEMENT =====
  const handleSelectFacility = useCallback((feature) => {
    setSelectedFacility(feature);
    setRoutePreview(null);
    setSheetExpanded(true);
  }, []);

  const handleBackToList = useCallback(() => {
    setSelectedFacility(null);
    setRoutePreview(null);
  }, []);

  // ===== ITINÉRAIRE =====
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
      } catch (error) {
        // Fallback : itinéraire en ligne droite si OSRM échoue
        const [lon, lat] = selectedFacility.geometry.coordinates;
        const fallback = buildFallbackRoute(coords[0], coords[1], lat, lon, mode);
        setRoutePreview({ mode, ...fallback });
        setAlert({
          message: "Signal indisponible — itinéraire approximatif en ligne droite.",
          variant: 'warning',
          isFallback: true
        });
      } finally {
        setPreviewLoading(false);
      }
    },
    [selectedFacility, position, requestLocation]
  );

  const handleCancelPreview = useCallback(() => setRoutePreview(null), []);
  const handleSelectRouteOption = useCallback((index) => {
  setRoutePreview((prev) => {
    if (!prev?.options?.[index]) return prev;
    return { ...prev, ...prev.options[index], selectedOptionIndex: index };
  });
}, []);

  // ===== VALIDATION DE L'ITINÉRAIRE =====
  const handleValidateRoute = useCallback(() => {
    if (!routePreview || !selectedFacility) return;
    const [lon, lat] = selectedFacility.geometry.coordinates;
    const routeData = {
      facilityId: selectedFacility.properties.id,
      facilityName: selectedFacility.properties.name,
      destination: [lat, lon],
      mode: routePreview.mode,
      geometry: routePreview.geometry,
      steps: routePreview.steps,
      distanceMeters: routePreview.distanceMeters,
      durationSeconds: routePreview.durationSeconds,
    };
    setActiveRoute(routeData);
    setVoiceGuideRoute(routeData);
    setRoutePreview(null);
    setOffRouteMeters(0);
    currentStepIndexRef.current = 0;
    setCurrentStepIndex(0);
    lastStablePositionRef.current = null;

    // Initialiser avec la première instruction réelle
    setCurrentInstruction(buildInstructionState(routePreview.steps?.[0]));

    startWatch();

    setToastMessage(`Navigation démarrée vers ${selectedFacility.properties.name || "l'établissement"}`);
    setToastVariant('success');
    setShowToast(true);
  }, [routePreview, selectedFacility, startWatch]);

  // ===== NAVIGATION =====
  const handleStopNavigation = useCallback(() => {
    setActiveRoute(null);
    setVoiceGuideRoute(null);
    setOffRouteMeters(0);
    currentStepIndexRef.current = 0;
    setCurrentStepIndex(0);
    setCurrentInstruction({ instruction: 'Continuer tout droit', distance: '' });
    lastStablePositionRef.current = null;
    stopWatch();
    setAlert(null);
    setProgressPercent(0);
    setDistanceRemaining(0);
    setTimeRemaining(0);
  }, [stopWatch]);

  // ===== SURVEILLANCE DE LA POSITION (arrivée / hors-route) =====
  useEffect(() => {
    if (!activeRoute || !position) return;

    const distToDestKm = haversineKm(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1]);
    if (distToDestKm * 1000 <= ARRIVAL_THRESHOLD_M) {
      voiceGuideRef.current?.announceArrival();
      setCurrentInstruction({ instruction: '✅ Vous êtes arrivé à destination !', distance: '' });
      setProgressPercent(100);
      setDistanceRemaining(0);
      setTimeRemaining(0);
      setToastMessage('Vous êtes arrivé à destination !');
      setToastVariant('success');
      setShowToast(true);
      setActiveRoute(null);
      setVoiceGuideRoute(null);
      stopWatch();
      return;
    }

    const offRouteM = distanceToRouteMeters(position[0], position[1], activeRoute.geometry);
    setOffRouteMeters(offRouteM);
    // Ignorer les valeurs aberrantes (> 500 km = position incohérente)
    if (offRouteM > OFF_ROUTE_THRESHOLD_M && offRouteM < 500000) {
      setAlert({
        message: `Vous êtes hors de l'itinéraire (à ${Math.round(offRouteM)} m). Recalculez pour vous guider.`,
        variant: 'warning',
      });
    } else if (offRouteM >= 500000) {
      // Distance aberrante : position GPS incohérente, on ignore silencieusement
      setOffRouteMeters(0);
    } else if (alert?.variant === 'warning' && alert?.message?.includes('hors')) {
      setAlert(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position, activeRoute]);

  const handleRecalculate = useCallback(async () => {
    if (!activeRoute || !position) return;
    try {
      const result = await getItinerary(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1], activeRoute.mode);
      const updatedRoute = {
        ...activeRoute,
        geometry: result.geometry,
        steps: result.steps,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        isFallback: false,
      };
      setActiveRoute(updatedRoute);
      setVoiceGuideRoute(updatedRoute);
      setOffRouteMeters(0);
      currentStepIndexRef.current = 0;
      setCurrentStepIndex(0);
      setCurrentInstruction(buildInstructionState(result.steps?.[0]));
      lastStablePositionRef.current = null;
      setAlert(null);
      setToastMessage('Itinéraire recalculé avec succès');
      setToastVariant('success');
      setShowToast(true);
    } catch {
      // Fallback en ligne droite lors du recalcul
      const fallback = buildFallbackRoute(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1], activeRoute.mode);
      const updatedRoute = {
        ...activeRoute,
        ...fallback,
        isFallback: true,
      };
      setActiveRoute(updatedRoute);
      setVoiceGuideRoute(updatedRoute);
      setAlert({
        message: "Signal indisponible — itinéraire approximatif en ligne droite.",
        variant: 'warning',
        isFallback: true
      });
    }
  }, [activeRoute, position]);

  // ===== PROFIL ET DÉCONNEXION =====
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // ===== MESURE DE DISTANCE =====
  const handleToggleMeasure = useCallback(() => {
    setSelectedFacility(null);
    setRoutePreview(null);
    measure.toggle();
  }, [measure]);

  // ===== SÉLECTION MANUELLE DE LA POSITION =====
  const handleMapClickForLocation = useCallback((coords) => {
    if (manualLocationMode) {
      setPosition(coords);
      setFlyTo({ coords, zoom: 16, ts: Date.now() });
      setManualLocationMode(false);
      setToastMessage('Position définie manuellement');
      setToastVariant('success');
      setShowToast(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manualLocationMode]);

  const toggleManualLocation = useCallback(() => {
    setManualLocationMode((v) => !v);
    setToastMessage(
      manualLocationMode
        ? 'Mode de sélection désactivé'
        : 'Cliquez sur la carte pour définir votre position'
    );
    setToastVariant('info');
    setShowToast(true);
  }, [manualLocationMode]);

  // ===== MAP ROUTE =====
  const mapRoute = activeRoute
    ? { geometry: activeRoute.geometry, active: true, mode: activeRoute.mode, isFallback: activeRoute.isFallback }
    : routePreview
    ? { geometry: routePreview.geometry, active: false, isFallback: routePreview.isFallback }
    : null;

  // ===== HIGHLIGHTED IDS =====
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
      {/* ===== MODALES ===== */}
      {showLocationConfirm && (
        <LocationConfirm onAccept={handleAcceptLocation} onCancel={handleCancelLocation} />
      )}

      {showLogoutConfirm && (
        <LogoutConfirm onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      )}

      {/* ===== TOAST ===== */}
      {showToast && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          duration={3000}
          onDismiss={() => setShowToast(false)}
        />
      )}

      {/* ===== HEADER ===== */}
      <header className="visitor-header">
        <div className="visitor-header__brand">
          <i className="bi bi-heart-pulse-fill"></i>
          <span>SanteGeo Madagascar</span>
        </div>
        <div className="visitor-header__actions">
          <button
            className="visitor-header__icon-btn"
            onClick={handleToggleMeasure}
            title="Mesurer une distance"
          >
            <i className={`bi bi-rulers ${measure.active ? 'is-active' : ''}`}></i>
          </button>
          <button
            className="visitor-header__icon-btn"
            onClick={toggleManualLocation}
            title="Définir ma position manuellement"
          >
            <i className={`bi bi-pin-map ${manualLocationMode ? 'is-active' : ''}`}></i>
          </button>
         
          {user && (
            <div className="visitor-header__profile-wrap">
              <button
                className="visitor-header__avatar-btn"
                onClick={() => setShowProfile((v) => !v)}
                title="Mon profil"
              >
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

      {/* ===== BODY ===== */}
      <div className="visitor-body">
        <div className="visitor-map-wrap">
          {/* ===== CARTE ===== */}
          <VisitorMap
            facilities={facilities}
            userPosition={position}
            userAccuracy={accuracy}
            userHeading={heading}
            selectedFacility={selectedFacility}
            onSelectFacility={handleSelectFacility}
            flyTo={flyTo}
            route={mapRoute}
            highlightedIds={highlightedIds}
            measureActive={measure.active}
            onMeasureClick={measure.handleMapClick}
            measurePointA={measure.pointA}
            measurePointB={measure.pointB}
            measureRoute={measure.route}
            onMapClick={handleMapClickForLocation}
            manualLocationMode={manualLocationMode}
            onRequestLocation={() => requestLocation()}
            
          />

          {/* ===== OVERLAYS ===== */}
          <div className="visitor-map-overlay-top">
            {/* Alerte "perdu" */}
            {alert && alert.variant === 'warning' && (
              <AlertBanner
                message={alert.message}
                variant={alert.variant}
                onDismiss={() => setAlert(null)}
                onAction={activeRoute ? handleRecalculate : undefined}
                actionLabel="Recalculer l'itinéraire"
              />
            )}
            {routePreview?.options?.length > 1 && (
    <div className="route-options-panel">
      {routePreview.options.map((opt, i) => (
        <button
          key={i}
          className={`route-option-btn ${i === (routePreview.selectedOptionIndex ?? 0) ? 'is-selected' : ''}`}
          onClick={() => handleSelectRouteOption(i)}
        >
          {i === 0 ? '⚡ Raccourci' : `Itinéraire ${i + 1}`} · {(opt.distanceMeters / 1000).toFixed(1)} km
        </button>
      ))}
    </div>
  )}


            {/* Navigation Overlay - Une seule carte avec tout regroupé */}
            {activeRoute && (
              <NavigationOverlay
                instruction={currentInstruction.instruction}
                subInstruction={currentInstruction.distance ? `${currentInstruction.distance} • suivre la route` : ''}
                isVoiceActive={!!voiceGuideRoute}
                onToggleVoice={() => setVoiceGuideRoute(voiceGuideRoute ? null : activeRoute)}
                onRepeat={() => voiceGuideRef.current?.repeatInstruction()}
                onClose={handleStopNavigation}
                progressPercent={progressPercent}
                distanceRemaining={distanceRemaining}
                timeRemaining={timeRemaining}
                destinationName={activeRoute.facilityName}
                isFallback={activeRoute.isFallback}
              />
            )}

            {/* Bouton "Suis-je sur la bonne route ?" */}
            {activeRoute && voiceGuideRoute && (
              <button
                className="visitor-header__icon-btn voice-ask-btn"
                onClick={() => voiceGuideRef.current?.askIfOnTrack()}
                title="Suis-je sur la bonne route ?"
              >
                <i className="bi bi-question-circle-fill"></i>
              </button>
            )}

            {/* VoiceGuide - composant de guidage vocal (piloté par currentStepIndex, basé sur le GPS) */}
            {activeRoute && (
              <VoiceGuide
                ref={voiceGuideRef}
                route={activeRoute}
                isActive={!!voiceGuideRoute}
                currentStepIndex={currentStepIndex}
                offRouteMeters={offRouteMeters}
              />
            )}

            {/* Panneau de mesure de distance */}
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
                onSetPoint={measure.setPoint}
              />
            )}
          </div>

          {/* ===== LÉGENDE ===== */}
          <MapLegend />

          {/* ===== CHARGEMENT ===== */}
          {loadingFacilities && (
            <div className="visitor-map-loading">
              <i className="bi bi-arrow-repeat spin"></i> Chargement des établissements…
            </div>
          )}
          {usingCache && !loadError && (
            <div className="visitor-map-loading visitor-map-loading--cache">
              <i className="bi bi-wifi-off"></i> Données hors-ligne (cache)
            </div>
          )}
          {loadError && (
            <div className="visitor-map-loading visitor-map-loading--error">
              <i className="bi bi-exclamation-triangle-fill"></i> {loadError}
            </div>
          )}
        </div>

        {/* ===== PANEL LATÉRAL / BOTTOM SHEET ===== */}
        <div className={`visitor-panel ${sheetExpanded ? 'is-expanded' : ''}`}>
          <button
            className="visitor-panel__handle"
            onClick={() => setSheetExpanded((v) => !v)}
            aria-label="Afficher/masquer le panneau"
          >
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
              progressPercent={progressPercent}
              distanceRemaining={distanceRemaining}
              timeRemaining={timeRemaining}
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