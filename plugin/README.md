# Obsidian GTD Plugin

Obsidian plugin for Getting Things Done (GTD) workflow with AI assistance.

## Features (Planned)

- AI-powered task processing via direct AWS Bedrock integration (no local server)
- GTD workflow integration
- Privacy-focused local processing

## Development

This plugin communicates directly with AWS Bedrock via the AWS JavaScript SDK, eliminating the need for a local FastAPI server.

## Structure

```
plugin/
├── src/           # TypeScript source files
├── manifest.json  # Obsidian plugin manifest
├── package.json   # Node.js dependencies
└── README.md      # This file
```
