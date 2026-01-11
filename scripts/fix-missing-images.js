import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articlesDir = path.join(__dirname, '../src/content/articles');
const imagesDir = path.join(__dirname, '../public/images/articles');

// Map of article slugs to their Framer image URLs (scraped from site)
const articleImages = {
  'four-pages': 'https://framerusercontent.com/images/0WZH5bK2LTViC4R0E6dBzqN8Ss.png',
  'design-books': 'https://framerusercontent.com/images/1mW7Gna2qulRAlPVONOkCLpJZo.png',
  'combine-colors': 'https://framerusercontent.com/images/2HFYKJrMvWfFw1hSAWDJfWxhEUI.png',
  'podcast-design': 'https://framerusercontent.com/images/t08zj6RlRjaRhlTOPfyMgyGJpeE.jpg',
  'youtube-thumbnail-design': 'https://framerusercontent.com/images/nG5VTqPWP5NtTUYPjDqDsDbD88.png',
  'rule-of-thirds': 'https://framerusercontent.com/images/4acu3EgnL4JtGU8R5OWpBhyiok.png',
  'midjourney-visual-style': 'https://framerusercontent.com/images/x7wVLMqIxFb6wEX2b4NQMNJXCc.jpg',
  'find-your-visual-style': 'https://framerusercontent.com/images/0qpW5L89OL6qmrCuzqSByr41q9E.jpg',
  'free-offer': 'https://framerusercontent.com/images/MqfRqTAW4mguA3DmyoLdjdyv6KI.jpg',
  'personal-website': 'https://framerusercontent.com/images/VJYMqvXPaAHjwf3I3g54NF8GY.jpg',
  'digital-product-landing-page': 'https://framerusercontent.com/images/PNCKpYPB8wWCW87xxgPrXgURPfc.jpg',
  'buttons': 'https://framerusercontent.com/images/gDBgBeZPiwBEMj2KjE6gMBIEI.jpg',
  'best-youtube-fonts': 'https://framerusercontent.com/images/uzqLCAoZLOHcBhSgdYCeqOFiKzs.png',
  'newsletter-landing-page': 'https://framerusercontent.com/images/h5LNN7QAhJx4BQn6MmQgAlACKA.jpg',
  '1000-landing-page-offer': 'https://framerusercontent.com/images/rA1K9X1jM9RILFdKqHaqjIUYM.jpg',
  'create-a-simple-logo': 'https://framerusercontent.com/images/IRNtXsHr4ddEXTcMdPJFNNlsVRQ.jpg',
  'coming-soon-landing-page': 'https://framerusercontent.com/images/USXTjPJIQ4WqBVhAUj2arBMccI.jpg',
  'fresh-sheets': 'https://framerusercontent.com/images/nhtTbmITLkDDLlxLBQPhqJGHVi4.png',
  '20-design-tips-for-non-designers': 'https://framerusercontent.com/images/U0wCMd5h0Jba8mxjHD0ViMXYkM.jpg',
  'google-docs-design': 'https://framerusercontent.com/images/9d8mQU8FXuqCaVJxqm7LKHIfU.png',
  'rule-of-thirds-in-design': 'https://framerusercontent.com/images/HEilWL7NblPY3I1zCHBrxeWKMw.png',
  'what-makes-a-good-slide-deck': 'https://framerusercontent.com/images/DY99nXlDooMCQVhoHkhWgUqzGw.jpg',
  'slide-deck-design': 'https://framerusercontent.com/images/N0r7vNniNiyRqpMgRjmK8UILNM.jpg',
  '5-reasons-to-avoid-design': 'https://framerusercontent.com/images/s8lHkhq4CktxUuY9QAZVbII4w.jpg',
  'color-picking': 'https://framerusercontent.com/images/VJqHZlNBM5IfXcUw23RF3v04c.jpg',
  'visual-style': 'https://framerusercontent.com/images/uz7PlEwQIUSRFx5voTZLVrbBBg.jpg',
  'waitlist-landing-page': 'https://framerusercontent.com/images/sm6rVKEtto9XiBjSrCb3FJEkrg.jpg',
};

async function downloadImage(url, filename) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filename);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadImage(response.headers.location, filename).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filename, () => {});
      reject(err);
    });
  });
}

async function updateArticle(slug, imageUrl) {
  const mdPath = path.join(articlesDir, `${slug}.md`);
  if (!fs.existsSync(mdPath)) {
    console.log(`Article not found: ${slug}`);
    return;
  }

  // Download image
  const ext = path.extname(new URL(imageUrl).pathname);
  const imageFilename = path.basename(new URL(imageUrl).pathname);
  const localImagePath = path.join(imagesDir, `${imageFilename}.webp`);
  const webPath = `/images/articles/${imageFilename}.webp`;

  if (!fs.existsSync(localImagePath)) {
    console.log(`Downloading: ${imageFilename}`);
    const tempPath = path.join(imagesDir, imageFilename);
    await downloadImage(imageUrl, tempPath);
    // Rename to .webp (already webp from previous conversion)
    if (fs.existsSync(tempPath)) {
      fs.renameSync(tempPath, localImagePath);
    }
  }

  // Update markdown frontmatter
  let content = fs.readFileSync(mdPath, 'utf-8');
  if (content.includes('image:')) {
    console.log(`Already has image: ${slug}`);
    return;
  }

  // Add image field after description
  content = content.replace(
    /^(---\n[\s\S]*?description:.*?\n)/m,
    `$1image: "${webPath}"\n`
  );
  
  fs.writeFileSync(mdPath, content);
  console.log(`Updated: ${slug}`);
}

async function main() {
  for (const [slug, imageUrl] of Object.entries(articleImages)) {
    try {
      await updateArticle(slug, imageUrl);
    } catch (err) {
      console.error(`Error processing ${slug}:`, err.message);
    }
  }
  console.log('Done!');
}

main();
