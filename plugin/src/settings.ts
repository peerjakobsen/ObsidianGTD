export interface GTDSettings {
  backendUrl: string;
  timeout: number;
  apiKey: string;
}

export const DEFAULT_SETTINGS: GTDSettings = {
  backendUrl: 'http://localhost:8000',
  timeout: 30000,
  apiKey: ''
};