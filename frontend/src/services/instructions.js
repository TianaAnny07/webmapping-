// src/services/instructions.js

// Ton getItinerary() (osrm.js) retourne des steps À PLAT :
// { type, modifier, distanceMeters, location: [lat, lon], streetName }
// (pas de step.maneuver imbriqué, pas de step.distance/step.name)

const MODIFIER_FR = {
  uturn: 'faites demi-tour',
  'sharp right': 'tournez fortement à droite',
  right: 'tournez à droite',
  'slight right': 'tournez légèrement à droite',
  straight: 'continuez tout droit',
  'slight left': 'tournez légèrement à gauche',
  left: 'tournez à gauche',
  'sharp left': 'tournez fortement à gauche',
};

function capitalize(text) {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function ordinalFr(n) {
  if (n === 1) return '1ère';
  return `${n}ème`;
}

/**
 * Construit le texte d'instruction en français pour une étape (format plat, voir osrm.js).
 */
export function buildStepInstruction(step) {
  if (!step) return 'Continuez tout droit';
  const { type, modifier, streetName, exit } = step;

  switch (type) {
    case 'depart':
      return streetName ? `Prenez ${streetName}` : 'Démarrez votre trajet';

    case 'arrive':
      return 'Vous êtes arrivé à destination';

    case 'turn':
    case 'end of road':
    case 'fork':
    case 'merge':
    case 'ramp': {
      const action = MODIFIER_FR[modifier] || 'continuez';
      return streetName ? `${capitalize(action)}, puis continuez sur ${streetName}` : capitalize(action);
    }

    case 'roundabout':
    case 'rotary': {
      const exitTxt = exit ? `, sortez à la ${ordinalFr(exit)} sortie` : '';
      return `Prenez le rond-point${exitTxt}`;
    }

    case 'continue': {
      const action = MODIFIER_FR[modifier];
      if (action) return capitalize(action);
      return streetName ? `Continuez sur ${streetName}` : 'Continuez tout droit';
    }

    case 'new name':
      return streetName ? `Continuez sur ${streetName}` : 'Continuez tout droit';

    default:
      return streetName ? `Continuez sur ${streetName}` : 'Continuez tout droit';
  }
}

/**
 * Texte complet avec la distance ajoutée, ex: "Tournez à gauche, dans 120 mètres"
 */
export function buildStepInstructionWithDistance(step) {
  const base = buildStepInstruction(step);
  if (!step?.distanceMeters) return base;
  return `${base}, dans ${Math.round(step.distanceMeters)} mètres`;
}