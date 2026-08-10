// Traduit une instruction de manœuvre OSRM (type + modifier) en texte,
// en français ou en malgache selon la langue choisie dans le profil.
import { RouteStep } from '../types';
import { Language } from '../services/translations';

const TYPE_TEXT: Record<Language, Record<string, string>> = {
  fr: {
    depart: 'Démarrez',
    arrive: 'Vous êtes arrivé à destination',
    turn: 'Tournez',
    continue: 'Continuez',
    merge: 'Rejoignez la voie',
    fork: 'Restez',
    'end of road': 'Au bout de la route, tournez',
    roundabout: 'Prenez le rond-point',
    rotary: 'Prenez le rond-point',
    'roundabout turn': 'Au rond-point, tournez',
    'new name': 'Continuez',
    'on ramp': 'Prenez la bretelle',
    'off ramp': 'Prenez la sortie',
    notification: 'Continuez',
  },
  // ⚠️ Traductions malgaches non relues par un locuteur natif — à faire
  // vérifier avant mise en production, en particulier gauche/droite.
  mg: {
    depart: 'Miaingà',
    arrive: "Tonga amin'ny toerana kendrena ianao",
    turn: 'Mihodìna',
    continue: 'Manohy',
    merge: 'Midira amin\'ny lalana',
    fork: 'Mijanòna',
    'end of road': "Amin'ny farany, mihodina",
    roundabout: "Midira amin'ny boribory",
    rotary: "Midira amin'ny boribory",
    'roundabout turn': "Eo amin'ny boribory, mihodina",
    'new name': 'Manohy',
    'on ramp': 'Midira',
    'off ramp': 'Mivoaka',
    notification: 'Manohy',
  },
};

const MODIFIER_TEXT: Record<Language, Record<string, string>> = {
  fr: {
    uturn: 'faites demi-tour',
    'sharp right': 'fortement à droite',
    right: 'à droite',
    'slight right': 'légèrement à droite',
    straight: 'tout droit',
    'slight left': 'légèrement à gauche',
    left: 'à gauche',
    'sharp left': 'fortement à gauche',
  },
  mg: {
    uturn: 'miverina',
    'sharp right': 'havanana be',
    right: 'havanana',
    'slight right': 'havanana kely',
    straight: 'mahitsy',
    'slight left': 'havia kely',
    left: 'havia',
    'sharp left': 'havia be',
  },
};

const MODIFIER_ROTATION: Record<string, number> = {
  uturn: 180,
  'sharp right': 135,
  right: 90,
  'slight right': 45,
  straight: 0,
  'slight left': -45,
  left: -90,
  'sharp left': -135,
};

/** Retourne { text, rotation } pour une étape OSRM donnée, dans la langue choisie. */
export function describeStep(step?: RouteStep | null, language: Language = 'fr'): { text: string; rotation: number } {
  if (!step) return { text: '', rotation: 0 };
  const TYPE = TYPE_TEXT[language];
  const MOD = MODIFIER_TEXT[language];

  if (step.type === 'arrive') return { text: TYPE.arrive, rotation: 0 };

  const base = TYPE[step.type] || TYPE.continue;
  const rotation = step.modifier ? MODIFIER_ROTATION[step.modifier] ?? 0 : 0;
  const street = step.streetName ? ` sur ${step.streetName}` : '';

  if (step.type === 'depart') {
    return { text: `${base}${street}`, rotation: 0 };
  }

  const mod = step.modifier ? MOD[step.modifier] : '';
  const text = `${base} ${mod}${street}`.replace(/\s+/g, ' ').trim();
  return { text, rotation };
}