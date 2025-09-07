declare module 'obsidian' {
  export class Plugin {}
  export class MarkdownView { editor: any; file: any }
  export class WorkspaceLeaf { containerEl: HTMLElement; view: any }
  export class ItemView { constructor(leaf: any) }
  export class Notice { constructor(message: string, timeout?: number) }
  export class Setting { constructor(containerEl: any) }
}

