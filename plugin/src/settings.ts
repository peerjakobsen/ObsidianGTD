export interface GTDSettings {
  timeout: number;
  awsBearerToken: string;
  awsBedrockModelId: string;
  awsRegion: string;
}

export const DEFAULT_SETTINGS: GTDSettings = {
  timeout: 30000,
  awsBearerToken: '',
  awsBedrockModelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
  awsRegion: 'us-east-1'
};
