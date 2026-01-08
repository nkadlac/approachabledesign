import fs from 'fs';
import path from 'path';
import https from 'https';
import sharp from 'sharp';

const IMAGES_DIR = './public/images/articles';
const ARTICLES_DIR = './src/content/articles';

// Ensure directories exist
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}
if (!fs.existsSync('./public/images/site')) {
  fs.mkdirSync('./public/images/site', { recursive: true });
}

// Download a file
function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    // Clean URL (remove query params for filename but keep for download)
    const cleanUrl = url.split('?')[0];

    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Follow redirect
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

// Optimize image with Sharp
async function optimizeImage(inputPath, outputPath) {
  try {
    const ext = path.extname(inputPath).toLowerCase();
    const image = sharp(inputPath);
    const metadata = await image.metadata();

    // Resize if too large (max 1600px width)
    let pipeline = image;
    if (metadata.width > 1600) {
      pipeline = pipeline.resize(1600, null, { withoutEnlargement: true });
    }

    // Convert to webp for better compression
    const webpPath = outputPath.replace(/\.(jpg|jpeg|png|gif)$/i, '.webp');
    await pipeline.webp({ quality: 82 }).toFile(webpPath);

    // Return the webp filename
    return path.basename(webpPath);
  } catch (err) {
    console.error(`  Error optimizing ${inputPath}: ${err.message}`);
    // If optimization fails, just copy the original
    fs.copyFileSync(inputPath, outputPath);
    return path.basename(outputPath);
  }
}

// Extract image ID from Framer URL
function getImageId(url) {
  const match = url.match(/\/images\/([^/?]+)/);
  return match ? match[1] : null;
}

// Main function
async function main() {
  console.log('=== Image Download & Optimization ===\n');

  // Read all unique Framer URLs from articles
  const urlSet = new Set();
  const articleFiles = fs.readdirSync(ARTICLES_DIR).filter(f => f.endsWith('.md'));

  for (const file of articleFiles) {
    const content = fs.readFileSync(path.join(ARTICLES_DIR, file), 'utf-8');
    const matches = content.matchAll(/https:\/\/framerusercontent\.com\/images\/[^")\s]+/g);
    for (const match of matches) {
      // Clean the URL
      let url = match[0].replace(/\).*$/, '').replace(/["\s].*$/, '');
      urlSet.add(url);
    }
  }

  // Add site images (logos, profile, etc.)
  const siteImages = [
    'https://framerusercontent.com/images/x3mPS06W2WlJckFnxps0NWqYsMY.png', // Nate profile
    'https://framerusercontent.com/images/zmZt8Rn0GcalCsHeGMyhM2rpc.jpg', // Paul Millerd
    'https://framerusercontent.com/images/EFBJrXTsYMrwJyLVo1Cg6o4ZQPc.png', // Testimonial
    'https://framerusercontent.com/images/Qjm18ixiOhmj4KVqtZBJARY8.jpg', // Newsletter
    'https://framerusercontent.com/images/OsnCgY7jRhtiCQ51mJDX0j5Lo.jpg', // YouTube Masterclass
    'https://framerusercontent.com/images/mvMNcxqzprJyzAQbJ9eEUVsuOJ8.jpg', // Slide Decks
    'https://framerusercontent.com/images/WL3ErEYPYgC5BjpmGOVmIqliMO0.jpg', // Design Vault
    'https://framerusercontent.com/images/1rZAUWsoPRm6FDzsZCr0doBJHU.png', // Creator Design Kit
  ];

  const urls = [...urlSet];
  console.log(`Found ${urls.length} article images + ${siteImages.length} site images\n`);

  // Create mapping of old URL to new path
  const urlMapping = {};
  let downloaded = 0;
  let failed = 0;

  // Download article images
  console.log('Downloading article images...');
  for (const url of urls) {
    const imageId = getImageId(url);
    if (!imageId) {
      console.log(`  Skipping invalid URL: ${url}`);
      continue;
    }

    // Determine extension from URL
    let ext = path.extname(imageId.split('?')[0]) || '.jpg';
    if (!ext.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      ext = '.jpg';
    }

    const tempFile = path.join(IMAGES_DIR, `temp_${imageId}${ext}`);
    const finalFile = path.join(IMAGES_DIR, `${imageId}${ext}`);

    try {
      // Download
      await downloadFile(url, tempFile);

      // Optimize
      const optimizedName = await optimizeImage(tempFile, finalFile);

      // Clean up temp file
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }

      // Store mapping
      urlMapping[url] = `/images/articles/${optimizedName}`;
      downloaded++;

      if (downloaded % 20 === 0) {
        console.log(`  Downloaded ${downloaded}/${urls.length}...`);
      }
    } catch (err) {
      console.log(`  Failed: ${imageId} - ${err.message}`);
      failed++;
    }
  }

  // Download site images
  console.log('\nDownloading site images...');
  for (const url of siteImages) {
    const imageId = getImageId(url);
    if (!imageId) continue;

    let ext = path.extname(imageId.split('?')[0]) || '.jpg';
    if (!ext.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      ext = '.jpg';
    }

    const tempFile = path.join('./public/images/site', `temp_${imageId}${ext}`);
    const finalFile = path.join('./public/images/site', `${imageId}${ext}`);

    try {
      await downloadFile(url, tempFile);
      const optimizedName = await optimizeImage(tempFile, finalFile);
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
      urlMapping[url] = `/images/site/${optimizedName}`;
      console.log(`  Downloaded: ${optimizedName}`);
    } catch (err) {
      console.log(`  Failed: ${imageId} - ${err.message}`);
    }
  }

  console.log(`\nDownloaded: ${downloaded}, Failed: ${failed}`);

  // Update markdown files
  console.log('\nUpdating article references...');
  let updatedFiles = 0;

  for (const file of articleFiles) {
    const filePath = path.join(ARTICLES_DIR, file);
    let content = fs.readFileSync(filePath, 'utf-8');
    let modified = false;

    for (const [oldUrl, newPath] of Object.entries(urlMapping)) {
      if (content.includes(oldUrl)) {
        // Also match URLs with query params
        const escapedUrl = oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedUrl + '[^)"\\s]*', 'g');
        content = content.replace(regex, newPath);
        modified = true;
      }
    }

    if (modified) {
      fs.writeFileSync(filePath, content);
      updatedFiles++;
    }
  }

  console.log(`Updated ${updatedFiles} article files.`);

  // Save mapping for reference
  fs.writeFileSync('./scripts/image-mapping.json', JSON.stringify(urlMapping, null, 2));
  console.log('\nSaved image mapping to scripts/image-mapping.json');

  console.log('\n=== Complete! ===');
}

main().catch(console.error);
