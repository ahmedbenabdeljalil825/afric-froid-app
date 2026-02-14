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

export interface MqttConfig {
  brokerUrl: string;
  username?: string;
  password?: string;
  topics: {
    telemetry: string;
    command: string;
  };
}

export interface User {
  id: string;
  companyId: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  config: UserConfig;
  mqttConfig?: MqttConfig;
  language: 'en' | 'fr';
  password?: string;
}

export interface Profile {
  id: string; // matches auth.users.id
  company_id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  config: UserConfig;
  mqtt_config?: MqttConfig;
  language: 'en' | 'fr';
  password?: string;
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
