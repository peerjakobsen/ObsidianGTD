export interface GTDSettings {
  backendUrl: string;
  timeout: number;
  apiKey: string;
  awsBearerToken: string;
  awsBedrockModelId: string;
  awsRegion: string;
}

export const DEFAULT_SETTINGS: GTDSettings = {
  backendUrl: 'http://localhost:8000',
  timeout: 30000,
  apiKey: '',
  awsBearerToken: '',
  awsBedrockModelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  awsRegion: 'us-east-1'
};