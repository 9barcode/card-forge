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
const sharp = require('sharp');

const DEFAULT_SUPABASE_URL = 'https://nmbdwukrvwfaxpasbppj.supabase.co';
const DEFAULT_BUCKET = 'images';
const DEFAULT_ASSETS_DIR = path.resolve(process.cwd(), 'assets/images');
const PAGE_SIZE = 1000;
const CARD_WEBP_WIDTH = 512;
const CARD_WEBP_HEIGHT = 720;
const CARD_WEBP_QUALITY = 78;
const CARD_IMAGE_CACHE_VERSION = '3';
const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

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

async function createCardWebpFiles(localFiles) {
  const webpFiles = [];

  for (const file of localFiles) {
    if (
      !file.storagePath.startsWith('cards/') ||
      file.storagePath.startsWith('cards/webp/') ||
      !/\.(avif|jpe?g|png|webp)$/i.test(file.storagePath)
    ) {
      continue;
    }

    const relativePath = file.storagePath.slice('cards/'.length);
    const webpPath = `cards/webp/${relativePath.replace(/\.[^.]+$/, '.webp')}`;
    const sourceBuffer = await readFile(file.absolutePath);
    const buffer = await sharp(sourceBuffer)
      .resize(CARD_WEBP_WIDTH, CARD_WEBP_HEIGHT, {
        fit: 'cover',
        position: 'centre',
      })
      .webp({ quality: CARD_WEBP_QUALITY })
      .toBuffer();

    webpFiles.push({
      absolutePath: null,
      buffer,
      storagePath: webpPath,
      size: buffer.length,
    });
  }

  return webpFiles;
}

async function getFileBuffer(localFile) {
  return localFile.buffer ?? readFile(localFile.absolutePath);
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

  const remoteCacheControl = String(
    remoteFile.metadata.cacheControl ?? remoteFile.metadata.cache_control ?? '',
  );
  if (!remoteCacheControl.includes('31536000')) return false;

  const remoteSize = Number(
    remoteFile.metadata.size ?? remoteFile.metadata.contentLength,
  );
  if (!Number.isFinite(remoteSize) || remoteSize !== localFile.size) return false;

  const remoteEtag = normalizeEtag(
    remoteFile.metadata.eTag ?? remoteFile.metadata.etag,
  );
  if (!remoteEtag || !/^[a-f0-9]{32}$/.test(remoteEtag)) return true;

  const fileBuffer = await getFileBuffer(localFile);
  const localMd5 = createHash('md5').update(fileBuffer).digest('hex');
  return localMd5 === remoteEtag;
}

async function uploadFile(localFile, existsRemotely) {
  const action = existsRemotely ? 'UPDATE' : 'UPLOAD';
  if (dryRun) {
    console.log(`[DRY-RUN] ${action} ${localFile.storagePath}`);
    return;
  }

  const fileBuffer = await getFileBuffer(localFile);
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent(bucket)}/${encodeStoragePath(localFile.storagePath)}`,
    {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        'Content-Type': getContentType(localFile.storagePath),
        'Cache-Control': IMMUTABLE_CACHE_CONTROL,
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

async function updateCardImageUrls(cardWebpFiles) {
  const webpPaths = new Set(cardWebpFiles.map((file) => file.storagePath));
  const response = await fetch(`${supabaseUrl}/rest/v1/cards?select=id,image_path`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(
      `카드 DB 조회 실패 (${response.status}): ${await response.text()}`,
    );
  }

  const cards = await response.json();
  if (cards.length !== 36) {
    throw new Error(`카드 DB는 36행이어야 합니다. 현재 ${cards.length}행입니다.`);
  }

  for (const card of cards) {
    const currentPath = String(card.image_path || '');
    const cardsMarker = '/cards/';
    const markerIndex = currentPath.indexOf(cardsMarker);
    const relativePath =
      markerIndex >= 0
        ? currentPath.slice(markerIndex + cardsMarker.length).split('?')[0]
        : currentPath.replace(/^\/+/, '').replace(/^cards\//, '').split('?')[0];
    const sourceRelativePath = relativePath.replace(/^webp\//, '');
    const webpPath = `cards/webp/${sourceRelativePath.replace(/\.[^.]+$/, '.webp')}`;

    if (!webpPaths.has(webpPath)) {
      throw new Error(`생성된 WebP가 없는 카드입니다: ${currentPath}`);
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${encodeURIComponent(bucket)}/${encodeStoragePath(webpPath)}?v=${CARD_IMAGE_CACHE_VERSION}`;
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/cards?id=eq.${encodeURIComponent(card.id)}`,
      {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({ image_path: publicUrl }),
      },
    );

    if (!updateResponse.ok) {
      throw new Error(
        `카드 ${card.id} URL 변경 실패 (${updateResponse.status}): ${await updateResponse.text()}`,
      );
    }
  }

  console.log('카드 DB image_path 36개를 WebP 공개 URL로 변경했습니다.');
}

async function main() {
  const sourceFiles = await collectLocalFiles(assetsDir);
  const cardWebpFiles = await createCardWebpFiles(sourceFiles);
  const localFiles = [...sourceFiles, ...cardWebpFiles].sort((left, right) =>
    left.storagePath.localeCompare(right.storagePath),
  );
  const remoteFiles = await collectRemoteFiles(localFiles);
  const summary = { uploaded: 0, updated: 0, skipped: 0, failed: 0 };

  console.log(
    `로컬 이미지: ${sourceFiles.length}개 / 생성한 카드 WebP: ${cardWebpFiles.length}개`,
  );
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

  if (summary.failed === 0 && !dryRun) {
    await updateCardImageUrls(cardWebpFiles);
  } else if (dryRun) {
    console.log('[DRY-RUN] 카드 DB URL은 변경하지 않았습니다.');
  }

  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

// 사용 방법 (PowerShell)
// $env:SUPABASE_SECRET_KEY="sb_secret_실제키"
// npm run storage:sync
