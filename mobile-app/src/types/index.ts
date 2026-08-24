import type { FacilityCategory } from '../services/facilityCategories';
export type { FacilityCategory };

export type FacilityType =
  | 'hospital'
  | 'csb'
  | 'pharmacy'
  | 'clinic'
  | 'health_post'
  | 'other';


export type Accessibility = 'high' | 'medium' | 'low';
export type FacilityStatus = 'operational' | 'limited' | 'closed';
export type TravelMode = 'walking' | 'cycling' | 'driving';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  category: FacilityCategory; // catégorie détaillée : chu, hospital, csb2, csb1, pharmacy, clinic,...
  
  level?: string;
  latitude: number;
  longitude: number;
  region?: string;
  district?: string;
  address?: string;
  beds: number;
  staff: number;
  accessibility: Accessibility;
  status: FacilityStatus;
  phone?: string;
  hours?: string;
  services?: string;
  description?: string;
  photoUrl?: string;
  openingTime?: string;
  closingTime?: string;
  is24h?: boolean;
  distanceKm?: number;
}

export interface RouteStep {
  type: string;
  modifier?: string;
  distanceMeters: number;
  location: [number, number]; // [lat, lon]
  streetName?: string;
}

export interface Itinerary {
  distanceMeters: number;
  durationSeconds: number;
  geometry: [number, number][]; // [lat, lon][]
  steps: RouteStep[];
  label?: string; 
}

export interface User {
  id: number;
  email: string;
  role: 'admin' | 'visitor' | string;
  username?: string;
  avatar?: string | null;
}


export type TabParamList = {
  Map: undefined;
  Search: undefined;
  Measure: undefined;
  Profile: undefined;
};


export type RootStackParamList = {
  Tabs: undefined;
  FacilityDetail: { facility: Facility };
  Route: { facility: Facility; mode: TravelMode; itinerary: Itinerary };
  Profile: undefined;
};


export type AuthStackParamList = {
  Login: { prefillEmail?: string } | undefined;
  Register: undefined;
};
