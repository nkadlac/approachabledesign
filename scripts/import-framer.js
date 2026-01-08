import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Paths
const BLOG_CSV = '/Users/natekadlac/Downloads/Blog.csv';
const NEWSLETTER_CSV = '/Users/natekadlac/Downloads/Newsletter.csv';
const PRODUCTS_CSV = '/Users/natekadlac/Downloads/Products.csv';
const ARTICLES_DIR = './src/content/articles';

// Helper to convert HTML to Markdown (basic conversion)
function htmlToMarkdown(html) {
  if (!html) return '';

  return html
    // Headers
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    // Bold and italic
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    // Links
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    // Images
    .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)')
    .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)')
    // Lists
    .replace(/<ul[^>]*>/gi, '\n')
    .replace(/<\/ul>/gi, '\n')
    .replace(/<ol[^>]*>/gi, '\n')
    .replace(/<\/ol>/gi, '\n')
    .replace(/<li[^>]*><p>(.*?)<\/p><\/li>/gi, '- $1\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    // Paragraphs and breaks
    .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    // Blockquotes
    .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n\n')
    // Remove remaining tags
    .replace(/<[^>]+>/g, '')
    // Clean up entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    // Clean up extra whitespace
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// Determine category from content/title
function guessCategory(title, content) {
  const text = (title + ' ' + content).toLowerCase();
  if (text.includes('youtube') || text.includes('thumbnail')) return 'youtube-design';
  if (text.includes('brand') || text.includes('logo')) return 'branding';
  if (text.includes('ai') || text.includes('midjourney')) return 'ai';
  return 'design';
}

// Parse date from ISO string
function parseDate(dateStr) {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const date = new Date(dateStr);
  return date.toISOString().split('T')[0];
}

// Import blog articles
async function importBlog() {
  console.log('Importing blog articles...');

  const content = fs.readFileSync(BLOG_CSV, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  // Ensure articles directory exists
  if (!fs.existsSync(ARTICLES_DIR)) {
    fs.mkdirSync(ARTICLES_DIR, { recursive: true });
  }

  let count = 0;
  for (const record of records) {
    if (record.Draft === 'true') continue;

    const slug = record.Slug;
    const title = record.Title;
    const date = parseDate(record.Date);
    const image = record.Image || '';
    const htmlContent = record.Content || '';
    const category = guessCategory(title, htmlContent);

    // Convert HTML to Markdown
    const markdownContent = htmlToMarkdown(htmlContent);

    // Extract first paragraph as description
    const firstPara = markdownContent.split('\n\n')[0]?.replace(/[*#\[\]]/g, '').slice(0, 200) || title;

    // Create frontmatter
    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
category: ${category}
description: "${firstPara.replace(/"/g, '\\"').replace(/\n/g, ' ').trim()}"
${image ? `image: "${image}"` : ''}
---`;

    const fileContent = `${frontmatter}\n\n${markdownContent}`;
    const filePath = path.join(ARTICLES_DIR, `${slug}.md`);

    fs.writeFileSync(filePath, fileContent);
    count++;
    console.log(`  Created: ${slug}.md`);
  }

  console.log(`Imported ${count} blog articles.\n`);
}

// Import newsletter issues (as articles with newsletter category)
async function importNewsletter() {
  console.log('Importing newsletter issues...');

  const content = fs.readFileSync(NEWSLETTER_CSV, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  let count = 0;
  for (const record of records) {
    if (record.Draft === 'true') continue;

    const slug = record.Slug;
    const title = record.Title;
    const date = parseDate(record.Date);
    const image = record.Image || '';
    const htmlContent = record.Content || '';

    // Convert HTML to Markdown
    const markdownContent = htmlToMarkdown(htmlContent);

    // Extract first paragraph as description
    const firstPara = markdownContent.split('\n\n')[0]?.replace(/[*#\[\]]/g, '').slice(0, 200) || title;

    // Create frontmatter - using 'personal' category for newsletters
    const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
date: ${date}
category: personal
description: "${firstPara.replace(/"/g, '\\"').replace(/\n/g, ' ').trim()}"
${image ? `image: "${image}"` : ''}
---`;

    const fileContent = `${frontmatter}\n\n${markdownContent}`;
    const filePath = path.join(ARTICLES_DIR, `${slug}.md`);

    fs.writeFileSync(filePath, fileContent);
    count++;
    console.log(`  Created: ${slug}.md`);
  }

  console.log(`Imported ${count} newsletter issues.\n`);
}

// Parse products for reference
async function parseProducts() {
  console.log('Parsing products...');

  const content = fs.readFileSync(PRODUCTS_CSV, 'utf-8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  console.log('\nProducts found:');
  for (const record of records) {
    console.log(`  - ${record.Title} (${record.Type})`);
    console.log(`    Link: ${record.Link}`);
    console.log(`    Image: ${record.Image}`);
  }
  console.log('');

  return records;
}

// Main
async function main() {
  console.log('=== Framer CMS Import ===\n');

  try {
    await importNewsletter();
    await importBlog();
    await parseProducts();
    console.log('Import complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();
