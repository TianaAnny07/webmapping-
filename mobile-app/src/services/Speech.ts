import * as Speech from 'expo-speech';

/**
 * Petit wrapper autour d'expo-speech pour la lecture à voix haute des
 * instructions de navigation ("Tournez à droite dans 50 mètres…").
 * Fonctionnalité NOUVELLE : elle n'existe pas côté web, uniquement mobile.
 */
let enabled = true;

export function setVoiceEnabled(value: boolean) {
  enabled = value;
  if (!value) Speech.stop();
}

export function isVoiceEnabled() {
  return enabled;
}

export function speak(text: string) {
  if (!enabled || !text) return;
  Speech.stop(); // évite les instructions qui se chevauchent
  Speech.speak(text, { language: 'fr-FR', pitch: 1.0, rate: 0.95 });
}

export function stopSpeaking() {
  Speech.stop();
}