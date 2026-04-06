export type Language = 'en' | 'fr';

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

  // Telemetry Configuration
  historyInterval?: number; // Target flux interval in seconds (default 10)
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
  | ComboBoxConfig
  | RadioButtonsConfig
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
  layoutWidth?: 'normal' | 'wide';
  yMin?: number;
  yMax?: number;
  thresholdWarning?: number;
  thresholdCritical?: number;
  unit?: string;
  tickInterval?: number;
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
  layoutWidth?: 'normal' | 'wide';
}

export interface ComboBoxConfig {
  options: { label: string; value: string }[];
}

export interface RadioButtonsConfig {
  options: { label: string; value: string }[];
}

// Legacy type - kept for backward compatibility during migration
export interface UserConfig {
  showTemperatureChart: boolean;
  showPressureChart: boolean;
  showPowerChart: boolean;
  allowSetpointControl: boolean;
  allowPowerControl: boolean;
  alarmSoundEnabled: boolean;
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
  // Navigation & Sessions
  dashboard: string;
  controls: string;
  settings: string;
  users: string;
  logout: string;
  about: string;
  terms: string;
  privacy: string;
  welcome: string;

  // Login Page
  clientPortal: string;
  industrialMonitoring: string;
  companyId: string;
  password: string;
  rememberDevice: string;
  forgotAccess: string;
  accessDashboard: string;
  visitWebsite: string;
  systemOperational: string;
  tagline: string;

  // Dashboard & Controls
  systemStatus: string;
  temperature: string;
  pressure: string;
  setpoint: string;
  active: string;
  inactive: string;
  save: string;
  cancel: string;
  alarms: string;
  acknowledge: string;
  clearAll: string;
  noActiveAlarms: string;
  viewHistory: string;
  
  // Settings
  preferences: string;
  language: string;
  selectLanguage: string;
  security: string;
  currentPassword: string;
  newPassword: string;
  updatePassword: string;
  // Forgot Access Modal
  forgotAccessTitle: string;
  forgotAccessDescription: string;
  contactSupport: string;
  close: string;
  passwordChangedSuccess: string;
  passwordChangeError: string;
  confirmPassword: string;

  // Corporate Pages
  aboutPlatform: string;
  productInfo: string;
  appName: string;
  appDescription: string;
  appDescriptionText: string;
  versionBuild: string;
  releaseDate: string;
  techSpecs: string;
  specMqtt: string;
  specSecurity: string;
  specCapacity: string;
  specArchitecture: string;
  specDatabase: string;
  specHosting: string;
  companyInfo: string;
  addressInfo: string;
  allRightsReserved: string;
  devCredits: string;
  architectureLead: string;
  inPartnershipWith: string;
  poweredBy: string;
  
  // Alarms Sound
  alarmSound: string;
  enableAlarmSound: string;
  disableAlarmSound: string;
  testSound: string;

  // MQTT Status
  brokerOnline: string;
  brokerConnecting: string;
  brokerError: string;
  brokerOffline: string;
  lastUpdate: string;
  ago: string;
  seconds: string;
  minutes: string;
  hours: string;
  // Alarm System
  alarmHistory: string;
  alarmAuditLog: string;
  status: string;
  alarm: string;
  value: string;
  threshold: string;
  created: string;
  details: string;
  activeStatus: string;
  acknowledgedStatus: string;
  resolvedStatus: string;
  lowSeverity: string;
  mediumSeverity: string;
  highSeverity: string;
  criticalSeverity: string;
  autoResolvedAt: string;
  acknowledgedAtLabel: string;
  monitoringActive: string;
  confirmClearHistory: string;
  limit: string;
  refresh: string;
  clearHistory: string;
  clearHistoryError: string;
  noHistoricalAlarmsToClear: string;
  systemRunningSmoothly: string;
  noAlarmHistory: string;
  vsLastHour: string;
  
  // Dashboard & Widgets
  dashboardLoading: string;
  monitoringUnit: string;
  plcliveFeed: string;
  noWidgets: string;
  awaitingData: string;
  sendCommand: string;
  on: string;
  off: string;
  publish: string;
  enterValue: string;
  option: string;
  units: string;
  configuration: string;
  live: string;
  unsupportedWidget: string;
  chartDataFromDatabase: string;
  chartSavedEverySeconds: string;
  chartRange1h: string;
  chartRange6h: string;
  chartRange12h: string;
  chartRange24h: string;
  adminDatabaseSampleInterval: string;
  adminTelemetrySamplingTitle: string;
  adminTelemetrySamplingBody: string;
  adminDatabaseSampleSelectTitle: string;
  adminSample10s: string;
  adminSample30s: string;
  adminSample1m: string;
  adminSample2m: string;
  adminSample5m: string;
  adminSample10m: string;
  adminSample15m: string;
  adminSample30m: string;
  adminSample1h: string;
  adminChartTimeRangeNote: string;
  adminChartYMinOptional: string;
  adminChartYMaxOptional: string;
  adminChartYMinTitle: string;
  adminChartYMaxTitle: string;
  adminPlaceholderAuto: string;
  adminShowPoints: string;
  widgetConfigTopic: string;
  widgetConfigVariable: string;
  widgetConfigAction: string;
  adminWidgetConfiguration: string;
  downloadWidgetData: string;
  downloadWidgetDataTooltip: string;
  exportTelemetryEmpty: string;
  exportTelemetryError: string;
  exportTelemetryDownloading: string;
  exportTelemetryDownloaded: string;
  exportCsvTimestamp: string;
  exportCsvValue: string;
  exportCsvVariable: string;
  exportCsvUnit: string;
}
