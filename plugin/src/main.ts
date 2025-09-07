import { Plugin, Notice, MarkdownView } from 'obsidian';
import { GTDSettings, DEFAULT_SETTINGS } from './settings';
import { GTDSettingTab } from './settings-tab';
import { GTDClarificationService, createClarificationService } from './clarification-service';
import { logger } from './logger';
import { createBedrockClient } from './bedrock-client';
import { GTDAssistantView, GTD_ASSISTANT_VIEW_TYPE } from './assistant-view';

export default class ObsidianGTDPlugin extends Plugin {
  settings: GTDSettings;
  clarificationService: GTDClarificationService;

  constructor(app: any, manifest: any) {
    super(app, manifest);
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
  }

  async onload() {
    logger.info('Plugin', 'Starting GTD Assistant plugin load');
    
    await this.loadSettings();
    
    // Initialize clarification service
    this.clarificationService = createClarificationService(this.settings);
    logger.info('Plugin', 'Clarification service initialized', { 
      hasValidConfig: this.clarificationService.getServiceInfo().hasValidConfig 
    });

    // Add ribbon icon
    const ribbonIconEl = this.addRibbonIcon('brain', 'GTD Assistant', () => {
      logger.logUserAction('Plugin', 'Ribbon icon clicked');
      new Notice('GTD Assistant: Use Cmd+Shift+G or select text and use command palette');
    });
    ribbonIconEl.addClass('gtd-ribbon-class');

    // Add command to clarify inbox text
    this.addCommand({
      id: 'clarify-inbox-text',
      name: 'Clarify selected text (GTD)',
      hotkeys: [
        {
          modifiers: ['Mod', 'Shift'],
          key: 'g'
        }
      ],
      editorCallback: (editor) => {
        logger.logUserAction('Plugin', 'Clarify command triggered');
        const selectedText = editor.getSelection();
        if (selectedText) {
          logger.info('Plugin', 'Text selected for clarification', { 
            textLength: selectedText.length,
            firstChars: selectedText.substring(0, 50) + (selectedText.length > 50 ? '...' : '')
          });
          this.clarifyInboxText(selectedText);
        } else {
          logger.warn('Plugin', 'No text selected for clarification');
          new Notice('No text selected for GTD clarification');
        }
      }
    });

    // Add settings tab
    this.addSettingTab(new GTDSettingTab(this.app, this));

    // Register assistant sidebar view
    (this as any).registerView?.(GTD_ASSISTANT_VIEW_TYPE, (leaf: any) => new GTDAssistantView(leaf, this));

    // Command to open the assistant sidebar
    this.addCommand({
      id: 'open-gtd-assistant',
      name: 'Open GTD Assistant (Sidebar)',
      callback: async () => {
        await this.activateAssistantView();
      }
    });

    // Command to toggle the assistant sidebar
    this.addCommand({
      id: 'toggle-gtd-assistant',
      name: 'Toggle GTD Assistant (Sidebar)',
      callback: async () => {
        await this.toggleAssistantView();
      }
    });

    logger.info('Plugin', 'GTD Assistant plugin loaded successfully');
    
    // Force AWS SDK bundling - create a test client but don't use it
    try {
      const testClient = createBedrockClient('test-token');
      logger.debug('Plugin', 'AWS SDK loaded successfully', { hasClient: !!testClient });
    } catch (e) {
      logger.debug('Plugin', 'AWS SDK loaded but test failed (expected)', { error: e.message });
    }
  }

