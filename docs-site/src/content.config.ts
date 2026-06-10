/**
 * Content collection schema for the docs site.
 *
 * A single `docs` collection of MDX files, one per page. Each entry has
 * a section (sidebar grouping), a numeric `order` for sorting within a
 * section, and a `draft` flag to skip pages from production builds.
 *
 * Define a Zod enum for the known sections so a typo in frontmatter
 * fails the build instead of silently disappearing from the sidebar.
 */
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const sectionEnum = z.enum([
  "Getting Started",
  "Architecture",
  "Configuration",
  "Tools",
  "Deployment",
  "Reference",
  "Guides",
]);

const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string().min(1),
    description: z.string().min(1),
    section: sectionEnum,
    order: z.number().int().nonnegative().default(0),
    draft: z.boolean().default(false),
  }),
});

export const collections = { docs };
export const SECTIONS = sectionEnum.options;
