import { defineCollection, z } from 'astro:content';

const articles = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(['blog', 'newsletter']).default('blog'),
    category: z.enum(['design', 'branding', 'youtube-design', 'ai', 'personal']).optional(),
    description: z.string(),
    image: z.string().optional(),
    featured: z.boolean().optional(),
  }),
});

export const collections = { articles };