  onunload() {
    console.log('GTD Assistant plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    
    // Update clarification service with new settings
    if (this.clarificationService) {
      this.clarificationService.updateSettings(this.settings);
    }
  }

  private async activateAssistantView() {
    try {
      const workspace: any = (this as any).app?.workspace;
      const rightLeaf = workspace?.getRightLeaf ? workspace.getRightLeaf(false) : workspace?.getLeaf?.(true);
      const leaf = rightLeaf || workspace?.getLeaf?.(true);
      if (!leaf?.setViewState) return;
      await leaf.setViewState({ type: GTD_ASSISTANT_VIEW_TYPE, active: true });
      workspace?.revealLeaf?.(leaf);
    } catch (e) {
      // In tests, workspace APIs may not exist
    }
  }

  private async toggleAssistantView() {
    try {
      const workspace: any = (this as any).app?.workspace;
      const existing = workspace?.getLeavesOfType?.(GTD_ASSISTANT_VIEW_TYPE);
      if (existing && existing.length > 0) {
        workspace?.detachLeavesOfType?.(GTD_ASSISTANT_VIEW_TYPE);
        return;
      }
      await this.activateAssistantView();
    } catch (e) {
      // ignore in test envs
    }
  }

  private async clarifyInboxText(text: string) {
    logger.startPerformanceMark('clarification_workflow');
    logger.info('Plugin', 'Starting clarification workflow', { textLength: text.length });
    
    // Show initial feedback to user
    const progressNotice = new Notice('🧠 Clarifying text using GTD methodology...', 0);
    
    try {
      // Use the clarification service to process the text
      const result = await this.clarificationService.clarifyInboxText(text);
      
      logger.endPerformanceMark('Plugin', 'clarification_workflow');
      logger.info('Plugin', 'Clarification completed', { 
        success: result.success,
        actionCount: result.actions.length,
        processingTime: result.processing_time_ms
      });
      
      // Hide progress notice
      progressNotice.hide();
      
      // Check if we have any actions to display (either successful or fallback actions)
      if (result.actions.length > 0) {
        // Convert actions to Tasks format
        const taskLines = this.clarificationService.convertToTasksFormat(result);
        logger.debug('Plugin', 'Tasks format conversion completed', { taskCount: taskLines.length });
        
        // Insert tasks at cursor position
        try {
          const activeView = this.app?.workspace?.getActiveViewOfType(MarkdownView);
          if (activeView && activeView.editor) {
            const editor = activeView.editor;
            const cursor = editor.getCursor();
            
            // Add a blank line before tasks
            const tasksText = '\n' + taskLines.join('\n') + '\n';
            editor.replaceRange(tasksText, cursor);
            
            logger.logUserAction('Plugin', 'Tasks inserted into editor', {
              cursorPosition: cursor,
              taskCount: taskLines.length,
              totalLength: tasksText.length
            });
          } else {
            logger.warn('Plugin', 'No active markdown view found for task insertion');
          }
        } catch (error) {
          logger.warn('Plugin', 'Error inserting tasks into editor (likely running in test environment)', { error: error.message });
        }
        
        // Show appropriate notice based on success status
        const actionCount = result.actions.length;
        const actionTypes = result.actions.map(a => a.type).join(', ');
        
        if (result.success) {
          new Notice(`✅ GTD clarification completed! Generated ${actionCount} actions: ${actionTypes}`, 5000);
          logger.info('Plugin', 'User notified of successful clarification', { actionCount, actionTypes });
        } else {
          // Partial failure with fallback actions
          new Notice(`⚠️ ${result.error || 'Processing issue occurred'} Created ${actionCount} fallback actions.`, 8000);
          logger.warn('Plugin', 'Clarification had issues but created fallback actions', { 
            error: result.error,
            actionCount,
            textLength: text.length 
          });
        }
        
      } else {
        // No actions generated at all
        const errorMessage = result.error || 'No actionable items found in the selected text.';
        new Notice(`⚠️ ${errorMessage}`, 8000);
        
        logger.warn('Plugin', 'Clarification completed but no actions generated', { 
          error: result.error,
          textLength: text.length 
        });
      }
      
    } catch (error) {
      logger.endPerformanceMark('Plugin', 'clarification_workflow');
      
      // Update feedback with error
      progressNotice.hide();
      new Notice(`❌ GTD clarification failed: ${error.message || error}`, 8000);
      
      logger.error('Plugin', 'Clarification workflow failed', error as Error, {
        textLength: text.length,
        errorMessage: error.message || String(error)
      });
    }
  }
}
