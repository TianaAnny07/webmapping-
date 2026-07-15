// Traduit une instruction de manœuvre OSRM (type + modifier) en texte


const TYPE_TEXT = {
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
};

const MODIFIER_TEXT = {
  uturn: 'faites demi-tour',
  'sharp right': 'fortement à droite',
  right: 'à droite',
  'slight right': 'légèrement à droite',
  straight: 'tout droit',
  'slight left': 'légèrement à gauche',
  left: 'à gauche',
  'sharp left': 'fortement à gauche',
};

const MODIFIER_ROTATION = {
  uturn: 180,
  'sharp right': 135,
  right: 90,
  'slight right': 45,
  straight: 0,
  'slight left': -45,
  left: -90,
  'sharp left': -135,
};

/** Retourne { text, rotation } pour une étape OSRM donnée. */
export function describeStep(step) {
  if (!step) return { text: '', rotation: 0 };

  if (step.type === 'arrive') return { text: TYPE_TEXT.arrive, rotation: 0 };

  const base = TYPE_TEXT[step.type] || 'Continuez';
  const rotation = step.modifier ? MODIFIER_ROTATION[step.modifier] ?? 0 : 0;
  const street = step.streetName ? ` sur ${step.streetName}` : '';

  if (step.type === 'depart') {
    return { text: `${base}${street}`, rotation: 0 };
  }

  const mod = step.modifier ? MODIFIER_TEXT[step.modifier] : '';
  const text = `${base} ${mod}${street}`.replace(/\s+/g, ' ').trim();
  return { text, rotation };
}