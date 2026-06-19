const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function processImage(originalPath, outputFileName) {
  let normalizedPath = originalPath.replace(/\\/g, '/');

  if (!path.isAbsolute(normalizedPath)) {
    normalizedPath = path.join(process.cwd(), '..', '..', normalizedPath);
  }

  const processedDir = path.join(
    process.cwd(),
    '..',
    '..',
    '..',
    'uploads',
    'processed',
  );
  const outputPath = path.join(processedDir, outputFileName);

  console.log('Обработка файла:', normalizedPath);
  console.log('Сохранение в:', outputPath);

  try {
    if (!fs.existsSync(processedDir)) {
      fs.mkdirSync(processedDir, { recursive: true });
    }

    if (!fs.existsSync(normalizedPath)) {
      throw new Error(`Файл не найден: ${normalizedPath}`);
    }

    const image = sharp(normalizedPath);
    const metadata = await image.metadata();

    let newWidth = metadata.width;
    let newHeight = metadata.height;

    if (newWidth > 800) {
      newHeight = Math.round((800 / newWidth) * newHeight);
      newWidth = 800;
    }
    if (newHeight > 600) {
      newWidth = Math.round((600 / newHeight) * newWidth);
      newHeight = 600;
    }

    const fontSize = Math.max(newWidth, newHeight) / 12;
    const watermarkSvg = Buffer.from(`
      <svg width="${newWidth}" height="${newHeight}" xmlns="http://www.w3.org/2000/svg">
        <style>
          .watermark {
            font-family: Arial, sans-serif;
            font-size: ${fontSize}px;
            fill: rgba(255, 255, 255, 0.25);
            stroke: rgba(0, 0, 0, 0.1);
            stroke-width: 1px;
          }
        </style>
        <text 
          x="${newWidth / 2}" 
          y="${newHeight / 2}" 
          text-anchor="middle"
          dominant-baseline="central"
          transform="rotate(-30, ${newWidth / 2}, ${newHeight / 2})"
          class="watermark"
        >EduPlatform</text>
      </svg>
    `);

    await image
      .resize(newWidth, newHeight, {
        fit: 'fill',
        withoutEnlargement: true,
      })
      .jpeg({ quality: 80 })
      .composite([
        {
          input: watermarkSvg,
          top: 0,
          left: 0,
          blend: 'over',
        },
      ])
      .toFile(outputPath);

    console.log(`Изображение обработано: ${outputFileName}`);
    return outputPath;
  } catch (error) {
    console.error(`Ошибка обработки изображения ${normalizedPath}:`, error);
    throw error;
  }
}

module.exports = { processImage };
