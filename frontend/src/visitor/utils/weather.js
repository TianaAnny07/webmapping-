// src/visitor/utils/weather.js

/**
 * Récupère la météo actuelle via Open-Meteo (API publique, gratuite,
 * sans clé requise). Documentation : https://open-meteo.com/
 */
export async function fetchCurrentWeather(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&timezone=auto`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Weather fetch failed: ${res.status}`);
  }

  const data = await res.json();
  const current = data.current_weather;
  if (!current) {
    throw new Error('Pas de données météo actuelle dans la réponse');
  }

  return {
    temperature: Math.round(current.temperature),
    icon: weatherCodeToIcon(current.weathercode),
    isDay: current.is_day === 1,
  };
}

// Mapping simplifié des codes météo Open-Meteo (norme WMO) vers un emoji.
// Référence complète : https://open-meteo.com/en/docs (section weathercode)
function weatherCodeToIcon(code) {
  if (code === 0) return '☀️';
  if (code === 1 || code === 2) return '🌤️';
  if (code === 3) return '☁️';
  if (code >= 45 && code <= 48) return '🌫️';
  if (code >= 51 && code <= 67) return '🌦️';
  if (code >= 71 && code <= 77) return '❄️';
  if (code >= 80 && code <= 82) return '🌧️';
  if (code >= 85 && code <= 86) return '🌨️';
  if (code >= 95) return '⛈️';
  return '🌡️';
}