import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env.local
function loadEnvFile() {
  const envPath = join(__dirname, '.env.local');
  if (!existsSync(envPath)) {
    console.error('❌ .env.local file not found!');
    console.log('📝 Please copy .env.example to .env.local and configure your vault path');
    process.exit(1);
  }

  const envContent = readFileSync(envPath, 'utf8');
  const env = {};
  
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        env[key.trim()] = valueParts.join('=').trim().replace(/^"(.*)"$/, '$1');
      }
    }
  });

  return env;
}

function deploy() {
  try {
    const env = loadEnvFile();
    const vaultPath = env.OBSIDIAN_VAULT_PATH;
    const pluginId = env.PLUGIN_ID || 'obsidian-gtd';

    if (!vaultPath) {
      console.error('❌ OBSIDIAN_VAULT_PATH not configured in .env.local');
      process.exit(1);
    }

    const pluginDir = join(vaultPath, pluginId);
    
    // Create plugin directory if it doesn't exist
    if (!existsSync(pluginDir)) {
      mkdirSync(pluginDir, { recursive: true });
      console.log(`📁 Created plugin directory: ${pluginDir}`);
    }

    // Files to deploy
    const filesToDeploy = [
      { src: 'manifest.json', required: true },
      { src: 'main.js', required: true },
      { src: 'styles.css', required: false },
      { src: '.hotreload', required: false },
    ];

    console.log(`🚀 Deploying to: ${pluginDir}`);

    let deployedFiles = 0;
    for (const file of filesToDeploy) {
      const srcPath = join(__dirname, file.src);
      const destPath = join(pluginDir, file.src);

      if (existsSync(srcPath)) {
        copyFileSync(srcPath, destPath);
        console.log(`✅ Copied ${file.src}`);
        deployedFiles++;
      } else if (file.required) {
        console.error(`❌ Required file ${file.src} not found!`);
        console.log('💡 Run "npm run build" first to generate the files');
        process.exit(1);
      } else {
        console.log(`⏭️  Optional file ${file.src} not found, skipping`);
      }
    }

    console.log(`\n🎉 Successfully deployed ${deployedFiles} files!`);
    console.log(`📍 Plugin location: ${pluginDir}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Restart Obsidian or toggle the plugin off/on');
    console.log('   2. Or install "Hot Reload Plugin" for automatic reloading');

  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deploy();