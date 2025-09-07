# Obsidian GTD Plugin

[![Obsidian 0.15+](https://img.shields.io/badge/Obsidian-0.15%2B-7C3AED)](#installation)
[![Node 16+](https://img.shields.io/badge/Node.js-16%2B-339933?logo=node.js&logoColor=white)](#development)
[![TypeScript 4.7](https://img.shields.io/badge/TypeScript-4.7-3178C6?logo=typescript&logoColor=white)](#development)
[![AWS Bedrock: Direct](https://img.shields.io/badge/AWS%20Bedrock-Direct-orange?logo=amazonaws&logoColor=white)](#installation)
[![Release](https://img.shields.io/github/v/release/peerjakobsen/ObsidianGTD?display_name=tag&sort=semver)](https://github.com/peerjakobsen/ObsidianGTD/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/peerjakobsen/ObsidianGTD#license)

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
