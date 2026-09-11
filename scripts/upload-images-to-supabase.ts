/**
 * assets/images -> Supabase Storage 동기화
 *
 * PowerShell:
 *   $env:SUPABASE_SECRET_KEY="sb_secret_..."
 *   npm run storage:sync
 *
 * 실제 업로드 없이 변경 대상만 확인:
 *   npm run storage:sync -- --dry-run
 */
const { createHash } = require('node:crypto');
const { readdir, readFile, stat } = require('node:fs/promises');
const path = require('node:path');

const DEFAULT_SUPABASE_URL = 'https://nmbdwukrvwfaxpasbppj.supabase.co';
const DEFAULT_BUCKET = 'images';
const DEFAULT_ASSETS_DIR = path.resolve(process.cwd(), 'assets/images');
const PAGE_SIZE = 1000;

const supabaseUrl = (process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL).replace(/\/$/, '');
const secretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucket = process.env.SUPABASE_STORAGE_BUCKET || DEFAULT_BUCKET;
const assetsDir = path.resolve(
  process.env.SUPABASE_ASSETS_DIR || DEFAULT_ASSETS_DIR,
);
const dryRun = process.argv.includes('--dry-run');

if (!secretKey) {
  console.error(
    'SUPABASE_SECRET_KEY 또는 SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.',
  );
  process.exit(1);
}

function encodeStoragePath(storagePath) {
  return storagePath.split('/').map(encodeURIComponent).join('/');
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.jpeg': 'image/jpeg',
    '.jpg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
  };

  return contentTypes[extension] || 'application/octet-stream';
}

function getAuthHeaders() {
  return {
    apikey: secretKey,
    Authorization: `Bearer ${secretKey}`,
  };
}

async function collectLocalFiles(directory, root = directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectLocalFiles(absolutePath, root)));
      continue;
    }

    if (!entry.isFile()) continue;

    const storagePath = path.relative(root, absolutePath).split(path.sep).join('/');
    const fileStat = await stat(absolutePath);
    files.push({ absolutePath, storagePath, size: fileStat.size });
  }

  return files.sort((left, right) =>
    left.storagePath.localeCompare(right.storagePath),
  );
}

async function listRemoteDirectory(prefix) {
  const objects = [];
  let offset = 0;

  while (true) {
    const response = await fetch(
      `${supabaseUrl}/storage/v1/object/list/${encodeURIComponent(bucket)}`,
      {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prefix,
          limit: PAGE_SIZE,
          offset,
          sortBy: { column: 'name', order: 'asc' },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Supabase 목록 조회 실패 (${response.status}): ${await response.text()}`,
      );
    }

    const page = await response.json();
    objects.push(...page);

    if (page.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  return objects;
}

async function collectRemoteFiles(localFiles) {
  const directories = new Set(
    localFiles.map((file) => path.posix.dirname(file.storagePath)),
  );
  const remoteFiles = new Map();

  for (const directory of [...directories].sort()) {
    const prefix = directory === '.' ? '' : directory;
    const objects = await listRemoteDirectory(prefix);

    for (const object of objects) {
      if (!object.id || !object.metadata) continue;

      const storagePath = prefix ? `${prefix}/${object.name}` : object.name;
      remoteFiles.set(storagePath, object);
    }
  }

  return remoteFiles;
}

function normalizeEtag(value) {
  if (typeof value !== 'string') return null;
  return value.replace(/^W\//, '').replaceAll('"', '').toLowerCase();
}

async function isSameFile(localFile, remoteFile) {
  if (!remoteFile?.metadata) return false;

  const remoteSize = Number(
    remoteFile.metadata.size ?? remoteFile.metadata.contentLength,
  );
  if (!Number.isFinite(remoteSize) || remoteSize !== localFile.size) return false;

  const remoteEtag = normalizeEtag(
    remoteFile.metadata.eTag ?? remoteFile.metadata.etag,
  );
  if (!remoteEtag || !/^[a-f0-9]{32}$/.test(remoteEtag)) return true;

  const fileBuffer = await readFile(localFile.absolutePath);
  const localMd5 = createHash('md5').update(fileBuffer).digest('hex');
  return localMd5 === remoteEtag;
}

async function uploadFile(localFile, existsRemotely) {
  const action = existsRemotely ? 'UPDATE' : 'UPLOAD';
  if (dryRun) {
    console.log(`[DRY-RUN] ${action} ${localFile.storagePath}`);
    return;
  }

  const fileBuffer = await readFile(localFile.absolutePath);
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(localFile.storagePath)}`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': getContentType(localFile.absolutePath),
        'Cache-Control': '3600',
        'x-upsert': 'true',
      },
      body: fileBuffer,
    },
  );

  if (!response.ok) {
    throw new Error(
      `${localFile.storagePath} 업로드 실패 (${response.status}): ${await response.text()}`,
    );
  }

  console.log(`[${action}] ${localFile.storagePath}`);
}

async function main() {
  const localFiles = await collectLocalFiles(assetsDir);
  const remoteFiles = await collectRemoteFiles(localFiles);
  const summary = { uploaded: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(`로컬 이미지: ${localFiles.length}개`);
  console.log(`대상 버킷: ${bucket}`);
  if (dryRun) console.log('DRY-RUN: 실제 업로드는 하지 않습니다.');

  for (const localFile of localFiles) {
    const remoteFile = remoteFiles.get(localFile.storagePath);

    try {
      if (await isSameFile(localFile, remoteFile)) {
        summary.skipped += 1;
        console.log(`[SKIP] ${localFile.storagePath}`);
        continue;
      }

      await uploadFile(localFile, Boolean(remoteFile));
      if (remoteFile) summary.updated += 1;
      else summary.uploaded += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(
        `[ERROR] ${localFile.storagePath}:`,
        error instanceof Error ? error.message : error,
      );
    }
  }

  console.log(
    `완료 - 신규 ${summary.uploaded}, 변경 ${summary.updated}, 중복 건너뜀 ${summary.skipped}, 실패 ${summary.failed}`,
  );
  console.log('원격 파일 삭제는 수행하지 않았습니다.');

  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
