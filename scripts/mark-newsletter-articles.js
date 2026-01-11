import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const articlesDir = path.join(__dirname, '../src/content/articles');

// Newsletter articles have "Give me X minutes" pattern
const files = fs.readdirSync(articlesDir).filter(f => f.endsWith('.md'));

for (const file of files) {
  const filepath = path.join(articlesDir, file);
  let content = fs.readFileSync(filepath, 'utf-8');
  
  // Check if it's a newsletter article
  const isNewsletter = content.includes('Give me') && content.includes('minutes');
  
  if (isNewsletter) {
    // Add type: newsletter after date line
    if (!content.includes('type:')) {
      content = content.replace(
        /^(---\n[\s\S]*?date:.*?\n)/m,
        `$1type: newsletter\n`
      );
      fs.writeFileSync(filepath, content);
      console.log(`Marked as newsletter: ${file}`);
    }
  }
}

console.log('Done!');
