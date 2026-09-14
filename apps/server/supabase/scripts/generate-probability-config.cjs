const { createHash } = require('node:crypto');
const { readFile, writeFile } = require('node:fs/promises');
const { join } = require('node:path');

const serverRoot = join(__dirname, '..', '..');
const repositoryRoot = join(serverRoot, '..', '..');
const serverOutputPath = join(
  serverRoot,
  'supabase',
  'functions',
  '_shared',
  'probability-config.generated.ts',
);
const appOutputPath = join(
  repositoryRoot,
  'src',
  'features',
  'game-cache',
  'probabilityConfig.generated.ts',
);

async function readJson(filename) {
  return JSON.parse(
    await readFile(join(repositoryRoot, 'assets', 'config', filename), 'utf8'),
  );
}

async function generate() {
  const cardDrawConfig = await readJson('card-draw-rates.json');
  const enhancementConfig = await readJson('enhancement-rates.json');
  const version = cardDrawConfig.version;
  if (typeof version !== 'string' || version.length === 0) {
    throw new Error('card-draw-rates.json version is required.');
  }
  const canonicalConfig = JSON.stringify({
    cardDrawConfig,
    enhancementConfig,
  });
  const hash = createHash('sha256').update(canonicalConfig).digest('hex');
  const serverSource = [
    '// Generated from assets/config. Do not edit directly.',
    '// biome-ignore format: Preserve the generated JSON string.',
    `export const PROBABILITY_CONFIG_VERSION = ${JSON.stringify(version)} as const;`,
    '// biome-ignore format: Preserve the generated JSON string.',
    `export const PROBABILITY_CONFIG_HASH = ${JSON.stringify(hash)} as const;`,
    '// biome-ignore format: Keep generated values identical to source JSON.',
    `export const CARD_DRAW_CONFIG = ${JSON.stringify(cardDrawConfig, null, 2)} as const;`,
    '// biome-ignore format: Keep generated values identical to source JSON.',
    `export const ENHANCEMENT_CONFIG = ${JSON.stringify(enhancementConfig, null, 2)} as const;`,
    '',
  ].join('\n');
  const appSource = [
    '// Generated from assets/config. Do not edit directly.',
    '// biome-ignore format: Preserve the generated JSON string.',
    `export const PROBABILITY_CONFIG_VERSION = ${JSON.stringify(version)} as const;`,
    '// biome-ignore format: Preserve the generated JSON string.',
    `export const PROBABILITY_CONFIG_HASH = ${JSON.stringify(hash)} as const;`,
    '',
  ].join('\n');

  await Promise.all([
    writeFile(serverOutputPath, serverSource, 'utf8'),
    writeFile(appOutputPath, appSource, 'utf8'),
  ]);
  process.stdout.write('Generated app and Supabase probability config from JSON.\n');
}

generate().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`Failed to generate Supabase probability config: ${message}\n`);
  process.exitCode = 1;
});
