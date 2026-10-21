import { HeroSection } from "@/components/sections/hero-section";
import { MissionVisionSection } from "@/components/sections/mission-vision-section";
import { ZakatSection } from "@/components/sections/zakat-section";
import { HighlightsCarousel } from "@/components/sections/highlights-carousel";
import { FeaturedEvents } from "@/components/sections/featured-events";
import { LatestNewsSection } from "@/components/sections/latest-news-section";
import { formatEventDate } from "@/lib/feed";
import { ClassesSection } from "@/components/sections/classes-section";
import { TeamCarousel } from "@/components/sections/team-carousel";
import { AdvisorSection } from "@/components/sections/advisor-section";

import {
  getCachedActiveClasses,
  getCachedDepartmentBySlug,
  getCachedEvents,
  getCachedNews,
  getCachedSettings,
} from "@/lib/firebase/public-content";
import type { Metadata } from "next";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

// Gallery images from Events - matching old website's carousel
const galleryImages = [
  { src: "/images/events/Qur_competion1.jpg", alt: "Quran Competition", title: "AIU QUR'AN COMPETITION" },
  { src: "/images/events/quranic_competion 2.jpg", alt: "Quran Competition", title: "AIU QUR'AN COMPETITION" },
  { src: "/images/events/activity-1.jpg", alt: "Club Activity", title: "INAUGURATION CEREMONY" },
  { src: "/images/events/competion_1.jpg", alt: "Competition", title: "COMPETITION" },
  { src: "/images/events/Iftar.jpg", alt: "Iftar", title: "IFTAR GATHERING" },
  { src: "/images/events/for slidshow (1).jpg", alt: "Event Slideshow", title: "CLUB EVENT" },
  { src: "/images/events/for slidshow (2).jpg", alt: "Event Slideshow", title: "CLUB EVENT" },
  { src: "/images/events/for slidshow (3).jpg", alt: "Event Slideshow", title: "CLUB EVENT" },
  { src: "/images/events/for slidshow (4).jpg", alt: "Event Slideshow", title: "CLUB EVENT" },
  { src: "/images/events/for slidshow (5).jpg", alt: "Event Slideshow", title: "CLUB EVENT" },
];

export default async function HomePage() {
  // Fetch dynamic data
  const [allEvents, classes, excoDept, settings, news] = await Promise.all([
    getCachedEvents().catch(() => []),
    getCachedActiveClasses(),
    getCachedDepartmentBySlug("exco").catch(() => null),
    getCachedSettings().catch(() => ({} as Record<string, string>)),
    getCachedNews().catch(() => []),
  ]);
  const featuredEvents = [...allEvents]
    .filter((event) => event.is_featured && event.status === "upcoming")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  // Transform Events Data (1 Main, up to 2 Side Events)
  const mainEvent = featuredEvents[0] ? {
    title: featuredEvents[0].title,
    time: [formatEventDate(featuredEvents[0].date), featuredEvents[0].time].filter(Boolean).join(" · "),
    location: featuredEvents[0].location || "AIU",
    image: featuredEvents[0].image_url || "/images/placeholder.jpg",
    link: `/events/${featuredEvents[0].id}`,
  } : {
    title: "Al Quran Competition - 2025",
    time: "9:00am - 7:00pm",
    location: "Auditorium",
    image: "/images/events/Qur_competion1.jpg",
    link: "/events",
  };

  const sideEvents = featuredEvents.slice(1, 3).map(e => ({
    title: e.title,
    time: [formatEventDate(e.date), e.time].filter(Boolean).join(" · "),
    location: e.location || "AIU",
    image: e.image_url || "/images/placeholder.jpg",
    link: `/events/${e.id}`,
  }));

  // If not enough featured side events, fill with recent events
  if (sideEvents.length < 2) {
    const featuredIds = new Set(featuredEvents.map(e => e.id));
    const recentFill = allEvents
      .filter(e => !featuredIds.has(e.id))
      .slice(0, 2 - sideEvents.length)
      .map(e => ({
        title: e.title,
        time: formatEventDate(e.date),
        location: e.location || "AIU",
        image: e.image_url || "/images/placeholder.jpg",
        link: `/events/${e.id}`,
      }));
    sideEvents.push(...recentFill);
  }

  // Transform Classes Data
  const classesData = classes.map((c) => ({
    id: c.id,
    title: c.title,
    image: c.image_url || "/images/placeholder.jpg",
    schedule: `${c.schedule || ''} ${c.time || ''}`.trim(),
    venue: c.venue || "Online",
    fee: c.fee || "Free",
    objective: c.description || "",
    benefits: c.objectives || [],
    enrollLink: `/classes/${c.slug || c.id}`,
  }));

  // Transform Team Members Data (Top Management from EXCO)
  const topManagementTeam = excoDept?.teams?.find(t => t.title === "Top Management");
  const teamMembers = (topManagementTeam?.members || []).map(m => ({
    name: m.name,
    role: m.role || "Member",
    image: m.image_url || "/images/placeholder.jpg",
    facebook: m.socials?.facebook,
    twitter: m.socials?.twitter,
    instagram: m.socials?.instagram,
    linkedin: m.socials?.linkedin,
    github: m.socials?.github,
    email: m.socials?.email,
    phone: m.socials?.phone,
    website: m.socials?.website,
  }));

  return (
    <>
      {/* Hero Section */}
      <HeroSection
        subtitle={settings.hero_subtitle || "The Journey goes on!"}
        title={settings.hero_title || "AIU Al-Qur'an & Islamic Club"}
        description={settings.hero_description || "Official Al Quran and Islamic Club Account - Albukhary International University (AIU)"}
        backgroundImage={Object.prototype.hasOwnProperty.call(settings, "hero_image")
          ? settings.hero_image
          : "/images/backround.JPG"}
        showButtons={true}
      />

      {/* Mission & Vision */}
      <MissionVisionSection
        missionText={settings.mission_text}
        visionText={settings.vision_text}
      />

      {/* Featured Events / Latest News */}
      <FeaturedEvents mainEvent={mainEvent} sideEvents={sideEvents} />

      {/* Announcements and Instagram/YouTube posts from the app's feed */}
      <LatestNewsSection items={news.slice(0, 3)} />

      {/* Our Classes */}
      {classesData.length > 0 && <ClassesSection classes={classesData} />}

      {/* Recent Highlights Carousel */}
      <HighlightsCarousel images={galleryImages} />

      {/* Zakat Information */}
      <ZakatSection />

      {/* Advisor Section */}
      <AdvisorSection
        name={settings.advisor_name}
        title={settings.advisor_title}
        description={settings.advisor_description}
        image={settings.advisor_image}
      />

      {/* Top Management Team */}
      {teamMembers.length > 0 && <TeamCarousel members={teamMembers} />}
    </>
  );
}
