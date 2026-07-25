// Shared TypeScript types for all Firebase entities

export interface Department {
    id: string;
    slug: string;
    name: string;
    full_name: string;
    description: string;
    image_url: string;
    objectives: string[];
    responsibilities: string[];
    is_active: boolean;
    display_order: number;
    created_at: string;
    updated_at: string;
    teams?: Team[];
}

export interface Team {
    id: string;
    department_id: string;
    title: string;
    display_order: number;
    members?: Member[];
}

export interface Member {
    id: string;
    team_id: string;
    name: string;
    role: string;
    image_url: string;
    socials: Record<string, string>;
    display_order: number;
}

export interface Event {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    location: string;
    category: string;
    status: string;
    image_url: string;
    is_featured: boolean;
    registration_url: string;
    created_at: string;
}

export interface Class {
    id: string;
    slug: string;
    title: string;
    description: string;
    schedule: string;
    time: string;
    venue: string;
    fee: string;
    students_enrolled: number;
    image_url: string;
    objectives: string[];
    registration_url: string;
    is_active: boolean;
    created_at: string;
}

export interface BlogPost {
    id: string;
    slug: string;
    title: string;
    excerpt: string;
    content: string;
    category: string;
    author: string;
    status: string;
    featured_image_url: string;
    published_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface SiteSetting {
    key: string;
    value: string;
    updated_at: string;
}
