const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(
  root,
  'src',
  'features',
  'forge',
  'forgeImageData.generated.ts',
);

const toDataUri = async (relativePath, width, height) => {
  const imagePath = path.join(root, relativePath);
  const image = await sharp(imagePath)
    .trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .resize(width, height, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      withoutEnlargement: true,
    })
    .png({ compressionLevel: 9 })
    .toBuffer();
  return `data:image/png;base64,${image.toString('base64')}`;
};

const generate = async () => {
  const hammer = await toDataUri(
    'assets/images/forge/forging-hammer-2_5d.png',
    420,
    420,
  );
  const anvil = await toDataUri(
    'assets/images/forge/forging-anvil-2_5d.png',
    560,
    360,
  );

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(
    outputPath,
    `// 로컬 AIT 이미지 호환성 확인용 자동 생성 파일입니다.\n` +
      `export const FORGE_HAMMER_DATA_URI = ${JSON.stringify(hammer)};\n` +
      `export const FORGE_ANVIL_DATA_URI = ${JSON.stringify(anvil)};\n`,
  );

  console.log(`Generated ${path.relative(root, outputPath)}`);
};

generate().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
