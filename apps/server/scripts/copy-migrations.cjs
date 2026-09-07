const { copyFile, mkdir, readdir, rm, stat } = require('node:fs/promises');
const { join } = require('node:path');

const serverRoot = join(__dirname, '..');
const sourceDirectory = join(serverRoot, 'migrations');
const targetDirectory = join(serverRoot, 'dist', 'migrations');
const migrationFilename = /^\d+_[a-z0-9_]+\.sql$/i;

async function copyMigrations() {
  const filenames = (await readdir(sourceDirectory))
    .filter((filename) => migrationFilename.test(filename))
    .sort((left, right) => left.localeCompare(right));

  if (filenames.length === 0) {
    throw new Error('No SQL migration files were found.');
  }

  await rm(targetDirectory, { recursive: true, force: true });
  await mkdir(targetDirectory, { recursive: true });

  for (const filename of filenames) {
    const source = join(sourceDirectory, filename);
    if ((await stat(source)).size === 0) {
      throw new Error(`Migration file is empty: ${filename}`);
    }
    await copyFile(source, join(targetDirectory, filename));
  }

  process.stdout.write(`Copied ${filenames.length} migration file(s) to dist/migrations.\n`);
}

copyMigrations().catch((error) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  process.stderr.write(`Failed to copy migrations: ${message}\n`);
  process.exitCode = 1;
});
