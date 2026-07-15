export type FacilityType = 'hospital' | 'csb';
export type Accessibility = 'high' | 'medium' | 'low';
export type FacilityStatus = 'operational' | 'limited' | 'closed';

export interface Facility {
  id: string;
  name: string;
  type: FacilityType;
  level?: string;
  latitude: number;
  longitude: number;
  region?: string;
  district?: string;
  beds: number;
  staff: number;
  accessibility: Accessibility;
  status: FacilityStatus;
  phone?: string;
  hours?: string;
  address?: string;
  distanceKm?: number;
}

export type RootStackParamList = {
  Tabs: undefined;
  FacilityDetail: { facility: Facility };
  Route: { facility: Facility };
};

export type TabParamList = {
  Map: undefined;
  Search: undefined;
};
