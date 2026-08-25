// src/visitor/utils/geocode.js

/**
 * Reverse geocoding via l'API publique Nominatim (OpenStreetMap).
 * Limite d'usage : max ~1 requête/seconde, usage raisonnable uniquement
 * (pas de polling). Convient à un appel déclenché par une action utilisateur
 * explicite (activation de la position), pas à un suivi GPS continu.
 */
export async function reverseGeocode(lat, lon) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=fr&zoom=14`;

  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Reverse geocoding failed: ${res.status}`);
  }

  const data = await res.json();
  const addr = data.address || {};

  // Les noms de champs Nominatim varient selon la zone du monde ; pour
  // Madagascar on mappe au mieux vers quartier/commune/district/région.
  const quartier = addr.suburb || addr.neighbourhood || addr.quarter || null;
  const commune = addr.town || addr.village || addr.city || addr.municipality || null;
  const district = addr.county || addr.state_district || null;
  const region = addr.state || null;

  const parts = [quartier, commune, district, region].filter(Boolean);

  return {
    quartier,
    commune,
    district,
    region,
    // Libellé court pour affichage compact (2 niveaux les plus précis)
    label: parts.slice(0, 2).join(', ') || data.display_name || null,
    // Libellé complet si besoin d'afficher toute la hiérarchie
    fullLabel: parts.join(', ') || data.display_name || null,
  };
}