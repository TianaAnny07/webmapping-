# Application Mobile — Santé Madagascar (React Native / Expo / TypeScript)

Application destinée aux **utilisateurs finaux** pour localiser les hôpitaux et Centres de Santé de Base (CSB), et être guidés jusqu'à eux.

## Fonctionnalités
- **Carte interactive** (react-native-maps) affichant tous les établissements, colorés selon leur niveau d'accessibilité
- **Géolocalisation** (expo-location) : bouton "me localiser", position affichée sur la carte
- **Recherche** d'un établissement par nom / région / district
- **Établissements les plus proches** (calculés côté serveur via PostGIS, triés par distance réelle)
- **Détails d'un établissement** (lits, personnel, horaires, téléphone, statut)
- **Itinéraire** : calcul du trajet routier (via OSRM côté backend), affichage sur la carte, **validation par l'utilisateur** puis traçage du trajet et suivi en temps réel
- **Alertes** : pendant un trajet actif, la position est envoyée en direct au serveur (WebSocket) ; si l'utilisateur s'écarte de plus de 300 m de l'itinéraire prévu, une alerte "vous semblez perdu" s'affiche

## Démarrage

```bash
npm install
npx expo start
```

Scanner le QR code avec l'app **Expo Go** (Android/iOS), ou lancer un émulateur.

 Dans `src/services/api.ts`, remplacez `http://localhost:3000` par
l'adresse IP locale de votre machine (ex: `http://192.168.1.10:3000/api/v1`) si vous testez
sur un téléphone physique — `localhost` sur le téléphone ne pointera pas vers votre ordinateur.

## Clé Google Maps
`react-native-maps` utilise Google Maps sur Android. Ajoutez votre clé API dans `app.json`
(`expo.android.config.googleMaps.apiKey`). Sur iOS, Apple Maps est utilisé par défaut sans clé.

## Structure
```
src/
  screens/         MapScreen, SearchScreen, FacilityDetailScreen, RouteScreen
  navigation/       Tabs (Carte / Recherche) + Stack (Détail, Itinéraire)
  services/         api.ts (appels REST), location.ts (géolocalisation)
  context/          AlertContext (WebSocket, alertes hors-itinéraire)
  types/            Types partagés
```
