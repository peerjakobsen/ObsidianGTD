# Obsidian GTD

Obsidian 0.15+ • TypeScript/Node 16+ • AWS Bedrock (Direct) • License: MIT • Latest: v1.0.0

AI‑powered Getting Things Done (GTD) for Obsidian. Converts inbox text into Tasks‑compatible actions using direct AWS Bedrock integration (no local server required).

## Project Structure

```
ObsidianGTD/
├── plugin/                  # Obsidian plugin (TypeScript)
│   ├── src/                # TypeScript source files
│   ├── manifest.json       # Obsidian plugin manifest
│   ├── package.json        # Node.js dependencies
│   └── README.md           # Plugin-specific documentation
├── .agent-os/              # Agent OS development configuration
├── .gitignore              # Git ignore patterns
└── README.md               # This file
```

## Installation

- BRAT (recommended)
  - In Obsidian, enable Community plugins and install “BRAT”.
  - BRAT → Add beta plugin → repo: `peerjakobsen/ObsidianGTD`.
  - Choose “Use releases” so updates come from GitHub releases.
- Manual
  - Download `manifest.json` and `main.js` from the latest GitHub release.
  - Create folder: `<your vault>/.obsidian/plugins/obsidian-gtd/`.
  - Place both files in that folder and restart Obsidian.
- Local Deploy (developers)
  - Set `plugin/.env.local` to your vault’s plugin path and id.
  - Run: `cd plugin && npm run build:deploy`.

## Usage

- Configure
  - Settings → Community Plugins → GTD Assistant → Settings.
  - Set: AWS Bearer Token, Region, Model ID (e.g., `us.anthropic.claude-sonnet-4-20250514-v1:0`).
  - Use “Test AWS connection” to verify.
- Clarify Text
  - Select text in a note → Command Palette: “Clarify selected text (GTD)”, or use the ribbon icon.
  - The plugin inserts Tasks‑compatible lines (with contexts, time estimates, and optional dates/projects) at the cursor.
- Notes
  - Works without external servers; all calls go directly to AWS over HTTPS.
  - Keep your bearer token private; rotate regularly per your security policy.

## Components

### ☁️ Direct AWS Integration

The plugin communicates directly with AWS Bedrock using the AWS JavaScript SDK. No local FastAPI server is required.

**Benefits:**
- Simpler setup (no localhost server)
- Fewer moving parts and fewer failure points
- Same GTD functionality with improved reliability

### 🔌 Obsidian Plugin (`/plugin/`)

TypeScript-based Obsidian plugin that implements GTD workflows with AI assistance.

- GTD workflow integration
- Direct AWS Bedrock calls via SDK (bearer token)
- Privacy‑conscious design (no third‑party servers)
- Seamless Obsidian integration

## Development Workflow

This project uses [Agent OS](https://buildermethods.com/agent-os) for structured AI-assisted development:

1. **Planning**: Specifications in `.agent-os/specs/`
2. **Development**: Task-based implementation
3. **Testing**: Comprehensive test coverage
4. **Documentation**: Auto-generated project documentation

## Requirements

- Obsidian 0.15.0+
- Node.js 16+ (developers)
- AWS Bedrock access and bearer token

## Privacy & Security

- **Direct AWS**: The plugin communicates securely with AWS Bedrock over HTTPS
- **Bearer Token Authentication**: Uses AWS Bedrock bearer token (no IAM credentials stored)
- **No Third-Party Servers**: No localhost proxy or external services required
- **Open Source**: Full transparency of all code and processes

## Troubleshooting

- Connection fails
  - Verify Region and Model ID; try “Test AWS connection”.
  - Ensure your bearer token is valid and not expired; avoid stray spaces.
  - Corporate networks may require proxy exceptions for `bedrock-runtime.<region>.amazonaws.com`.
- No tasks produced
  - Try a smaller selection; ensure the text contains actionable content.
  - Check the Console for warnings (View → Toggle Developer Tools).

## Development

- Setup
  - `cd plugin && npm install`
  - Build: `npm run build`
  - Dev bundle: `npm run dev`
  - Tests: `npm test` (coverage: `npm test -- --coverage`)
  - Lint: `npm run lint` (auto-fix: `npm run lint:fix`)
- Local deploy to a vault
  - Edit `plugin/.env.local` (see `.env.example`).
  - `npm run build:deploy` and then reload the plugin in Obsidian.
- Release (maintainers)
  - Update version in `plugin/package.json`, then run `npm run version` in `plugin/` to sync `manifest.json` and `versions.json`.
  - Commit and tag `vX.Y.Z`, push, then create a GitHub release attaching `plugin/manifest.json` and `plugin/main.js`.

## License

MIT License - see LICENSE file for details.
