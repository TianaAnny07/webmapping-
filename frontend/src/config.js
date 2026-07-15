// Configuration centralisée - modifiez uniquement ce fichier si vous changez de machine
const config = {
  API_URL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  MAP_TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  OSRM_URL: 'https://router.project-osrm.org/route/v1',
};

export default config;
