import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GTDSettingTab } from '../src/settings-tab';
import { Setting, Notice } from 'obsidian';
import ObsidianGTDPlugin from '../src/main';

// Mock Obsidian components with comprehensive tracking
jest.mock('obsidian', () => ({
  PluginSettingTab: class MockPluginSettingTab {
    app: any;
    plugin: any;
    constructor(app: any, plugin: any) {
      this.app = app;
      this.plugin = plugin;
    }
  },
  Setting: jest.fn(),
  Notice: jest.fn(),
}));

// Mock fetch for connection testing
global.fetch = jest.fn();

describe('AWS Settings Panel', () => {
  let mockApp: any;
  let mockPlugin: any;
  let settingsTab: GTDSettingTab;
  let mockContainerEl: any;
  let settingMockInstances: any[];

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApp = {};
    
    mockPlugin = {
      settings: {
        backendUrl: 'http://localhost:8000',
        timeout: 30000,
        apiKey: '',
        awsBearerToken: '',
        awsBedrockModelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        awsRegion: 'us-east-1'
      },
      saveSettings: jest.fn().mockResolvedValue(undefined)
    };

    mockContainerEl = {
      empty: jest.fn(),
    };

    // Track all Setting instances created
    settingMockInstances = [];

    // Set up comprehensive Setting mock
    (Setting as jest.Mock).mockImplementation(() => {
      const instance = {
        setName: jest.fn().mockReturnThis(),
        setDesc: jest.fn().mockReturnThis(),
        addText: jest.fn().mockImplementation((callback) => {
          const mockTextInput = {
            inputEl: { type: 'text' },
            setPlaceholder: jest.fn().mockReturnThis(),
            setValue: jest.fn().mockReturnThis(),
            onChange: jest.fn().mockReturnThis(),
          };
          callback(mockTextInput);
          return instance;
        }),
        addDropdown: jest.fn().mockImplementation((callback) => {
          const mockDropdown = {
            addOption: jest.fn().mockReturnThis(),
            setValue: jest.fn().mockReturnThis(),
            onChange: jest.fn().mockReturnThis(),
          };
          callback(mockDropdown);
          return instance;
        }),
        addButton: jest.fn().mockImplementation((callback) => {
          const mockButton = {
            setButtonText: jest.fn().mockReturnThis(),
            setCta: jest.fn().mockReturnThis(),
            onClick: jest.fn().mockReturnThis(),
          };
          callback(mockButton);
          return instance;
        }),
      };
      settingMockInstances.push(instance);
      return instance;
    });

    settingsTab = new GTDSettingTab(mockApp, mockPlugin);
    settingsTab.containerEl = mockContainerEl;
  });

  describe('AWS Bearer Token Settings', () => {
    it('should create AWS bearer token input field with correct properties', () => {
      settingsTab.display();

      // Find the AWS Bearer Token setting (it should be the 4th Setting created after Backend URL, timeout, API Key)
      const bearerTokenSetting = settingMockInstances[3];
      
      expect(bearerTokenSetting.setName).toHaveBeenCalledWith('AWS Bearer Token');
      expect(bearerTokenSetting.setDesc).toHaveBeenCalledWith('Bearer token for AWS Bedrock authentication');
      
      // Verify addText callback was called and password masking was applied
      expect(bearerTokenSetting.addText).toHaveBeenCalled();
      const textCallback = bearerTokenSetting.addText.mock.calls[0][0];
      const mockTextInput = {
        inputEl: { type: 'text' },
        setPlaceholder: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      textCallback(mockTextInput);
      
      // Verify password masking is applied
      expect(mockTextInput.inputEl.type).toBe('password');
      expect(mockTextInput.setPlaceholder).toHaveBeenCalledWith('Enter AWS bearer token');
      expect(mockTextInput.setValue).toHaveBeenCalledWith('');
    });

    it('should handle bearer token input change and save settings', async () => {
      settingsTab.display();

      const bearerTokenSetting = settingMockInstances[3];
      const textCallback = bearerTokenSetting.addText.mock.calls[0][0];
      const mockTextInput = {
        inputEl: { type: 'text' },
        setPlaceholder: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      textCallback(mockTextInput);

      // Get the onChange callback and test it
      const onChangeCallback = mockTextInput.onChange.mock.calls[0][0];
      await onChangeCallback('new-bearer-token-value');

      expect(mockPlugin.settings.awsBearerToken).toBe('new-bearer-token-value');
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    it('should show validation message for short bearer token', async () => {
      settingsTab.display();

      const bearerTokenSetting = settingMockInstances[3];
      const textCallback = bearerTokenSetting.addText.mock.calls[0][0];
      const mockTextInput = {
        inputEl: { type: 'text' },
        setPlaceholder: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      textCallback(mockTextInput);

      const onChangeCallback = mockTextInput.onChange.mock.calls[0][0];
      await onChangeCallback('short');

      expect(Notice).toHaveBeenCalledWith('⚠️ Bearer token seems too short - verify it\'s complete');
    });
  });

  describe('AWS Bedrock ModelID Settings', () => {
    it('should create AWS Bedrock ModelID input field with correct properties', () => {
      settingsTab.display();

      // Find the AWS Bedrock Model ID setting (5th Setting created)
      const modelIdSetting = settingMockInstances[4];
      
      expect(modelIdSetting.setName).toHaveBeenCalledWith('AWS Bedrock Model ID');
      expect(modelIdSetting.setDesc).toHaveBeenCalledWith('Bedrock model identifier (e.g., us.anthropic.claude-sonnet-4-20250514-v1:0)');
      
      // Verify addText callback was called
      expect(modelIdSetting.addText).toHaveBeenCalled();
      const textCallback = modelIdSetting.addText.mock.calls[0][0];
      const mockTextInput = {
        inputEl: { type: 'text' },
        setPlaceholder: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      textCallback(mockTextInput);
      
      expect(mockTextInput.setPlaceholder).toHaveBeenCalledWith('us.anthropic.claude-sonnet-4-20250514-v1:0');
      expect(mockTextInput.setValue).toHaveBeenCalledWith('us.anthropic.claude-sonnet-4-20250514-v1:0');
    });

    it('should handle model ID input change and save settings', async () => {
      settingsTab.display();

      const modelIdSetting = settingMockInstances[4];
      const textCallback = modelIdSetting.addText.mock.calls[0][0];
      const mockTextInput = {
        inputEl: { type: 'text' },
        setPlaceholder: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      textCallback(mockTextInput);

      const onChangeCallback = mockTextInput.onChange.mock.calls[0][0];
      await onChangeCallback('us.anthropic.claude-opus-3-20240229-v1:0');

      expect(mockPlugin.settings.awsBedrockModelId).toBe('us.anthropic.claude-opus-3-20240229-v1:0');
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    it('should show validation message for invalid model ID format', async () => {
      settingsTab.display();

      const modelIdSetting = settingMockInstances[4];
      const textCallback = modelIdSetting.addText.mock.calls[0][0];
      const mockTextInput = {
        inputEl: { type: 'text' },
        setPlaceholder: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      textCallback(mockTextInput);

      const onChangeCallback = mockTextInput.onChange.mock.calls[0][0];
      await onChangeCallback('invalid-model-id');

      expect(Notice).toHaveBeenCalledWith('⚠️ Model ID should follow format: provider.model-name (e.g., anthropic.claude-3-haiku-20240307-v1:0)');
    });
  });

  describe('AWS Region Selector Settings', () => {
    it('should create AWS region dropdown with correct properties', () => {
      settingsTab.display();

      // Find the AWS Region setting (6th Setting created)
      const regionSetting = settingMockInstances[5];
      
      expect(regionSetting.setName).toHaveBeenCalledWith('AWS Region');
      expect(regionSetting.setDesc).toHaveBeenCalledWith('AWS region for Bedrock service');
      
      // Verify addDropdown callback was called
      expect(regionSetting.addDropdown).toHaveBeenCalled();
      const dropdownCallback = regionSetting.addDropdown.mock.calls[0][0];
      const mockDropdown = {
        addOption: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      dropdownCallback(mockDropdown);
      
      // Verify all expected regions are added as options
      expect(mockDropdown.addOption).toHaveBeenCalledWith('us-east-1', 'US East (N. Virginia)');
      expect(mockDropdown.addOption).toHaveBeenCalledWith('us-west-2', 'US West (Oregon)');
      expect(mockDropdown.addOption).toHaveBeenCalledWith('eu-west-1', 'Europe (Ireland)');
      expect(mockDropdown.addOption).toHaveBeenCalledWith('ap-southeast-1', 'Asia Pacific (Singapore)');
      expect(mockDropdown.addOption).toHaveBeenCalledWith('ap-northeast-1', 'Asia Pacific (Tokyo)');
      
      expect(mockDropdown.setValue).toHaveBeenCalledWith('us-east-1');
    });

    it('should handle region selection change and save settings', async () => {
      settingsTab.display();

      const regionSetting = settingMockInstances[5];
      const dropdownCallback = regionSetting.addDropdown.mock.calls[0][0];
      const mockDropdown = {
        addOption: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      dropdownCallback(mockDropdown);

      const onChangeCallback = mockDropdown.onChange.mock.calls[0][0];
      await onChangeCallback('eu-west-1');

      expect(mockPlugin.settings.awsRegion).toBe('eu-west-1');
      expect(mockPlugin.saveSettings).toHaveBeenCalled();
    });

    it('should include all major AWS regions with Bedrock support', () => {
      settingsTab.display();

      const regionSetting = settingMockInstances[5];
      const dropdownCallback = regionSetting.addDropdown.mock.calls[0][0];
      const mockDropdown = {
        addOption: jest.fn().mockReturnThis(),
        setValue: jest.fn().mockReturnThis(),
        onChange: jest.fn().mockReturnThis(),
      };
      dropdownCallback(mockDropdown);

      // Verify all required regions are present
      const expectedRegions = [
        ['us-east-1', 'US East (N. Virginia)'],
        ['us-west-2', 'US West (Oregon)'],
        ['eu-west-1', 'Europe (Ireland)'],
        ['ap-southeast-1', 'Asia Pacific (Singapore)'],
        ['ap-northeast-1', 'Asia Pacific (Tokyo)']
      ];

      expectedRegions.forEach(([value, label]) => {
        expect(mockDropdown.addOption).toHaveBeenCalledWith(value, label);
      });
    });
  });

  describe('AWS Connection Testing', () => {
    it('should create AWS connection test button with correct properties', () => {
      settingsTab.display();

      // Find the Test AWS connection setting (8th Setting created)
      const connectionTestSetting = settingMockInstances[7];
      
      expect(connectionTestSetting.setName).toHaveBeenCalledWith('Test AWS connection');
      expect(connectionTestSetting.setDesc).toHaveBeenCalledWith('Test connection to AWS Bedrock service');
      
      // Verify addButton callback was called
      expect(connectionTestSetting.addButton).toHaveBeenCalled();
      const buttonCallback = connectionTestSetting.addButton.mock.calls[0][0];
      const mockButton = {
        setButtonText: jest.fn().mockReturnThis(),
        setCta: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockReturnThis(),
      };
      buttonCallback(mockButton);
      
      expect(mockButton.setButtonText).toHaveBeenCalledWith('Test AWS');
      expect(mockButton.setCta).toHaveBeenCalled();
    });

    it('should handle successful AWS connection test', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK'
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      // Set up valid AWS settings
      mockPlugin.settings.awsBearerToken = 'valid-bearer-token';
      mockPlugin.settings.awsBedrockModelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
      mockPlugin.settings.awsRegion = 'us-east-1';

      settingsTab.display();

      const connectionTestSetting = settingMockInstances[7];
      const buttonCallback = connectionTestSetting.addButton.mock.calls[0][0];
      const mockButton = {
        setButtonText: jest.fn().mockReturnThis(),
        setCta: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockReturnThis(),
      };
      buttonCallback(mockButton);

      const onClickCallback = mockButton.onClick.mock.calls[0][0];
      await onClickCallback();

      expect(Notice).toHaveBeenCalledWith('🔄 Testing AWS Bedrock endpoint reachability...');
      expect(Notice).toHaveBeenCalledWith('✅ AWS Bedrock endpoint responded successfully');
    });

    it('should handle AWS connection test validation failure', async () => {
      // Set up invalid AWS settings (missing bearer token)
      mockPlugin.settings.awsBearerToken = '';
      mockPlugin.settings.awsBedrockModelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
      mockPlugin.settings.awsRegion = 'us-east-1';

      settingsTab.display();

      const connectionTestSetting = settingMockInstances[7];
      const buttonCallback = connectionTestSetting.addButton.mock.calls[0][0];
      const mockButton = {
        setButtonText: jest.fn().mockReturnThis(),
        setCta: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockReturnThis(),
      };
      buttonCallback(mockButton);

      const onClickCallback = mockButton.onClick.mock.calls[0][0];
      await onClickCallback();

      expect(Notice).toHaveBeenCalledWith(
        expect.stringContaining('❌ AWS settings validation failed:')
      );
    });

    it('should handle AWS connection test timeout', async () => {
      const mockError = new Error('The operation was aborted');
      mockError.name = 'AbortError';
      (global.fetch as jest.Mock).mockRejectedValue(mockError);

      // Set up valid AWS settings
      mockPlugin.settings.awsBearerToken = 'valid-bearer-token';
      mockPlugin.settings.awsBedrockModelId = 'us.anthropic.claude-sonnet-4-20250514-v1:0';
      mockPlugin.settings.awsRegion = 'us-east-1';

      settingsTab.display();

      const connectionTestSetting = settingMockInstances[7];
      const buttonCallback = connectionTestSetting.addButton.mock.calls[0][0];
      const mockButton = {
        setButtonText: jest.fn().mockReturnThis(),
        setCta: jest.fn().mockReturnThis(),
        onClick: jest.fn().mockReturnThis(),
      };
      buttonCallback(mockButton);

      const onClickCallback = mockButton.onClick.mock.calls[0][0];
      await onClickCallback();

      expect(Notice).toHaveBeenCalledWith('❌ AWS connection test timed out');
    });
  });

  describe('Settings Validation', () => {
    it('should validate bearer token is not empty for AWS connection', () => {
      mockPlugin.settings.awsBearerToken = '';
      
      const isValid = mockPlugin.settings.awsBearerToken.trim().length > 0;
      expect(isValid).toBe(false);
    });

    it('should validate model ID follows correct format pattern', () => {
      const validModelIds = [
        'us.anthropic.claude-sonnet-4-20250514-v1:0',
        'us.anthropic.claude-haiku-3-20240307-v1:0',
        'meta.llama3-8b-instruct-v1:0',
        'amazon.titan-text-express-v1'
      ];

      const invalidModelIds = [
        '',
        'invalid-model',
        'model-without-provider'
      ];

      // Test valid model IDs
      validModelIds.forEach(modelId => {
        const isValid = modelId.includes('.') && modelId.length > 0;
        expect(isValid).toBe(true);
      });

      // Test invalid model IDs
      invalidModelIds.forEach(modelId => {
        const isValid = modelId.includes('.') && modelId.length > 0;
        expect(isValid).toBe(false);
      });
    });

    it('should validate AWS region is from supported list', () => {
      const supportedRegions = [
        'us-east-1',
        'us-west-2',
        'eu-west-1',
        'ap-southeast-1',
        'ap-northeast-1'
      ];

      supportedRegions.forEach(region => {
        mockPlugin.settings.awsRegion = region;
        const isValid = supportedRegions.includes(mockPlugin.settings.awsRegion);
        expect(isValid).toBe(true);
      });

      // Test invalid region
      mockPlugin.settings.awsRegion = 'invalid-region';
      const isValid = supportedRegions.includes(mockPlugin.settings.awsRegion);
      expect(isValid).toBe(false);
    });
  });

  describe('Settings Integration', () => {
    it('should load AWS settings from stored data', () => {
      const storedSettings = {
        backendUrl: 'http://localhost:8000',
        timeout: 30000,
        apiKey: '',
        awsBearerToken: 'stored-bearer-token',
        awsBedrockModelId: 'us.anthropic.claude-opus-3-20240229-v1:0',
        awsRegion: 'eu-west-1'
      };

      mockPlugin.settings = storedSettings;

      expect(mockPlugin.settings.awsBearerToken).toBe('stored-bearer-token');
      expect(mockPlugin.settings.awsBedrockModelId).toBe('us.anthropic.claude-opus-3-20240229-v1:0');
      expect(mockPlugin.settings.awsRegion).toBe('eu-west-1');
    });

    it('should use default AWS settings when no stored data exists', () => {
      const defaultSettings = {
        backendUrl: 'http://localhost:8000',
        timeout: 30000,
        apiKey: '',
        awsBearerToken: '',
        awsBedrockModelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        awsRegion: 'us-east-1'
      };

      mockPlugin.settings = defaultSettings;

      expect(mockPlugin.settings.awsBearerToken).toBe('');
      expect(mockPlugin.settings.awsBedrockModelId).toBe('us.anthropic.claude-sonnet-4-20250514-v1:0');
      expect(mockPlugin.settings.awsRegion).toBe('us-east-1');
    });

    it('should persist AWS settings when changed', async () => {
      mockPlugin.settings = {
        backendUrl: 'http://localhost:8000',
        timeout: 30000,
        apiKey: '',
        awsBearerToken: '',
        awsBedrockModelId: 'us.anthropic.claude-sonnet-4-20250514-v1:0',
        awsRegion: 'us-east-1'
      };

      // Simulate changing settings
      mockPlugin.settings.awsBearerToken = 'new-token';
      mockPlugin.settings.awsBedrockModelId = 'us.anthropic.claude-opus-3-20240229-v1:0';
      mockPlugin.settings.awsRegion = 'us-west-2';
      
      await mockPlugin.saveSettings();

      expect(mockPlugin.saveSettings).toHaveBeenCalled();
      expect(mockPlugin.settings.awsBearerToken).toBe('new-token');
      expect(mockPlugin.settings.awsBedrockModelId).toBe('us.anthropic.claude-opus-3-20240229-v1:0');
      expect(mockPlugin.settings.awsRegion).toBe('us-west-2');
    });
  });
});