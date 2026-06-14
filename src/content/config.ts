import { z, defineCollection } from 'astro:content';

const productsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string(),
    code: z.string(),
    category: z.enum(['floor-tiles', 'wall-tiles']),
    image: z.string(),
    sceneImage: z.string().optional(),
    newImages: z.object({
      main: z.string().optional(),
      scenes: z.array(z.string()).default([]),
    }).optional(),
    specs: z.object({
      material: z.string(),
      size: z.string(),
      thickness: z.string(),
      surface: z.string(),
      application: z.string(),
      moq: z.string(),
      packaging: z.string(),
      leadTime: z.string(),
    }),
    features: z.array(z.object({
      feature: z.string(),
      benefit: z.string(),
    })),
    applications: z.array(z.string()),
    customization: z.array(z.string()),
    weight: z.number().default(0),
  }),
});

const blogCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.date(),
    category: z.string(),
    author: z.string().default('TileBridge'),
    image: z.string().default('/assets/images/blog/default.webp'),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = {
  products: productsCollection,
  blog: blogCollection,
};
