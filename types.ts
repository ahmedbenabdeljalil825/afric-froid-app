export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

export interface UserConfig {
  showTemperatureChart: boolean;
  showPressureChart: boolean;
  showPowerChart: boolean;
  allowSetpointControl: boolean;
  allowPowerControl: boolean;
}

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  config: UserConfig;
  language: 'en' | 'fr';
}

export interface PLCTelemetry {
  temperature: number;
  setpoint: number;
  pressure: number;
  powerUsage: number;
  status: 'RUNNING' | 'IDLE' | 'DEFROST' | 'ALARM';
  timestamp: number;
}

export interface Translation {
  dashboard: string;
  controls: string;
  settings: string;
  users: string;
  logout: string;
  welcome: string;
  systemStatus: string;
  temperature: string;
  pressure: string;
  setpoint: string;
  active: string;
  inactive: string;
  save: string;
  cancel: string;
}
