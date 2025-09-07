import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

export function createBedrockClient(bearerToken: string, region: string = 'us-east-1') {
  // Set the bearer token as environment variable (mimicking Python approach)
  // Note: In browser context, we may need a different approach
  if (typeof process !== 'undefined' && process.env) {
    process.env.AWS_BEARER_TOKEN_BEDROCK = bearerToken;
  }
  
  // Create client - SDK will automatically use the bearer token from env
  const client = new BedrockRuntimeClient({
    region: region
  });
  
  return client;
}

// Simple test function to verify imports work
export async function testConverse(client: BedrockRuntimeClient) {
  const command = new ConverseCommand({
    modelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',  // Correct model ID
    messages: [{ 
      role: 'user', 
      content: [{ text: 'test' }] 
    }]
  });
  
  return command;
}