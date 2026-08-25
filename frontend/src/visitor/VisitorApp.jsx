// src/visitor/VisitorApp.jsx

import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { authService } from '../services/api';
import useGeolocation from './hooks/useGeolocation';
import useDistanceMeasure from './hooks/useDistanceMeasure';
import { haversineKm, distanceToRouteMeters } from './utils/geo';
import { getItinerary, buildFallbackRoute } from './utils/osrm';
import { reverseGeocode } from './utils/geocode';
import { fetchCurrentWeather } from './utils/weather';
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
import NearbySuggestions from './components/NearbySuggestions';
import Toast from './components/Toast';
import { useFacilitiesCache } from './hooks/useFacilitiesCache';
import './VisitorApp.css';

const OFF_ROUTE_THRESHOLD_M = 300;
const ARRIVAL_THRESHOLD_M = 60;
const STEP_ADVANCE_THRESHOLD_M = 40;
const GPS_NOISE_FLOOR_M = 8;
// Doit correspondre à la durée de l'animation flyTo dans FlyToLocation
// (map.flyTo(..., { duration: 1.5 }) = 1.5 seconde). On ajoute une petite
// marge pour laisser l'animation se terminer visuellement avant d'ouvrir
// la fenêtre de suggestions par-dessus la carte.
const MAP_FLY_ANIMATION_MS = 1500;
const SUGGESTIONS_DELAY_MS = MAP_FLY_ANIMATION_MS + 300;

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
  const [showNearbySuggestions, setShowNearbySuggestions] = useState(false);
  const hasSuggestedRef = useRef(false);
  const suggestionsTimerRef = useRef(null);
  const [locationLabel, setLocationLabel] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [weather, setWeather] = useState(null);
  const pendingLocateCallbackRef = useRef(null);

  const [voiceGuideRoute, setVoiceGuideRoute] = useState(null);
  const [offRouteMeters, setOffRouteMeters] = useState(0);
  const voiceGuideRef = useRef(null);

  const { position, accuracy, heading, error: geoError, watching, locateOnce, startWatch, stopWatch, setPosition } = useGeolocation();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastVariant, setToastVariant] = useState('success');

  const measure = useDistanceMeasure();

  const [progressPercent, setProgressPercent] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(0);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState({ instruction: 'Continuer tout droit', distance: '' });
  const currentStepIndexRef = useRef(0);

  const lastStablePositionRef = useRef(null);

  // Simulation
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationInterval, setSimulationInterval] = useState(null);
  const [simulationProgress, setSimulationProgress] = useState(0);

  // ===== CHARGEMENT DES ÉTABLISSEMENTS =====
  useEffect(() => {
    if (cacheLoading) return;
    if (cachedData?.features?.length > 0) {
      setFacilities(cachedData.features);
      setUsingCache(true);
      setLoadingFacilities(false);
      setLoadError(null);
    }
    api
      .get('/facilities/geojson')
      .then((res) => {
        const features = res.data.features || [];
        setFacilities(features);
        setUsingCache(false);
        setLoadError(null);
        saveToCache(features);
      })
      .catch(() => {
        if (!cachedData?.features?.length) {
          setLoadError("Impossible de charger les établissements. Vérifiez votre connexion.");
        }
      })
      .finally(() => setLoadingFacilities(false));
  }, [cachedData, saveToCache, cacheLoading]);

  // ===== MISE À JOUR DE LA PROGRESSION =====
  useEffect(() => {
    if (!activeRoute || !position) {
      setProgressPercent(0);
      setDistanceRemaining(0);
      setTimeRemaining(0);
      lastStablePositionRef.current = null;
      return;
    }

    const noiseThreshold = Math.max(GPS_NOISE_FLOOR_M, (accuracy || 0) * 0.8);
    const lastStable = lastStablePositionRef.current;
    if (lastStable) {
      const movedKm = haversineKm(position[0], position[1], lastStable[0], lastStable[1]);
      if (movedKm * 1000 < noiseThreshold) {
        return;
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

    // Pendant la simulation, startSimulation() gère lui-même l'avancement des
    // étapes (index calculé le long de la géométrie simulée). Ce bloc
    // "GPS réel" ne doit pas tourner en parallèle, sinon les deux mécanismes
    // se désynchronisent — c'était la cause du décalage voix/déplacement.
    if (isSimulating) return;

    const steps = activeRoute.steps;
    if (!steps || steps.length === 0) return;

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
  }, [activeRoute, position, accuracy, isSimulating]);

  // ===== SIMULATION =====
  const startSimulation = useCallback(() => {
    if (!activeRoute || !activeRoute.geometry || activeRoute.geometry.length < 2) {
      setToastMessage('Aucun itineraire a simuler');
      setToastVariant('warning');
      setShowToast(true);
      return;
    }

    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }

    setIsSimulating(true);
    setSimulationProgress(0);
    // Repart de zéro pour l'indexation d'étapes propre à la simulation —
    // évite de hériter d'un index laissé par une navigation GPS précédente.
    currentStepIndexRef.current = 0;
    setCurrentStepIndex(0);
    if (activeRoute.steps?.[0]) {
      setCurrentInstruction(buildInstructionState(activeRoute.steps[0]));
    }

    const routePoints = activeRoute.geometry;
    const totalPoints = routePoints.length;

    if (routePoints.length > 0) {
      const startPoint = routePoints[0];
      setPosition([startPoint[0], startPoint[1]]);
    }

    let currentIndex = 0;

    const interval = setInterval(() => {
      currentIndex += 1;

      if (currentIndex >= totalPoints) {
        clearInterval(interval);
        setSimulationInterval(null);
        setIsSimulating(false);
        setSimulationProgress(100);

        const endPoint = routePoints[totalPoints - 1];
        setPosition([endPoint[0], endPoint[1]]);

        setToastMessage('Vous etes arrive a destination !');
        setToastVariant('success');
        setShowToast(true);

        setTimeout(() => {
          handleStopNavigation();
        }, 2000);
        return;
      }

      const point = routePoints[currentIndex];
      setPosition([point[0], point[1]]);

      const progress = (currentIndex / totalPoints) * 100;
      setSimulationProgress(progress);

      setFlyTo({ coords: [point[0], point[1]], zoom: 16, ts: Date.now() });

      // FIX: utilise buildInstructionState (mêmes noms de champs que le reste
      // de l'app : distanceMeters + buildStepInstruction) au lieu de
      // step.maneuver?.instruction / step.distance qui n'existent pas dans
      // ce format de step — c'est ça qui empêchait l'instruction de
      // s'afficher pendant la simulation.
      if (activeRoute.steps?.length) {
        const stepIndex = Math.floor((currentIndex / totalPoints) * (activeRoute.steps.length - 1));
        if (stepIndex !== currentStepIndexRef.current) {
          currentStepIndexRef.current = stepIndex;
          setCurrentStepIndex(stepIndex);
          setCurrentInstruction(buildInstructionState(activeRoute.steps[stepIndex]));
        }
      }

    }, 300);

    setSimulationInterval(interval);
  }, [activeRoute, setPosition, simulationInterval]);

  const stopSimulation = useCallback(() => {
    if (simulationInterval) {
      clearInterval(simulationInterval);
      setSimulationInterval(null);
    }
    setIsSimulating(false);
    setSimulationProgress(0);
  }, [simulationInterval]);

  useEffect(() => {
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, [simulationInterval]);

  useEffect(() => {
    return () => {
      if (suggestionsTimerRef.current) {
        clearTimeout(suggestionsTimerRef.current);
      }
    };
  }, []);

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
        // Première activation de la position dans cette session : on propose
        // les établissements les plus proches par catégorie. Les activations
        // suivantes (ex: relancées depuis un calcul d'itinéraire) ne
        // redéclenchent pas la fenêtre pour ne pas être intrusif.
        if (!hasSuggestedRef.current) {
          hasSuggestedRef.current = true;
          // On attend que l'animation de la carte vers la position soit
          // terminée avant d'ouvrir la fenêtre — sinon elle masque la carte
          // avant même que tu aies vu ton point apparaître dessus.
          suggestionsTimerRef.current = setTimeout(() => {
            setShowNearbySuggestions(true);
          }, SUGGESTIONS_DELAY_MS);
        }
        // Reverse geocoding : nom du quartier/commune/district/région,
        // affiché dans le header. Ne bloque rien d'autre si ça échoue.
        setLocationLoading(true);
        reverseGeocode(coords[0], coords[1])
          .then((result) => setLocationLabel(result))
          .catch((err) => {
            console.error('Erreur reverse geocoding:', err);
            setLocationLabel(null);
          })
          .finally(() => setLocationLoading(false));

        fetchCurrentWeather(coords[0], coords[1])
          .then((result) => setWeather(result))
          .catch((err) => {
            console.error('Erreur météo:', err);
            setWeather(null);
          });

        callback?.(coords);
      },
      (msg) => setAlert({ message: msg, variant: 'warning' })
    );
  }, [locateOnce]);

  const handleCancelLocation = useCallback(() => {
    setShowLocationConfirm(false);
    pendingLocateCallbackRef.current = null;
  }, []);

  // ===== RECHERCHE =====
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
  }, [position, tab]);

  // ===== SÉLECTION =====
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
        const [lon, lat] = selectedFacility.geometry.coordinates;
        const fallback = buildFallbackRoute(coords[0], coords[1], lat, lon, mode);
        setRoutePreview({ mode, ...fallback });
        setAlert({
          message: "Signal indisponible - itineraire approximatif en ligne droite.",
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

  // ===== VALIDATION =====
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
    setCurrentInstruction(buildInstructionState(routePreview.steps?.[0]));
    startWatch();
    setToastMessage(`Navigation demarree vers ${selectedFacility.properties.name || "l'etablissement"}`);
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
    stopSimulation();
  }, [stopWatch, stopSimulation]);

  // ===== SURVEILLANCE =====
  useEffect(() => {
    if (!activeRoute || !position) return;

    const distToDestKm = haversineKm(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1]);
    if (distToDestKm * 1000 <= ARRIVAL_THRESHOLD_M) {
      voiceGuideRef.current?.announceArrival();
      setCurrentInstruction({ instruction: 'Vous etes arrive a destination !', distance: '' });
      setProgressPercent(100);
      setDistanceRemaining(0);
      setTimeRemaining(0);
      setToastMessage('Vous etes arrive a destination !');
      setToastVariant('success');
      setShowToast(true);
      setActiveRoute(null);
      setVoiceGuideRoute(null);
      stopWatch();
      return;
    }

    const offRouteM = distanceToRouteMeters(position[0], position[1], activeRoute.geometry);
    setOffRouteMeters(offRouteM);
    if (offRouteM > OFF_ROUTE_THRESHOLD_M && offRouteM < 500000) {
      setAlert({
        message: `Vous etes hors de l'itineraire (a ${Math.round(offRouteM)} m). Recalculez pour vous guider.`,
        variant: 'warning',
      });
    } else if (offRouteM >= 500000) {
      setOffRouteMeters(0);
    } else if (alert?.variant === 'warning' && alert?.message?.includes('hors')) {
      setAlert(null);
    }
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
      setToastMessage('Itineraire recalcule avec succes');
      setToastVariant('success');
      setShowToast(true);
    } catch {
      const fallback = buildFallbackRoute(position[0], position[1], activeRoute.destination[0], activeRoute.destination[1], activeRoute.mode);
      const updatedRoute = {
        ...activeRoute,
        ...fallback,
        isFallback: true,
      };
      setActiveRoute(updatedRoute);
      setVoiceGuideRoute(updatedRoute);
      setAlert({
        message: "Signal indisponible - itineraire approximatif en ligne droite.",
        variant: 'warning',
        isFallback: true
      });
    }
  }, [activeRoute, position]);

  // ===== PROFIL =====
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    authService.logout();
    navigate('/login');
  };

  // ===== MESURE =====
  const handleToggleMeasure = useCallback(() => {
    setSelectedFacility(null);
    setRoutePreview(null);
    measure.toggle();
  }, [measure]);

  // ===== POSITION MANUELLE =====
  const handleMapClickForLocation = useCallback((coords) => {
    if (manualLocationMode) {
      setPosition(coords);
      setFlyTo({ coords, zoom: 16, ts: Date.now() });
      setManualLocationMode(false);
      setToastMessage('Position definie manuellement');
      setToastVariant('success');
      setShowToast(true);
    }
  }, [manualLocationMode]);

  const toggleManualLocation = useCallback(() => {
    setManualLocationMode((v) => !v);
    setToastMessage(
      manualLocationMode
        ? 'Mode de selection desactive'
        : 'Cliquez sur la carte pour definir votre position'
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
      {showLocationConfirm && (
        <LocationConfirm onAccept={handleAcceptLocation} onCancel={handleCancelLocation} />
      )}

      {showNearbySuggestions && (
        <NearbySuggestions
          facilities={facilities}
          position={position}
          onSelectFacility={(facility) => {
            setShowNearbySuggestions(false);
            handleSelectFacility(facility);
          }}
          onClose={() => setShowNearbySuggestions(false)}
        />
      )}

      {showLogoutConfirm && (
        <LogoutConfirm onConfirm={confirmLogout} onCancel={() => setShowLogoutConfirm(false)} />
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          variant={toastVariant}
          duration={3000}
          onDismiss={() => setShowToast(false)}
        />
      )}

      <header className="visitor-header">
        <div className="visitor-header__brand">
          <i className="bi bi-heart-pulse-fill"></i>
          <span>SanteGeo Madagascar</span>
        </div>
        <div className="visitor-header__actions">
          {(locationLabel || locationLoading) && (
            <div className="visitor-header__location" title={locationLabel?.fullLabel || ''}>
              <i className="bi bi-geo-alt-fill"></i>
              {locationLoading ? 'Localisation…' : (locationLabel?.label || 'Position inconnue')}
            </div>
          )}
          {weather && (
            <div className="visitor-header__weather" title="Météo actuelle à votre position">
              <span>{weather.icon}</span>
              <span>{weather.temperature}°C</span>
            </div>
          )}
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
            title="Definir ma position manuellement"
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

      <div className="visitor-body">
        <div className="visitor-map-wrap">
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

          <div className="visitor-map-overlay-top">
            {alert && alert.variant === 'warning' && (
              <AlertBanner
                message={alert.message}
                variant={alert.variant}
                onDismiss={() => setAlert(null)}
                onAction={activeRoute ? handleRecalculate : undefined}
                actionLabel="Recalculer l'itineraire"
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
                    {i === 0 ? 'Raccourci' : `Itineraire ${i + 1}`} · {(opt.distanceMeters / 1000).toFixed(1)} km
                  </button>
                ))}
              </div>
            )}

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

            {activeRoute && voiceGuideRoute && (
              <button
                className="visitor-header__icon-btn voice-ask-btn"
                onClick={() => voiceGuideRef.current?.askIfOnTrack()}
                title="Suis-je sur la bonne route ?"
              >
                <i className="bi bi-question-circle-fill"></i>
              </button>
            )}

            {activeRoute && (
              <VoiceGuide
                ref={voiceGuideRef}
                route={activeRoute}
                isActive={!!voiceGuideRoute}
                currentStepIndex={currentStepIndex}
                offRouteMeters={offRouteMeters}
                userName={user?.username || ''}
              />
            )}

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

          <MapLegend />

          {loadingFacilities && (
            <div className="visitor-map-loading">
              <i className="bi bi-arrow-repeat spin"></i> Chargement des etablissements…
            </div>
          )}
          {usingCache && !loadError && (
            <div className="visitor-map-loading visitor-map-loading--cache">
              <i className="bi bi-wifi-off"></i> Donnees hors-ligne (cache)
            </div>
          )}
          {loadError && (
            <div className="visitor-map-loading visitor-map-loading--error">
              <i className="bi bi-exclamation-triangle-fill"></i> {loadError}
            </div>
          )}
        </div>

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
              onStartSimulation={startSimulation}
              isSimulating={isSimulating}
              simulationProgress={simulationProgress}
              onStopSimulation={stopSimulation}
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
              userRegion={locationLabel?.region || null}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default VisitorApp;