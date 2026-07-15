import * as Location from 'expo-location';

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  return status === 'granted';
}

export async function getCurrentPosition() {
  const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: location.coords.latitude, longitude: location.coords.longitude };
}

// Suivi continu de la position (utilisé pendant un trajet actif pour détecter un écart d'itinéraire)
export function watchPosition(callback: (coords: { latitude: number; longitude: number }) => void) {
  return Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, timeInterval: 4000, distanceInterval: 10 },
    (loc) => callback({ latitude: loc.coords.latitude, longitude: loc.coords.longitude }),
  );
}
