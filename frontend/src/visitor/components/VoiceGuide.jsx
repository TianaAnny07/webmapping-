// src/visitor/components/VoiceGuide.jsx

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react';
import { buildStepInstruction } from '../../services/instructions';

/**
 * Composant de guidage vocal pour la navigation.
 * Ne devine plus l'étape courante lui-même : il se fie à `currentStepIndex`
 * calculé par le parent (VisitorApp) à partir de la vraie position GPS.
 */
const VoiceGuide = forwardRef(function VoiceGuide(
  { route, isActive, currentStepIndex = 0, offRouteMeters = 0, userName = '' },
  ref
) {
  const speechRef = useRef(null);
  const hasGreetedRef = useRef(false);
  const lastSpokenStepRef = useRef(-1);

  // Initialisation de la synthèse vocale
  useEffect(() => {
    if ('speechSynthesis' in window) {
      speechRef.current = window.speechSynthesis;
    } else {
      console.warn("La synthèse vocale n'est pas supportée par ce navigateur.");
    }
  }, []);

  const speak = (text) => {
    if (!speechRef.current || !text) return;
    speechRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;
    speechRef.current.speak(utterance);
  };

  const describeStep = (step) => {
    if (!step) return 'Continuez tout droit.';
    const base = buildStepInstruction(step);
    const distance = step.distanceMeters ? `dans ${Math.round(step.distanceMeters)} mètres` : '';
    return `${base} ${distance}`.trim();
  };

  // Reset propre à chaque fois qu'on désactive la voix
  useEffect(() => {
    if (!isActive) {
      hasGreetedRef.current = false;
      lastSpokenStepRef.current = -1;
      speechRef.current?.cancel();
    }
  }, [isActive]);

  // Nouveau trajet (nouvelle destination) -> on peut resaluer
  useEffect(() => {
    hasGreetedRef.current = false;
    lastSpokenStepRef.current = -1;
  }, [route?.facilityId]);

  // Message de bienvenue, une seule fois par trajet
  useEffect(() => {
    if (!isActive || !route || hasGreetedRef.current) return;
    hasGreetedRef.current = true;
    const destinationName = route.facilityName || 'votre destination';
    // Salutation personnalisée avec le prénom si on le connaît.
    const greeting = userName ? `Bonjour ${userName}` : 'Bonjour';
    const timer = setTimeout(() => {
      speak(`${greeting}, je vais vous guider jusqu'à ${destinationName}. ${describeStep(route.steps?.[0])}`);
      lastSpokenStepRef.current = 0;
    }, 600);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, route?.facilityId, userName]);

  // Annonce à chaque VRAI changement d'étape (poussé par la position GPS du parent)
  useEffect(() => {
    if (!isActive || !route?.steps?.length) return;
    if (!hasGreetedRef.current) return; // on attend d'abord le message de bienvenue
    if (currentStepIndex === lastSpokenStepRef.current) return;
    lastSpokenStepRef.current = currentStepIndex;
    speak(describeStep(route.steps[currentStepIndex]));
  }, [isActive, currentStepIndex, route?.steps]);

  // Permet au parent (VisitorApp) de déclencher des annonces ponctuelles :
  // - "suis-je sur la bonne route ?"
  // - répéter l'instruction actuelle
  // - annoncer l'arrivée
  useImperativeHandle(ref, () => ({
    askIfOnTrack: () => {
      if (!isActive) return;
      if (offRouteMeters > 300) {
        speak(
          `Non, vous vous êtes écarté de l'itinéraire d'environ ${Math.round(
            offRouteMeters
          )} mètres. Je vous conseille de recalculer le trajet.`
        );
      } else {
        speak('Oui, vous êtes sur la bonne voie, continuez ainsi.');
      }
    },
    repeatInstruction: () => {
      if (!isActive || !route?.steps?.length) return;
      speak(describeStep(route.steps[currentStepIndex] ?? route.steps[0]));
    },
    announceArrival: () => {
      if (!isActive) return;
      speak('Vous êtes arrivé à destination. Bonne visite !');
    },
  }));

  return null; // composant invisible, l'affichage se fait via NavigationOverlay
});

export default VoiceGuide;