export enum UserRole {
  ADMIN = 'ADMIN',
  CLIENT = 'CLIENT'
}

// Widget Type System
export enum WidgetCategory {
  READING = 'READING',       // Display widgets: charts, gauges, text
  CONTROLLING = 'CONTROLLING' // Input widgets: buttons, toggles, inputs
}

export enum ReadingWidgetType {
  LINE_CHART = 'LINE_CHART',
  BAR_CHART = 'BAR_CHART',
  GAUGE = 'GAUGE',
  TEXT_DISPLAY = 'TEXT_DISPLAY',
  STATUS_INDICATOR = 'STATUS_INDICATOR',
  LED_INDICATOR = 'LED_INDICATOR',
  MULTI_STATE_INDICATOR = 'MULTI_STATE_INDICATOR',
  PROGRESS_BAR = 'PROGRESS_BAR',
  CIRCULAR_PROGRESS = 'CIRCULAR_PROGRESS',
  TEXT_LOG = 'TEXT_LOG'
}

export enum ControllingWidgetType {
  BUTTON = 'BUTTON',
  TOGGLE = 'TOGGLE',
  SLIDER = 'SLIDER',
  TEXT_INPUT = 'TEXT_INPUT',
  NUMBER_INPUT = 'NUMBER_INPUT',
  COLOR_PICKER = 'COLOR_PICKER',
  COMBO_BOX = 'COMBO_BOX',
  RADIO_BUTTONS = 'RADIO_BUTTONS',
  TIME_PICKER = 'TIME_PICKER'
}

// Advanced MQTT Parameters
export type MqttQoS = 0 | 1 | 2;

export interface Widget {
  id: string;
  userId: string;
  name: string;
  category: WidgetCategory;
  widgetType: ReadingWidgetType | ControllingWidgetType;

  // MQTT Configuration
  mqttTopic: string;
  mqttAction: 'SUBSCRIBE' | 'PUBLISH';
  qos?: MqttQoS;
  retain?: boolean;

  // Data Extraction
  variableName: string;
  dataLabel?: string;

  // Widget-specific configuration
  config: WidgetConfig;

  position: number;
  isActive: boolean;

  // Alarm Configuration
  alarmEnabled?: boolean;
  alarmMin?: number;
  alarmMax?: number;
}

export interface Alarm {
  id: string;
  userId: string;
  widgetId: string;
  variableName: string;
  triggerValue: number;
  thresholdValue: number;
  alarmType: 'LOW' | 'HIGH' | 'OFFLINE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  createdAt: string;
  resolvedAt?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export type WidgetConfig =
  | GaugeConfig
  | ChartConfig
  | ButtonConfig
  | MultiStateConfig
  | LogConfig
  | Record<string, any>;

export interface GaugeConfig {
  min: number;
  max: number;
  unit: string;
  zones?: { value: number; color: string }[];
}

export interface ChartConfig {
  timeWindow: number; // in minutes
  showPoints: boolean;
  yMin?: number;
  yMax?: number;
}

export interface ButtonConfig {
  label: string;
  payload: string;
  color?: string;
}

export interface MultiStateConfig {
  states: { value: string; label: string; color: string; icon?: string }[];
}

export interface LogConfig {
  maxEntries: number;
  fontSize: number;
  showTimestamp: boolean;
}

// Legacy type - kept for backward compatibility during migration
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
  config?: UserConfig;  // Optional during migration to widget system
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
  config?: UserConfig;  // Optional during migration to widget system
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
  about: string;
  alarms: string;
  terms: string;
  privacy: string;
  acknowledge: string;
  clearAll: string;
  noActiveAlarms: string;
  viewHistory: string;
}
