# Obsidian GTD Plugin

GTD Assistant for Obsidian. Converts selected text into Tasks‑compatible actions using AWS Bedrock.

## Installation

- BRAT (recommended): Add repo `peerjakobsen/ObsidianGTD` and select “Use releases”.
- Manual: Download `manifest.json` and `main.js` from the latest release and place them in `<vault>/.obsidian/plugins/obsidian-gtd/`.

## Usage

- Configure AWS settings in Settings → GTD Assistant (Bearer Token, Region, Model ID).
- Select text and run “Clarify selected text (GTD)” from the Command Palette or use the ribbon icon.
- The plugin inserts Tasks‑compatible lines at the cursor.

## Development

- `npm install`
- Build: `npm run build`
- Dev: `npm run dev`
- Tests: `npm test`
- Lint: `npm run lint`
- Local deploy: configure `.env.local`, then `npm run build:deploy`

## Structure

```
plugin/
├── src/           # TypeScript source files
├── manifest.json  # Obsidian plugin manifest
├── package.json   # Node.js dependencies
└── README.md      # This file
```
