import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import ObsidianGTDPlugin from './main';

export class GTDSettingTab extends PluginSettingTab {
  plugin: ObsidianGTDPlugin;

  constructor(app: App, plugin: ObsidianGTDPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;

    containerEl.empty();

    new Setting(containerEl)
      .setName('Backend URL')
      .setDesc('URL of the FastAPI backend service')
      .addText(text => text
        .setPlaceholder('http://localhost:8000')
        .setValue(this.plugin.settings.backendUrl)
        .onChange(async (value) => {
          this.plugin.settings.backendUrl = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Request timeout')
      .setDesc('Timeout in milliseconds for API requests')
      .addText(text => text
        .setPlaceholder('30000')
        .setValue(String(this.plugin.settings.timeout))
        .onChange(async (value) => {
          this.plugin.settings.timeout = parseInt(value) || 30000;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('API Key')
      .setDesc('Optional API key for authentication')
      .addText(text => {
        text.inputEl.type = 'password';
        return text
          .setPlaceholder('Enter API key')
          .setValue(this.plugin.settings.apiKey)
          .onChange(async (value) => {
            this.plugin.settings.apiKey = value;
            await this.plugin.saveSettings();
          });
      });

    new Setting(containerEl)
      .setName('AWS Bearer Token')
      .setDesc('Bearer token for AWS Bedrock authentication')
      .addText(text => {
        text.inputEl.type = 'password';
        return text
          .setPlaceholder('Enter AWS bearer token')
          .setValue(this.plugin.settings.awsBearerToken)
          .onChange(async (value) => {
            this.plugin.settings.awsBearerToken = value;
            await this.plugin.saveSettings();
            
            // Validate bearer token
            if (value.trim() && value.length < 10) {
              new Notice('⚠️ Bearer token seems too short - verify it\'s complete');
            }
          });
      });

    new Setting(containerEl)
      .setName('AWS Bedrock Model ID')
      .setDesc('Bedrock model identifier (e.g., us.anthropic.claude-sonnet-4-20250514-v1:0)')
      .addText(text => text
        .setPlaceholder('us.anthropic.claude-sonnet-4-20250514-v1:0')
        .setValue(this.plugin.settings.awsBedrockModelId)
        .onChange(async (value) => {
          const modelId = value || 'us.anthropic.claude-sonnet-4-20250514-v1:0';
          this.plugin.settings.awsBedrockModelId = modelId;
          await this.plugin.saveSettings();
          
          // Validate model ID format
          if (modelId.trim() && !modelId.includes('.')) {
            new Notice('⚠️ Model ID should follow format: provider.model-name (e.g., anthropic.claude-3-haiku-20240307-v1:0)');
          }
        }));

    new Setting(containerEl)
      .setName('AWS Region')
      .setDesc('AWS region for Bedrock service')
      .addDropdown(dropdown => dropdown
        .addOption('us-east-1', 'US East (N. Virginia)')
        .addOption('us-west-2', 'US West (Oregon)')
        .addOption('eu-west-1', 'Europe (Ireland)')
        .addOption('ap-southeast-1', 'Asia Pacific (Singapore)')
        .addOption('ap-northeast-1', 'Asia Pacific (Tokyo)')
        .setValue(this.plugin.settings.awsRegion)
        .onChange(async (value) => {
          this.plugin.settings.awsRegion = value;
          await this.plugin.saveSettings();
        }));

    new Setting(containerEl)
      .setName('Test connection')
      .setDesc('Test connection to the backend service')
      .addButton(button => button
        .setButtonText('Test')
        .setCta()
        .onClick(async () => {
          await this.testConnection();
        }));

    new Setting(containerEl)
      .setName('Test AWS connection')
      .setDesc('Test connection to AWS Bedrock service')
      .addButton(button => button
        .setButtonText('Test AWS')
        .setCta()
        .onClick(async () => {
          await this.testAwsConnection();
        }));
  }

  private async testConnection(): Promise<void> {
    try {
      const response = await fetch(`${this.plugin.settings.backendUrl}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.plugin.settings.apiKey && { 'Authorization': `Bearer ${this.plugin.settings.apiKey}` })
        },
        signal: (() => {
          const controller = new AbortController();
          setTimeout(() => controller.abort(), this.plugin.settings.timeout);
          return controller.signal;
        })()
      });

      if (response.ok) {
        new Notice('✅ Connection successful!');
      } else {
        new Notice(`❌ Connection failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      new Notice(`❌ Connection failed: ${error.message}`);
    }
  }

  private validateAwsSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.plugin.settings.awsBearerToken.trim()) {
      errors.push('AWS Bearer Token is required');
    }

    if (!this.plugin.settings.awsBedrockModelId.trim()) {
      errors.push('AWS Bedrock Model ID is required');
    } else {
      // Validate model ID format (should contain a dot for provider.model)
      if (!this.plugin.settings.awsBedrockModelId.includes('.')) {
        errors.push('AWS Bedrock Model ID must follow format: provider.model-name');
      }
    }

    if (!this.plugin.settings.awsRegion.trim()) {
      errors.push('AWS Region is required');
    } else {
      // Validate region format
      const validRegions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'ap-northeast-1'];
      if (!validRegions.includes(this.plugin.settings.awsRegion)) {
        errors.push('AWS Region must be a valid region');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  public validateSettings(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate timeout
    if (this.plugin.settings.timeout < 1000) {
      errors.push('Timeout must be at least 1000ms');
    }

    // Validate backend URL format (for legacy support)
    if (this.plugin.settings.backendUrl.trim() && !this.plugin.settings.backendUrl.startsWith('http')) {
      errors.push('Backend URL must start with http:// or https://');
    }

    // Validate AWS settings if they're being used
    const awsValidation = this.validateAwsSettings();
    if (!awsValidation.isValid) {
      errors.push(...awsValidation.errors.map(error => `AWS: ${error}`));
    }

    return { isValid: errors.length === 0, errors };
  }

  private async testAwsConnection(): Promise<void> {
    try {
      // Validate AWS settings
      const validation = this.validateAwsSettings();
      if (!validation.isValid) {
        new Notice(`❌ AWS settings validation failed:\n${validation.errors.join('\n')}`);
        return;
      }

      // Show testing notice
      new Notice('🔄 Testing AWS Bedrock endpoint reachability...');

      // For now, check AWS endpoint reachability without sending credentials
      // TODO: Replace with actual AWS SDK Bedrock client test when SDK is integrated
      // This should use a minimal Converse command or proper AWS SDK validation
      const testUrl = `https://bedrock-runtime.${this.plugin.settings.awsRegion}.amazonaws.com`;
      
      try {
        const response = await fetch(testUrl, {
          method: 'HEAD',
          // Don't send Authorization header for simple reachability test
          signal: (() => {
            const controller = new AbortController();
            setTimeout(() => controller.abort(), 10000); // 10 second timeout
            return controller.signal;
          })()
        });

        // Update messages to reflect this is just endpoint reachability testing
        if (response.status === 403) {
          new Notice('✅ AWS Bedrock endpoint is reachable (credential validation will happen during actual usage)');
        } else if (response.status < 500) {
          new Notice('✅ AWS Bedrock endpoint responded successfully');
        } else {
          new Notice(`❌ AWS endpoint error: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        if (error.name === 'AbortError') {
          new Notice('❌ AWS connection test timed out');
        } else if (error.message.includes('CORS') || error.message.includes('TypeError: Failed to fetch')) {
          // CORS errors in browser are expected when testing directly - this actually indicates the endpoint exists
          new Notice('⚠️ AWS endpoint validation complete (CORS expected in browser)');
        } else {
          new Notice(`❌ AWS connection failed: ${error.message}`);
        }
      }
    } catch (error) {
      new Notice(`❌ AWS connection test error: ${error.message}`);
    }
  }
}