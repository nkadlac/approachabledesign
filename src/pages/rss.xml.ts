import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const articles = await getCollection('articles');
  const sortedArticles = articles.sort((a, b) =>
    new Date(b.data.date).getTime() - new Date(a.data.date).getTime()
  );

  return rss({
    title: 'Approachable Design',
    description: 'Design tips, tutorials, and insights for non-designers and solopreneurs.',
    site: context.site ?? 'https://www.approachabledesign.co',
    items: sortedArticles.map((article) => ({
      title: article.data.title,
      pubDate: new Date(article.data.date),
      description: article.data.description,
      link: `/articles/${article.slug}/`,
    })),
    customData: `<language>en-us</language>`,
  });
}
