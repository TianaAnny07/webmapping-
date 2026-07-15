import L from 'leaflet';

// Même logique que MapView.jsx (admin), réutilisée ici pour garder une
// présentation cohérente entre l'espace admin et l'espace visiteur.

export function getTypeLabel(healthcare, amenity, name) {
  const nomUpper = (name || '').toUpperCase();
  if (nomUpper.includes('CHU')) return 'Centre Hospitalier Universitaire';
  if (nomUpper.includes('CHR')) return 'Centre Hospitalier Régional';
  if (nomUpper.includes('CHP')) return 'Centre Hospitalier de District';
  if (nomUpper.includes('CSB II') || nomUpper.includes('CSB 2')) return 'Centre de Santé de Base II';
  if (nomUpper.includes('CSB I') || nomUpper.includes('CSB 1')) return 'Centre de Santé de Base I';

  const type = healthcare || amenity || '';
  const labels = {
    hospital: 'Hôpital',
    doctor: 'Centre de Santé de Base',
    doctors: 'Centre de Santé de Base',
    nurse: 'Poste de santé',
    pharmacy: 'Pharmacie',
    clinic: 'Clinique',
    dentist: 'Cabinet dentaire',
    birthing_centre: 'Maternité',
    midwife: 'Maternité',
    community_health_worker: 'Agent de santé communautaire',
    laboratory: "Laboratoire d'analyses",
    alternative: 'Médecine alternative',
    counselling: 'Centre de conseil',
    blood_bank: 'Banque de sang',
    optometrist: 'Opticien',
    paediatrics: 'Pédiatrie',
    centre: 'Centre de santé',
    yes: 'Formation sanitaire',
    health_post: 'Poste de santé',
  };
  return labels[type] || 'Formation sanitaire';
}

function typeColor(healthcare, amenity, name) {
  const nomUpper = (name || '').toUpperCase();
  const type = healthcare || amenity || '';

  if (nomUpper.includes('CHU') || nomUpper.includes('CHR') || nomUpper.includes('CHP')) return '#c0392b';
  if (type === 'hospital') return '#e74c3c';
  if (nomUpper.includes('CSB II') || nomUpper.includes('CSB 2')) return '#2980b9';
  if (nomUpper.includes('CSB I') || nomUpper.includes('CSB 1')) return '#5dade2';
  if (type === 'pharmacy') return '#27ae60';
  if (type === 'doctor' || type === 'doctors') return '#2980b9';
  if (type === 'clinic') return '#8e44ad';
  if (type === 'nurse') return '#16a085';
  if (type === 'dentist') return '#f39c12';
  if (type === 'birthing_centre' || type === 'midwife') return '#e91e8c';
  return '#7f8c8d';
}

function typeGlyph(healthcare, amenity, name) {
  const nomUpper = (name || '').toUpperCase();
  const type = healthcare || amenity || '';

  if (nomUpper.includes('CHU') || nomUpper.includes('CHR') || nomUpper.includes('CHP')) return 'bi-hospital-fill';
  if (type === 'hospital') return 'bi-hospital-fill';
  if (type === 'pharmacy') return 'bi-capsule';
  if (type === 'doctor' || type === 'doctors' || type === 'nurse') return 'bi-person-fill-cross';
  if (type === 'clinic') return 'bi-building-fill-cross';
  if (type === 'dentist') return 'bi-emoji-smile-fill';
  if (type === 'birthing_centre' || type === 'midwife') return 'bi-gender-female';
  return 'bi-plus-circle-fill';
}

export function getCustomIcon(healthcare, amenity, name, variant = 'normal') {
  const color = typeColor(healthcare, amenity, name);
  const icon = typeGlyph(healthcare, amenity, name);
  const sizes = { normal: 26, highlighted: 34, selected: 40 };
  const size = sizes[variant] || sizes.normal;
  const border = variant === 'selected' ? 3 : 2;
  // const wrapperClass = variant === 'highlighted' ? 'facility-marker-float' : '';
const wrapperClass = (variant === 'highlighted' || variant === 'selected') ? 'facility-marker-float' : '';
  return L.divIcon({
    className: '',
    html: `
      <div class="${wrapperClass}">
        <div style="
          background: ${color};
          width: ${size}px;
          height: ${size}px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: ${border}px solid white;
          box-shadow: 0 3px 10px rgba(0,0,0,0.45);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <i class="bi ${icon}" style="
            transform: rotate(45deg);
            color: white;
            font-size: ${Math.round(size * 0.46)}px;
          "></i>
        </div>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size + 2],
  });
}

export function isOpenNow(openingTime, closingTime, is24h) {
  if (is24h) return true;
  if (!openingTime || !closingTime) return null;
  const now = new Date();
  const [openH, openM] = openingTime.split(':').map(Number);
  const [closeH, closeM] = closingTime.split(':').map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;
  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}
