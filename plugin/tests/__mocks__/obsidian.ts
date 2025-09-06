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
  addText() { return this; }
  addButton() { return this; }
}

export class Notice {
  constructor(message: string) {}
}