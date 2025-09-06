# Obsidian GTD

A complete Getting Things Done (GTD) solution for Obsidian with AI-powered task processing via a local FastAPI backend.

## Project Structure

```
ObsidianGTD/
├── server/                  # FastAPI backend service
│   ├── main.py             # FastAPI application entry point
│   ├── config.py           # Environment configuration
│   ├── models.py           # Pydantic data models
│   ├── bedrock_client.py   # AWS Bedrock integration
│   ├── .env.example        # Environment variables template
│   ├── pyproject.toml      # Python dependencies (UV)
│   ├── uv.lock             # Lock file for dependencies
│   └── README.md           # Server-specific documentation
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

### 🖥️ FastAPI Server (`/server/`)

A privacy-focused local backend that provides AI-powered task processing using AWS Bedrock API keys.

**Features:**
- Local-only deployment (localhost)
- AWS Bedrock integration with API key authentication
- CORS support for Obsidian plugin communication
- Structured logging and error handling
- Environment-based configuration

**Quick Start:**
```bash
cd server
cp .env.example .env
# Edit .env with your Bedrock API key
uv sync
uv run python main.py
```

### 🔌 Obsidian Plugin (`/plugin/`)

TypeScript-based Obsidian plugin that implements GTD workflows with AI assistance.

**Features (Planned):**
- GTD workflow integration
- Communication with local FastAPI server
- Privacy-focused local AI processing
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

- **Local Processing**: All AI processing happens locally via your FastAPI server
- **API Key Authentication**: Uses AWS Bedrock API keys (no IAM credentials stored)
- **No External Data Sharing**: Your notes and tasks never leave your machine
- **Open Source**: Full transparency of all code and processes

## Getting Started

1. **Set up the server**:
   ```bash
   cd server
   cp .env.example .env
   # Add your AWS Bedrock API key to .env
   uv sync
   uv run python main.py
   ```

2. **Install the plugin** (future):
   - Copy plugin folder to your Obsidian vault's `.obsidian/plugins/` directory
   - Enable the plugin in Obsidian settings

## Requirements

- **Server**: Python 3.12+, UV package manager
- **Plugin**: Node.js 16+, npm
- **AWS**: Bedrock API access and API key
- **Obsidian**: Version 0.15.0+

## Contributing

This project follows Agent OS development patterns. See `.agent-os/` directory for specifications and development guidelines.

## License

MIT License - see LICENSE file for details.