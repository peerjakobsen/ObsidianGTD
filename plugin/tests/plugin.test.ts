import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import ObsidianGTDPlugin from '../src/main';
import { App, Plugin } from 'obsidian';

// Mock Obsidian App
const mockApp = {
  workspace: {
    on: jest.fn(),
    off: jest.fn(),
  },
  vault: {
    on: jest.fn(),
    off: jest.fn(),
  },
} as unknown as App;

// Mock plugin manifest
const mockManifest = {
  id: 'obsidian-gtd',
  name: 'Obsidian GTD',
  version: '1.0.0',
  minAppVersion: '0.15.0',
  description: 'Getting Things Done (GTD) workflow with AI assistance via local FastAPI server',
  author: 'Your Name',
  authorUrl: '',
  fundingUrl: '',
  isDesktopOnly: false,
};

describe('ObsidianGTDPlugin', () => {
  let plugin: ObsidianGTDPlugin;

  beforeEach(() => {
    plugin = new ObsidianGTDPlugin(mockApp, mockManifest);
  });

  describe('Plugin Initialization', () => {
    it('should create plugin instance', () => {
      expect(plugin).toBeInstanceOf(Plugin);
      expect(plugin).toBeInstanceOf(ObsidianGTDPlugin);
    });

    it('should have correct app reference', () => {
      expect(plugin.app).toBe(mockApp);
    });

    it('should have correct manifest', () => {
      expect(plugin.manifest).toEqual(mockManifest);
    });

    it('should initialize with default settings', () => {
      expect(plugin.settings).toBeDefined();
      expect(plugin.settings.backendUrl).toBe('http://localhost:8000');
      expect(plugin.settings.timeout).toBe(30000);
      expect(plugin.settings.apiKey).toBe('');
    });
  });

  describe('Plugin Lifecycle', () => {
    it('should have onload method', () => {
      expect(typeof plugin.onload).toBe('function');
    });

    it('should have onunload method', () => {
      expect(typeof plugin.onunload).toBe('function');
    });

    it('should load settings on onload', async () => {
      const loadDataSpy = jest.spyOn(plugin, 'loadData').mockResolvedValue({
        backendUrl: 'http://test:8000',
        timeout: 60000,
        apiKey: 'test-key',
      });

      await plugin.onload();

      expect(loadDataSpy).toHaveBeenCalled();
      expect(plugin.settings.backendUrl).toBe('http://test:8000');
      expect(plugin.settings.timeout).toBe(60000);
      expect(plugin.settings.apiKey).toBe('test-key');
    });
  });
});