export class Plugin {
  app: any;
  manifest: any;
  
  constructor(app: any, manifest: any) {
    this.app = app;
    this.manifest = manifest;
  }

  addRibbonIcon() {
    return { addClass: jest.fn() };
  }

  addCommand() {
    return {};
  }

  registerView() {
    return {};
  }

  addSettingTab() {
    return {};
  }

  loadData() {
    return Promise.resolve({});
  }

  saveData() {
    return Promise.resolve();
  }
}

export class Editor {
  getSelection = jest.fn();
}

export class MarkdownView {
  file: any = {};
  editor: any;
  
  constructor(app?: any, file?: any) {
    this.editor = new Editor();
    this.file = file || {};
  }
}

export class MarkdownFileInfo {
  file: any = {};
}

export class PluginSettingTab {
  app: any;
  plugin: any;
  containerEl: any = { empty: jest.fn() };

  constructor(app: any, plugin: any) {
    this.app = app;
    this.plugin = plugin;
  }
}

export class Setting {
  constructor(containerEl: any) {}
  
  setName() { return this; }
  setDesc() { return this; }
  addText(callback: any) { 
    const mockTextInput = {
      setPlaceholder: jest.fn().mockReturnThis(),
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn().mockReturnThis(),
    };
    callback(mockTextInput);
    return this; 
  }
  addButton(callback: any) { 
    const mockButton = {
      setButtonText: jest.fn().mockReturnThis(),
      setCta: jest.fn().mockReturnThis(),
      onClick: jest.fn().mockReturnThis(),
    };
    callback(mockButton);
    return this; 
  }
  addDropdown(callback: any) { 
    const mockDropdown = {
      addOption: jest.fn().mockReturnThis(),
      setValue: jest.fn().mockReturnThis(),
      onChange: jest.fn().mockReturnThis(),
    };
    callback(mockDropdown);
    return this; 
  }
}

export const Notice = jest.fn().mockImplementation((message: string, timeout?: number) => ({
  hide: jest.fn()
}));

export class ItemView {
  containerEl: HTMLElement;
  leaf: any;
  constructor(leaf: any) {
    this.leaf = leaf;
    this.containerEl = leaf?.containerEl || document.createElement('div');
  }
  getViewType(): string { return ''; }
  getDisplayText(): string { return ''; }
  async onOpen(): Promise<void> {}
  async onClose(): Promise<void> {}
}

export class WorkspaceLeaf {
  containerEl: HTMLElement = document.createElement('div');
  view: any;
  setViewState = jest.fn();
  detach = jest.fn();
}
