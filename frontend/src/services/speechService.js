// src/services/speechService.js

class SpeechService {
  constructor() {
    this.synthesis = window.speechSynthesis;
    this.utterance = null;
    this.isSpeaking = false;
    this.isPaused = false;
    this.voice = null;
    this.rate = 1.0;
    this.pitch = 1.0;
    this.volume = 1.0;
    this.queue = [];
    this.isProcessing = false;
    this.onEndCallbacks = [];
    this.enabled = true;
  }

  init() {
    if (!this.synthesis) {
      console.warn('La synthèse vocale n\'est pas supportée par ce navigateur');
      return false;
    }
    this.loadVoices();
    if (this.synthesis.onvoiceschanged !== undefined) {
      this.synthesis.onvoiceschanged = () => this.loadVoices();
    }
    return true;
  }

  loadVoices() {
    const voices = this.synthesis.getVoices();
    const frenchVoice = voices.find(voice => 
      voice.lang.startsWith('fr') || 
      voice.lang.includes('FR')
    );
    this.voice = frenchVoice || voices[0] || null;
    return this.voice;
  }

  isAvailable() {
    return !!this.synthesis && typeof this.synthesis.speak === 'function';
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
    }
  }

  speak(text, options = {}) {
    if (!this.enabled || !this.isAvailable()) {
      return;
    }

    const cleanText = text.replace(/\s+/g, ' ').trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    utterance.voice = options.voice || this.voice;
    utterance.rate = options.rate || this.rate;
    utterance.pitch = options.pitch || this.pitch;
    utterance.volume = options.volume || this.volume;
    utterance.lang = options.lang || 'fr-FR';

    utterance.onstart = () => {
      this.isSpeaking = true;
      console.log('🗣️ Guidage vocal:', cleanText);
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.processQueue();
      this.onEndCallbacks.forEach(cb => cb());
    };

    utterance.onerror = (event) => {
      console.error('Erreur de synthèse vocale:', event);
      this.isSpeaking = false;
      this.processQueue();
    };

    if (this.isSpeaking || this.isProcessing) {
      this.queue.push(utterance);
    } else {
      this.isProcessing = true;
      this.synthesis.speak(utterance);
    }
  }

  processQueue() {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.synthesis.speak(next);
    } else {
      this.isProcessing = false;
    }
  }

  stop() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    this.isSpeaking = false;
    this.isProcessing = false;
    this.queue = [];
  }

  pause() {
    if (this.synthesis && this.isSpeaking) {
      this.synthesis.pause();
      this.isPaused = true;
    }
  }

  resume() {
    if (this.synthesis && this.isPaused) {
      this.synthesis.resume();
      this.isPaused = false;
    }
  }

  onEnd(callback) {
    this.onEndCallbacks.push(callback);
  }

  // Fonction améliorée pour générer les instructions
  generateNavigationInstructions(route) {
    const instructions = [];
    
    if (!route || !route.steps || route.steps.length === 0) {
      console.warn('Aucune étape trouvée dans la route');
      return instructions;
    }

    console.log('Génération des instructions pour', route.steps.length, 'étapes');

    route.steps.forEach((step, index) => {
      let instruction = '';
      const distance = step.distance || 0;
      const duration = step.duration || 0;
      const maneuver = step.maneuver || {};
      const type = maneuver.type || '';
      const modifier = maneuver.modifier || '';
      const name = step.name || '';

      const distanceText = this.formatDistance(distance);
      const timeText = this.formatTime(duration);

      // Générer l'instruction selon le type de manœuvre
      switch(type) {
        case 'depart':
          instruction = `Départ. ${name || 'Suivez l\'itinéraire'}.`;
          break;
        
        case 'arrive':
          instruction = `Vous êtes arrivé à destination. ${name || ''}`;
          break;
        
        case 'turn':
          const direction = this.getDirectionText(modifier);
          instruction = `Dans ${distanceText}, tournez à ${direction}.`;
          break;
        
        case 'continue':
          instruction = `Continuez tout droit pendant ${distanceText}.`;
          break;
        
        case 'roundabout':
          const exit = maneuver.exit || 1;
          instruction = `Prenez la ${exit}ème sortie du rond-point.`;
          break;
        
        case 'merge':
          instruction = `Rejoignez ${name || 'la voie principale'}.`;
          break;
        
        case 'fork':
          instruction = `Restez ${modifier === 'left' ? 'à gauche' : 'à droite'} à l'embranchement.`;
          break;
        
        case 'end of road':
          instruction = `À la fin de la route, tournez à ${this.getDirectionText(modifier)}.`;
          break;
        
        default:
          if (distance > 0) {
            if (index === 0) {
              instruction = `Départ. Parcourez ${distanceText}${name ? ` sur ${name}` : ''}.`;
            } else if (index === route.steps.length - 1) {
              instruction = `Vous êtes arrivé.`;
            } else {
              instruction = `Parcourez ${distanceText}${name ? ` sur ${name}` : ''}.`;
            }
          }
      }

      // Ajouter le temps estimé pour les étapes principales
      if (duration > 0 && index > 0 && index < route.steps.length - 1) {
        instruction += ` Temps estimé : ${timeText}.`;
      }

      if (instruction) {
        instructions.push({
          text: instruction,
          distance: distance,
          duration: duration,
          coordinates: maneuver.location || [],
          step: step
        });
      }
    });

    console.log(`${instructions.length} instructions générées`);
    return instructions;
  }

  formatDistance(meters) {
    if (meters < 1000) {
      return `${Math.round(meters)} mètres`;
    } else {
      const km = (meters / 1000).toFixed(1);
      return `${km} kilomètres`;
    }
  }

  formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)} secondes`;
    } else if (seconds < 3600) {
      return `${Math.round(seconds / 60)} minutes`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.round((seconds % 3600) / 60);
      return `${hours} heure${hours > 1 ? 's' : ''} et ${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
  }

  getDirectionText(modifier) {
    const directions = {
      'left': 'gauche',
      'right': 'droite',
      'slight left': 'légèrement à gauche',
      'slight right': 'légèrement à droite',
      'sharp left': 'fortement à gauche',
      'sharp right': 'fortement à droite',
      'straight': 'tout droit',
      'u-turn': 'faire demi-tour'
    };
    return directions[modifier] || modifier || 'la direction indiquée';
  }

  announceRemainingDistance(distance, destinationName) {
    let message = '';
    if (distance < 100) {
      message = `Vous êtes presque arrivé${destinationName ? ` à ${destinationName}` : ''}.`;
    } else if (distance < 500) {
      message = `Plus que ${this.formatDistance(distance)} avant ${destinationName || 'la destination'}.`;
    } else if (distance < 1000) {
      message = `À ${this.formatDistance(distance)} de ${destinationName || 'l\'établissement'}.`;
    } else {
      message = `Continuez, il reste ${this.formatDistance(distance)}.`;
    }
    this.speak(message);
  }

  announceArrival(facility) {
    if (!facility) {
      this.speak('Vous êtes arrivé à destination.');
      return;
    }

    const name = facility.properties?.name || 'l\'établissement de santé';
    const openingHours = facility.properties?.opening_hours || '';
    const phone = facility.properties?.phone || '';
    
    let message = `Vous êtes arrivé à ${name}.`;
    
    if (openingHours) {
      message += ` Cet établissement est ${this.getOpeningStatus(openingHours)}.`;
    }
    
    if (phone) {
      message += ` Téléphone : ${phone}.`;
    }

    const facilityType = this.getFacilityType(facility);
    if (facilityType) {
      message += ` C'est un ${facilityType}.`;
    }

    this.speak(message);
  }

  getOpeningStatus(openingHours) {
    return openingHours.includes('ouvert') ? 'ouvert' : 'ouvert aux horaires indiqués';
  }

  getFacilityType(facility) {
    const props = facility.properties || {};
    if (props.healthcare === 'hospital' || props.amenity === 'hospital') {
      return 'hôpital';
    } else if (props.healthcare === 'clinic') {
      return 'clinique';
    } else if (props.amenity === 'pharmacy') {
      return 'pharmacie';
    } else if (props.healthcare) {
      return 'centre de santé';
    }
    return null;
  }
}

export const speechService = new SpeechService();
export default speechService;