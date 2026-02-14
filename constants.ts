import { UserConfig, Translation } from './types';

export const DEFAULT_USER_CONFIG: UserConfig = {
  showTemperatureChart: true,
  showPressureChart: true,
  showPowerChart: false,
  allowSetpointControl: true,
  allowPowerControl: false,
};

export const TRANSLATIONS: Record<'en' | 'fr', Translation> = {
  en: {
    dashboard: 'Dashboard',
    controls: 'Controls',
    settings: 'Settings',
    users: 'User Management',
    logout: 'Logout',
    welcome: 'Welcome back',
    systemStatus: 'System Status',
    temperature: 'Temperature',
    pressure: 'Pressure',
    setpoint: 'Setpoint',
    active: 'Active',
    inactive: 'Inactive',
    save: 'Save Changes',
    cancel: 'Cancel',
  },
  fr: {
    dashboard: 'Tableau de bord',
    controls: 'Commandes',
    settings: 'Paramètres',
    users: 'Gestion des utilisateurs',
    logout: 'Déconnexion',
    welcome: 'Bon retour',
    systemStatus: 'État du système',
    temperature: 'Température',
    pressure: 'Pression',
    setpoint: 'Consigne',
    active: 'Actif',
    inactive: 'Inactif',
    save: 'Enregistrer',
    cancel: 'Annuler',
  }
};
