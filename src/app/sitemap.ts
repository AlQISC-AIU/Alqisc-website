import type { MetadataRoute } from "next";
import { getPublishedPosts } from "@/lib/firebase/blog";
import { getClasses } from "@/lib/firebase/classes";
import { getActiveDepartments } from "@/lib/firebase/departments";
import { getEvents } from "@/lib/firebase/events";
import { getSiteUrl } from "@/lib/site-url";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const [departments, events, classes, posts] = await Promise.all([
    getActiveDepartments().catch(() => []),
    getEvents().catch(() => []),
    getClasses({ active_only: true }).catch(() => []),
    getPublishedPosts().catch(() => []),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/about`, changeFrequency: "monthly", priority: 0.9 },
    { url: `${siteUrl}/events`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/classes`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${siteUrl}/blog`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/contact`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${siteUrl}/donation`, changeFrequency: "monthly", priority: 0.7 },
  ];

  return [
    ...staticRoutes,
    ...departments.map((department) => ({
      url: `${siteUrl}/departments/${department.slug}`,
      lastModified: department.updated_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    })),
    ...events.map((event) => ({
      url: `${siteUrl}/events/${event.id}`,
      lastModified: event.created_at || event.date || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...classes.map((classItem) => ({
      url: `${siteUrl}/classes/${classItem.slug || classItem.id}`,
      lastModified: classItem.created_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...posts.map((post) => ({
      url: `${siteUrl}/blog/${post.slug}`,
      lastModified: post.updated_at || post.published_at || undefined,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
