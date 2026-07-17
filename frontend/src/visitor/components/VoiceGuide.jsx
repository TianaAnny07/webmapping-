import React, { useState, useEffect, useRef, useCallback } from 'react';
import { speechService } from '../../services/speechService';
import './VoiceGuide.css';

function VoiceGuide({ 
  route, 
  facility, 
  onVoiceStatusChange,
  isActive 
}) {
  const [isEnabled, setIsEnabled] = useState(() => {
    const saved = localStorage.getItem('voiceGuidanceEnabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [instructions, setInstructions] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const guidanceIntervalRef = useRef(null);

  // Initialiser le service vocal
  useEffect(() => {
    const available = speechService.init();
    setVoiceAvailable(available);
    
    speechService.onEnd(() => {
      setIsSpeaking(false);
    });

    return () => {
      speechService.stop();
      clearTimeout(guidanceIntervalRef.current);
    };
  }, []);

  // Générer les instructions quand la route change
  useEffect(() => {
    if (route && route.steps && route.steps.length > 0) {
      console.log('Route reçue avec', route.steps.length, 'étapes');
      const newInstructions = speechService.generateNavigationInstructions(route);
      console.log('Instructions générées:', newInstructions.length);
      setInstructions(newInstructions);
      setStepIndex(0);
    } else {
      console.log('Aucune route ou étape disponible');
      setInstructions([]);
      setStepIndex(0);
    }
  }, [route]);

  const startGuidance = useCallback(() => {
    if (!voiceAvailable) {
      console.warn('Synthèse vocale non disponible');
      return;
    }

    // Générer les instructions si elles ne sont pas encore prêtes mais que la route est disponible
    let activeInstructions = instructions;
    if (!activeInstructions.length && route && route.steps && route.steps.length > 0) {
      console.log('Instructions non encore prêtes, génération immédiate depuis la route');
      activeInstructions = speechService.generateNavigationInstructions(route);
      // Mettre à jour l'état pour les prochains appels
      setInstructions(activeInstructions);
    }

    if (!activeInstructions.length) {
      console.warn('Aucune instruction disponible');
      alert('Aucune instruction disponible pour cet itinéraire.');
      return;
    }

    if (isSpeaking) {
      console.log('Guidage déjà en cours');
      return;
    }

    const enabled = localStorage.getItem('voiceGuidanceEnabled');
    if (enabled === 'false') {
      console.log('Guidage vocal désactivé dans les préférences');
      return;
    }

    console.log('Démarrage du guidage vocal avec', activeInstructions.length, 'instructions');
    speechService.setEnabled(true);
    
    // Annoncer le début
    speechService.speak(`Guidage vocal activé. ${activeInstructions.length} instructions disponibles.`);

    let currentIndex = 0;
    setIsSpeaking(true);

    const announceNext = () => {
      if (currentIndex < activeInstructions.length) {
        const instruction = activeInstructions[currentIndex];
        console.log(`Annonce étape ${currentIndex + 1}/${activeInstructions.length}:`, instruction.text);
        
        if (!isMuted) {
          speechService.speak(instruction.text);
        }
        setCurrentStep(instruction);
        setStepIndex(currentIndex);
        currentIndex++;
        
        // Passer à l'instruction suivante après 3 secondes
        guidanceIntervalRef.current = setTimeout(announceNext, 3500);
      } else {
        console.log('Fin du guidage vocal');
        setIsSpeaking(false);
        setCurrentStep(null);
        if (facility) {
          speechService.announceArrival(facility);
        }
        onVoiceStatusChange && onVoiceStatusChange(false);
      }
    };

    // Démarrer le guidage
    announceNext();
  }, [instructions, route, voiceAvailable, isMuted, facility, onVoiceStatusChange, isSpeaking]);

  const stopGuidance = useCallback(() => {
    console.log('Arrêt du guidage vocal');
    speechService.stop();
    speechService.setEnabled(false);
    setIsSpeaking(false);
    setCurrentStep(null);
    clearTimeout(guidanceIntervalRef.current);
    onVoiceStatusChange && onVoiceStatusChange(false);
  }, [onVoiceStatusChange]);

  // Démarrer ou arrêter le guidage vocal
  useEffect(() => {
    if (isActive && isEnabled && instructions.length > 0) {
      console.log('Conditions remplies pour démarrer le guidage');
      startGuidance();
    } else if (!isActive) {
      stopGuidance();
    }
    
    return () => {
      stopGuidance();
    };
  }, [isActive, isEnabled, instructions, startGuidance, stopGuidance]);

  const toggleVoice = useCallback(() => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    if (newState) {
      if (!voiceAvailable) {
        alert('La synthèse vocale n\'est pas supportée par votre navigateur.');
        setIsEnabled(false);
        return;
      }
      
      // Vérifier si la route est disponible plutôt que les instructions
      if (!route || !route.steps || route.steps.length === 0) {
        alert('Aucune instruction disponible pour cet itinéraire.');
        setIsEnabled(false);
        return;
      }
      
      speechService.setEnabled(true);
      onVoiceStatusChange && onVoiceStatusChange(true);
      startGuidance();
    } else {
      stopGuidance();
      speechService.setEnabled(false);
      onVoiceStatusChange && onVoiceStatusChange(false);
    }
  }, [isEnabled, voiceAvailable, route, startGuidance, stopGuidance, onVoiceStatusChange]);

  const toggleMute = useCallback(() => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    
    if (newMuteState) {
      speechService.stop();
      setIsSpeaking(false);
    } else if (isEnabled && instructions.length > 0) {
      startGuidance();
    }
  }, [isMuted, isEnabled, instructions, startGuidance]);

  const announceRemaining = useCallback(() => {
    if (!isEnabled || !route || !facility) return;
    
    const remainingSteps = instructions.slice(stepIndex);
    let totalDistance = 0;
    let totalDuration = 0;
    
    remainingSteps.forEach(step => {
      totalDistance += step.distance || 0;
      totalDuration += step.duration || 0;
    });
    
    if (totalDistance > 0) {
      const distanceText = speechService.formatDistance(totalDistance);
      const timeText = speechService.formatTime(totalDuration);
      const message = `Il reste ${distanceText}. Temps estimé : ${timeText}.`;
      
      if (!isMuted) {
        speechService.speak(message);
      }
    }
  }, [isEnabled, route, facility, instructions, stepIndex, isMuted]);

  if (!voiceAvailable) {
    return (
      <div className="voice-guide voice-guide--unavailable">
        <i className="bi bi-mic-mute-fill"></i>
        <span>Synthèse vocale non disponible</span>
      </div>
    );
  }

  return (
    <div className={`voice-guide ${isEnabled ? 'voice-guide--active' : ''}`}>
      <div className="voice-guide__controls">
        <button 
          className={`voice-guide__btn ${isEnabled ? 'voice-guide__btn--active' : ''}`}
          onClick={toggleVoice}
          title={isEnabled ? 'Désactiver le guidage vocal' : 'Activer le guidage vocal'}
        >
          <i className={`bi ${isEnabled ? 'bi-volume-up-fill' : 'bi-volume-mute-fill'}`}></i>
          <span className="voice-guide__btn-label">
            {isEnabled ? 'Guidage vocal activé' : 'Activer le guidage vocal'}
          </span>
        </button>

        {isEnabled && (
          <>
            <button 
              className={`voice-guide__btn voice-guide__btn--mute ${isMuted ? 'active' : ''}`}
              onClick={toggleMute}
              title={isMuted ? 'Réactiver le son' : 'Couper le son'}
            >
              <i className={`bi ${isMuted ? 'bi-mic-mute-fill' : 'bi-mic-fill'}`}></i>
            </button>
            
            <button 
              className="voice-guide__btn voice-guide__btn--info"
              onClick={announceRemaining}
              title="Annoncer la distance restante"
            >
              <i className="bi bi-info-circle-fill"></i>
            </button>
          </>
        )}
      </div>

      {isEnabled && (
        <div className="voice-guide__status">
          {isSpeaking ? (
            <div className="voice-guide__speaking">
              <span className="voice-guide__pulse"></span>
              <span>Guidage en cours...</span>
            </div>
          ) : (
            <span className="voice-guide__waiting">En attente des instructions</span>
          )}
          
          {currentStep && (
            <div className="voice-guide__current-step">
              <span className="voice-guide__step-number">Étape {stepIndex + 1}/{instructions.length}</span>
              <span className="voice-guide__step-text">{currentStep.text}</span>
            </div>
          )}
          
          {instructions.length > 0 && (
            <div className="voice-guide__progress">
              <div 
                className="voice-guide__progress-bar"
                style={{ width: `${((stepIndex + 1) / instructions.length) * 100}%` }}
              ></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VoiceGuide;