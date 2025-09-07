# Obsidian GTD

A complete Getting Things Done (GTD) solution for Obsidian with AI-powered task processing via direct AWS Bedrock integration (no local server required).

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

## Components

### ☁️ Direct AWS Integration

The plugin communicates directly with AWS Bedrock using the AWS JavaScript SDK. No local FastAPI server is required.

**Benefits:**
- Simpler setup (no localhost server)
- Fewer moving parts and fewer failure points
- Same GTD functionality with improved reliability

### 🔌 Obsidian Plugin (`/plugin/`)

TypeScript-based Obsidian plugin that implements GTD workflows with AI assistance.

**Features:**
- GTD workflow integration
- Direct AWS Bedrock calls via SDK (bearer token)
- Privacy-conscious design (no third-party servers)
- Seamless Obsidian integration

**Development:**
```bash
cd plugin
npm install
npm run dev
```

## Development Workflow

This project uses [Agent OS](https://buildermethods.com/agent-os) for structured AI-assisted development:

1. **Planning**: Specifications in `.agent-os/specs/`
2. **Development**: Task-based implementation
3. **Testing**: Comprehensive test coverage
4. **Documentation**: Auto-generated project documentation

## Privacy & Security

- **Direct AWS**: The plugin communicates securely with AWS Bedrock over HTTPS
- **Bearer Token Authentication**: Uses AWS Bedrock bearer token (no IAM credentials stored)
- **No Third-Party Servers**: No localhost proxy or external services required
- **Open Source**: Full transparency of all code and processes

## Getting Started

1. **Configure the plugin**:
   - Open Obsidian → Settings → Community Plugins → GTD Assistant → Settings
   - Enter your AWS bearer token, model ID, and choose a region
   - Use “Test AWS connection” to verify endpoint reachability

2. **Install the plugin** (development):
   - Copy plugin folder to your Obsidian vault's `.obsidian/plugins/` directory
   - Enable the plugin in Obsidian settings

## Requirements

- **Plugin**: Node.js 16+, npm
- **AWS**: Bedrock API access and bearer token
- **Obsidian**: Version 0.15.0+

## Contributing

This project follows Agent OS development patterns. See `.agent-os/` directory for specifications and development guidelines.

## License

MIT License - see LICENSE file for details.
