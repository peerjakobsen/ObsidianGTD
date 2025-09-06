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
      .addText(text => text
        .setPlaceholder('Enter API key')
        .setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => {
          this.plugin.settings.apiKey = value;
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
}