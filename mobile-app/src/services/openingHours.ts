
export function isOpenNow(
  openingTime?: string,
  closingTime?: string,
  is24h?: boolean,
): boolean | null {
  if (is24h) return true;
  if (!openingTime || !closingTime) return null;
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  if ([openH, openM, closeH, closeM].some((n) => Number.isNaN(n))) return null;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

/** Petit libellé d'état d'ouverture pour affichage */
export function openLabel(openingTime?: string, closingTime?: string, is24h?: boolean): string {
  const open = isOpenNow(openingTime, closingTime, is24h);
  if (open === true) return is24h ? 'Ouvert 24h/24' : 'Ouvert maintenant';
  if (open === null) return 'Horaires non renseignés';
  return 'Fermé actuellement';
}