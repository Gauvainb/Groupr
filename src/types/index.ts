export type Discipline =
  | 'Precision Rifle'
  | 'F-Class'
  | 'Benchrest'
  | 'Long Range'
  | 'IPSC/USPSA'
  | 'ISSF/Olympic'
  | 'Airgun'
  | 'Silhouette'
  | 'Other';

export const DISCIPLINES: Discipline[] = [
  'Precision Rifle',
  'F-Class',
  'Benchrest',
  'Long Range',
  'IPSC/USPSA',
  'ISSF/Olympic',
  'Airgun',
  'Silhouette',
  'Other',
];

export type DistanceUnit = 'm' | 'yd';

export type EquipmentType =
  | 'Rifle'
  | 'Pistol'
  | 'Shotgun'
  | 'Air Rifle'
  | 'Air Pistol';

export const EQUIPMENT_TYPES: EquipmentType[] = [
  'Rifle',
  'Pistol',
  'Shotgun',
  'Air Rifle',
  'Air Pistol',
];

export interface Equipment {
  id: number;
  name: string;
  type: EquipmentType;
  caliber: string;
  optic?: string;
  notes?: string;
  createdAt: string;
}

export interface Session {
  id: number;
  date: string;
  discipline: Discipline;
  distance: number;
  distanceUnit: DistanceUnit;
  equipmentId?: number;
  shots: number;
  score?: number;
  maxScore?: number;
  ammoDescription?: string;
  notes?: string;
  createdAt: string;
}

export interface Group {
  id: number;
  sessionId: number;
  sizeMm: number;
  shotCount: number;
  label?: string;
}

export interface SessionWithDetails extends Session {
  equipment?: Equipment;
  groups: Group[];
}
