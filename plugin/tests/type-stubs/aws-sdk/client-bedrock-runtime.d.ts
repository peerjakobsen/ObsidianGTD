declare module '@aws-sdk/client-bedrock-runtime' {
  export class BedrockRuntimeClient {
    constructor(config?: any)
    send(command: any): Promise<any>
  }
  export class ConverseCommand {
    constructor(input?: any)
  }
  export interface ConverseCommandInput {
    [key: string]: any
  }
  export interface ConverseCommandOutput {
    [key: string]: any
  }
}

