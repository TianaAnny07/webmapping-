import * as Speech from 'expo-speech';
import { Language } from '../services/translations';

/**
 * Wrapper autour d'expo-speech pour la lecture à voix haute des
 * instructions de navigation, dans la langue choisie dans le profil.
 *
 * ⚠️ Limite matérielle importante : la synthèse vocale dépend des voix
 * installées sur le téléphone (moteur TTS du système). Le malgache n'est
 * PAS disponible comme voix sur la plupart des téléphones Android/iOS
 * actuels. On vérifie donc au changement de langue si une voix malgache
 * existe ; si aucune n'est trouvée, on retombe automatiquement sur le
 * français pour la VOIX uniquement (le texte affiché à l'écran, lui,
 * reste bien en malgache).
 */
let enabled = true;
let currentLanguage: Language = 'fr';
let effectiveSpeechLocale = 'fr-FR';

const LOCALE_CODES: Record<Language, string> = { fr: 'fr-FR', mg: 'mg-MG' };

export function setVoiceEnabled(value: boolean) {
  enabled = value;
  if (!value) Speech.stop();
}

export function isVoiceEnabled() {
  return enabled;
}

/** Appelé par LanguageContext dès que l'utilisateur change de langue. */
export async function setSpeechLanguage(lang: Language) {
  currentLanguage = lang;
  effectiveSpeechLocale = LOCALE_CODES[lang];

  if (lang === 'mg') {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const hasMalagasy = voices.some((v) => v.language?.toLowerCase().startsWith('mg'));
      if (!hasMalagasy) {
        // Pas de voix malgache sur ce téléphone : on garde le texte en
        // malgache à l'écran, mais la VOIX repasse en français pour ne
        // pas rester complètement muette.
        effectiveSpeechLocale = 'fr-FR';
      }
    } catch {
      effectiveSpeechLocale = 'fr-FR';
    }
  }
}

export function speak(text: string) {
  if (!enabled || !text) return;
  Speech.stop(); // évite les instructions qui se chevauchent
  Speech.speak(text, { language: effectiveSpeechLocale, pitch: 1.0, rate: 0.95 });
}

export function stopSpeaking() {
  Speech.stop();
}

export function getSpeechLanguage(): Language {
  return currentLanguage;
}




// Dictionnaire de guidage vocal en malagasy
// Mandehana mahitsy → Allez tout droit

// Mivily ankavanana → Tournez à droite

// Mivily ankavia → Tournez à gauche

// Mihodina → Faites demi-tour

// Mijanòna → Arrêtez-vous

// Mandehana miadana → Avancez lentement

// Mandehana haingana → Avancez rapidement

// Mandehana amin’ny lalana lehibe → Prenez la route principale

// Mandehana amin’ny lalana kely → Prenez la petite route

// Mivoaha amin’ny làlana → Sortez de la route

// Midira amin’ny làlana → Entrez sur la route

// Tonga amin’ny tanjona → Vous êtes arrivé à destination