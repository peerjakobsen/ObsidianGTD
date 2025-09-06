import { Plugin, PluginSettingTab, Setting } from 'obsidian';
import { GTDSettings, DEFAULT_SETTINGS } from './settings';
import { GTDSettingTab } from './settings-tab';

export default class ObsidianGTDPlugin extends Plugin {
  settings: GTDSettings;

  constructor(app: any, manifest: any) {
    super(app, manifest);
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
  }

  async onload() {
    await this.loadSettings();

    // Add ribbon icon
    const ribbonIconEl = this.addRibbonIcon('brain', 'GTD Assistant', (evt: MouseEvent) => {
      // This will be implemented in later tasks
      console.log('GTD Assistant clicked!');
    });
    ribbonIconEl.addClass('gtd-ribbon-class');

    // Add command to clarify inbox text
    this.addCommand({
      id: 'clarify-inbox-text',
      name: 'Clarify selected text (GTD)',
      editorCallback: (editor, view) => {
        const selectedText = editor.getSelection();
        if (selectedText) {
          this.clarifyInboxText(selectedText);
        } else {
          console.log('No text selected for clarification');
        }
      }
    });

    // Add settings tab
    this.addSettingTab(new GTDSettingTab(this.app, this));

    console.log('GTD Assistant plugin loaded');
  }

  onunload() {
    console.log('GTD Assistant plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  private async clarifyInboxText(text: string) {
    // This will be implemented in later tasks - GTD clarification process
    console.log('Clarifying inbox text:', text);
  }
}