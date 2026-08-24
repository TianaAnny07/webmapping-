import * as Speech from 'expo-speech';
import { Language } from '../services/translations';


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


export async function setSpeechLanguage(lang: Language) {
  currentLanguage = lang;
  effectiveSpeechLocale = LOCALE_CODES[lang];

  if (lang === 'mg') {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      const hasMalagasy = voices.some((v) => v.language?.toLowerCase().startsWith('mg'));
      if (!hasMalagasy) {
       
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




