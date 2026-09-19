import "server-only";

import { unstable_cache } from "next/cache";
import { getPublishedPosts, getPostBySlug } from "./blog";
import { getClassById, getClassBySlug, getClasses } from "./classes";
import {
    getActiveDepartments,
    getActiveDepartmentsWithTeams,
    getDepartmentBySlug,
} from "./departments";
import { getEventById, getEvents } from "./events";
import { getSettings } from "./settings";

const CONTENT_REVALIDATE_SECONDS = 15 * 60;
const SETTINGS_REVALIDATE_SECONDS = 60 * 60;

export const getCachedSettings = unstable_cache(
    getSettings,
    ["public-site-settings"],
    { revalidate: SETTINGS_REVALIDATE_SECONDS, tags: ["site-settings"] },
);

export const getCachedActiveDepartments = unstable_cache(
    getActiveDepartments,
    ["public-active-departments"],
    { revalidate: SETTINGS_REVALIDATE_SECONDS, tags: ["departments"] },
);

export const getCachedActiveDepartmentsWithTeams = unstable_cache(
    getActiveDepartmentsWithTeams,
    ["public-active-departments-with-teams"],
    {
        revalidate: SETTINGS_REVALIDATE_SECONDS,
        tags: ["departments", "teams", "members"],
    },
);

export const getCachedDepartmentBySlug = unstable_cache(
    getDepartmentBySlug,
    ["public-department-by-slug"],
    {
        revalidate: SETTINGS_REVALIDATE_SECONDS,
        tags: ["departments", "teams", "members"],
    },
);

export const getCachedEvents = unstable_cache(
    () => getEvents(),
    ["public-events"],
    { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["events"] },
);

export const getCachedEventById = unstable_cache(
    getEventById,
    ["public-event-by-id"],
    { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["events"] },
);

export const getCachedActiveClasses = unstable_cache(
    () => getClasses({ active_only: true }),
    ["public-active-classes"],
    { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["classes"] },
);

export const getCachedClassById = unstable_cache(
    getClassById,
    ["public-class-by-id"],
    { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["classes"] },
);

export const getCachedClassBySlug = unstable_cache(
    getClassBySlug,
    ["public-class-by-slug"],
    { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["classes"] },
);

export const getCachedPublishedPosts = unstable_cache(
    getPublishedPosts,
    ["public-published-posts"],
    { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["blog-posts"] },
);

export const getCachedPostBySlug = unstable_cache(
    getPostBySlug,
    ["public-post-by-slug"],
    { revalidate: CONTENT_REVALIDATE_SECONDS, tags: ["blog-posts"] },
);
