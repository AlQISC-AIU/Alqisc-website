"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { X, ChevronLeft, ChevronRight, HelpCircle } from "lucide-react";
import {
    ADMIN_BASE_PATH,
    ADMIN_DASHBOARD_PATH,
    ADMIN_MOBILE_NAV_EVENT,
} from "@/lib/admin-routes";

interface TourStep {
    target: string; // CSS selector
    title: string;
    content: string;
    placement?: "top" | "bottom" | "left" | "right";
}

// ── Page-specific tour definitions ──────────────────────────────────

const DASHBOARD_STEPS: TourStep[] = [
    {
        target: "[data-tour='sidebar']",
        title: "Navigation Sidebar",
        content: "This is your main navigation. Use it to switch between Departments, Events, Classes, Blog, and Settings.",
        placement: "right",
    },
    {
        target: "[data-tour='stats']",
        title: "Overview Stats",
        content: "See a quick count of all your content at a glance. Click any card to jump directly to that section.",
        placement: "bottom",
    },
    {
        target: "[data-tour='quick-actions']",
        title: "Quick Actions",
        content: "Shortcuts to common tasks — create events, write blog posts, manage members, or edit site settings from here.",
        placement: "right",
    },
    {
        target: "[data-tour='nav-departments']",
        title: "Departments",
        content: "Manage your club's departments, teams, and members here.",
        placement: "right",
    },
    {
        target: "[data-tour='nav-events']",
        title: "Events & Feed",
        content: "Publish events and announcements to the website and the mobile app, and manage imported Instagram and YouTube posts.",
        placement: "right",
    },
    {
        target: "[data-tour='nav-classes']",
        title: "Classes",
        content: "Add Islamic classes with schedules, instructors, and enrollment links.",
        placement: "right",
    },
    {
        target: "[data-tour='nav-blog']",
        title: "Blog",
        content: "Write and publish articles and news for the website.",
        placement: "right",
    },
    {
        target: "[data-tour='nav-settings']",
        title: "Settings",
        content: "Update the website's hero text, contact info, mission/vision, and more.",
        placement: "right",
    },
    {
        target: "[data-tour='logout']",
        title: "Logout",
        content: "Click here to securely log out when you're done.",
        placement: "right",
    },
];

const DEPARTMENTS_LIST_STEPS: TourStep[] = [
    {
        target: "[data-tour='dept-add']",
        title: "Add Department",
        content: "Click here to create a new department. You'll set a short name, full name, description, photo, and objectives.",
        placement: "bottom",
    },
    {
        target: "[data-tour='department-list']",
        title: "Department Cards",
        content: "Each department is shown as an expandable card. Click a card to expand it and see its teams and members. You can toggle departments active/inactive, edit, or delete them.",
        placement: "bottom",
    },
];

const DEPARTMENTS_NEW_STEPS: TourStep[] = [
    {
        target: "[data-tour='dept-form']",
        title: "Department Form",
        content: "Fill in the department details: short name (displayed as badge), full name, and a description. You can also upload a department photo.",
        placement: "bottom",
    },
];

const DEPARTMENTS_EDIT_STEPS: TourStep[] = [
    {
        target: "[data-tour='dept-tabs']",
        title: "Details & Members Tabs",
        content: "Switch between editing department info and managing team members using these tabs.",
        placement: "bottom",
    },
  {
    target: "[data-tour='dept-add-member']",
        title: "Add Team Members",
        content: "Click 'Add Member' to add a new person. You can set their photo, name (max 2 words), role, and up to 4 social media links.",
        placement: "bottom",
    },
    {
        target: "[data-tour='dept-add-team']",
        title: "Create Another Team",
        content: "Use this area to create another team inside the department. The new team will then have its own Add Member control.",
        placement: "top",
    },
    {
        target: "[data-tour='member-actions']",
        title: "Edit or Remove Members",
        content: "Use these visible controls to edit a member's details or remove the member. On phones, the controls remain available without requiring hover.",
        placement: "bottom",
    },
];

const EVENTS_LIST_STEPS: TourStep[] = [
    {
        target: "[data-tour='feed-add']",
        title: "Add Events and Announcements",
        content: "Create an event (website and app) or an announcement (app). Instagram & YouTube turns the automatic imports on or off.",
        placement: "bottom",
    },
    {
        target: "[data-tour='feed-filters']",
        title: "Filter & Search",
        content: "Filter by type and status, or search by title. Imported posts can be archived, republished or pinned from the list.",
        placement: "bottom",
    },
];

const EVENTS_NEW_STEPS: TourStep[] = [
  {
    target: "[data-tour='feed-form']",
        title: "Details",
        content: "Write the title and summary in English (Arabic and Malay are optional). Events also need a start time in Malaysian time. On the right, choose who can see it, the priority and a poster.",
        placement: "bottom",
    },
    {
        target: "[data-tour='feed-form']",
        title: "Publish and Update",
        content: "Published items appear right away. Archive an item to hide it but keep it; delete only when it must be removed for good.",
        placement: "top",
    },
];

const CLASSES_LIST_STEPS: TourStep[] = [
  {
    target: "[data-tour='class-add']",
        title: "Add New Class",
        content: "Click here to create a new Islamic class with schedule, venue, fee, and enrollment details.",
        placement: "bottom",
    },
    {
        target: "[data-tour='class-list']",
        title: "Manage Existing Classes",
        content: "Use this list to review classes, open an edit page, change active visibility, or remove an outdated class.",
        placement: "bottom",
    },
];

const CLASSES_NEW_STEPS: TourStep[] = [
  {
    target: "[data-tour='class-form']",
        title: "Class Details",
        content: "Fill in class details on the left (title, description, schedule, time, venue, fee, students enrolled, registration link). On the right, upload an image, add learning objectives, and set active status.",
        placement: "bottom",
    },
    {
        target: "[data-tour='class-form']",
        title: "Visibility and Enrollment",
        content: "Check the Active setting and enrollment link before saving. Inactive classes stay hidden from public class listings.",
        placement: "top",
    },
];

const BLOG_LIST_STEPS: TourStep[] = [
    {
        target: "[data-tour='blog-add']",
        title: "Write New Post",
        content: "Click here to create a new blog post with a rich text editor, featured image, and publishing options.",
        placement: "bottom",
    },
    {
        target: "[data-tour='blog-filters']",
        title: "Filter & Search",
        content: "Filter posts by All, Published, or Drafts. Use the search box to find posts by title or category.",
        placement: "bottom",
    },
];

const BLOG_NEW_STEPS: TourStep[] = [
  {
    target: "[data-tour='blog-form']",
        title: "Blog Editor",
        content: "Write your post on the left using the rich text editor with formatting tools. On the right, set publishing options (status, category, author), upload a featured image, and preview before publishing.",
        placement: "bottom",
    },
    {
        target: "[data-tour='blog-form']",
        title: "Preview and Publishing",
        content: "Preview the article before publishing, confirm its category and author, then choose Draft or Published. Draft posts remain hidden from the public blog.",
        placement: "top",
    },
];

const PROFILE_GUIDE_STEPS: TourStep[] = [
    {
        target: "[data-tour='profile-page']",
        title: "Your Administrator Profile",
        content: "Update your display name and profile photo here. Your email identifies the signed-in account and is not changed from this page.",
        placement: "bottom",
    },
    {
        target: "[data-tour='profile-page']",
        title: "Password Security",
        content: "Use the password option to request a secure password-update email. Keep your administrator account private and sign out on shared devices.",
        placement: "top",
    },
];

const ADMINISTRATORS_GUIDE_STEPS: TourStep[] = [
    {
        target: "[data-tour='administrators-page']",
        title: "Invite Administrators",
        content: "The primary administrator can invite an approved email address. Only approved and active accounts can create an admin session.",
        placement: "bottom",
    },
    {
        target: "[data-tour='administrators-page']",
        title: "Manage Access",
        content: "Review invitation status, resend account setup when necessary, and remove access when a person should no longer manage the website.",
        placement: "top",
    },
];

const PROFILE_STEPS: TourStep[] = [
  {
    target: "main",
    title: "Your Profile",
    content:
      "Update the name and profile photo shown throughout the administration area.",
  },
  {
    target: "[data-tour='dept-add-team']",
    title: "Create Another Team",
    content:
      "Add a team when this department needs another group, committee, or management level.",
  },
  {
    target: "main",
    title: "Account Security",
    content:
      "Your sign-in email is shown here. Use the password option on this page whenever you need to update your credentials.",
  },
  {
    target: "[data-tour='class-list']",
    title: "Manage Existing Classes",
    content:
      "Open a class to review its details, update its schedule and enrollment information, change visibility, or remove it.",
  },
  {
    target: "[data-tour='class-form']",
    title: "Visibility and Enrollment",
    content:
      "Set the class schedule, venue, fee, enrollment link, objectives, and active status before saving.",
  },
  {
    target: "[data-tour='feed-form']",
    title: "Publish and Update",
    content:
      "Choose who can see the item, its priority, registration link and poster. On edit pages, save changes only after reviewing the details.",
  },
  {
    target: "[data-tour='blog-form']",
    title: "Preview and Publishing",
    content:
      "Use preview to check the article, then save it as a draft or publish it when the content and cover image are ready.",
  },
];

const ADMINISTRATORS_STEPS: TourStep[] = [
  {
    target: "main",
    title: "Administrator Access",
    content:
      "Invite trusted administrators, review their access status, and resend pending invitations from this page.",
  },
  {
    target: "main",
    title: "Manage Access Carefully",
    content:
      "You can remove access when it is no longer needed. Only the primary administrator can manage this section.",
  },
];

const BLOG_PREVIEW_STEPS: TourStep[] = [
  {
    target: "article",
    title: "Article Preview",
    content:
      "Review the title, cover image, formatting, links, and mobile readability before publishing.",
  },
];

const SETTINGS_STEPS: TourStep[] = [
    {
        target: "[data-tour='settings-save']",
        title: "Save Changes",
        content: "After editing any settings below, click this button to save all changes at once. Changes apply instantly to the public website.",
        placement: "bottom",
    },
    {
        target: "[data-tour='settings-sections']",
        title: "Settings Sections",
        content: "Click each section to expand it. You can edit the homepage hero text, about page, mission & vision, advisor info, contact details, and donation settings.",
        placement: "bottom",
    },
];

// ── Route → Steps mapping ───────────────────────────────────────────

function getStepsForPath(pathname: string): TourStep[] {
  if (pathname.endsWith("/profile")) return PROFILE_GUIDE_STEPS;
  if (pathname.endsWith("/administrators"))
    return ADMINISTRATORS_GUIDE_STEPS;
  if (pathname.endsWith("/blog/preview")) return BLOG_PREVIEW_STEPS;
    const route = pathname.startsWith(ADMIN_BASE_PATH)
        ? pathname.slice(ADMIN_BASE_PATH.length) || "/"
        : pathname;

    if (route === "/dashboard") return DASHBOARD_STEPS;
    if (route === "/departments") return DEPARTMENTS_LIST_STEPS;
    if (route === "/departments/new") return DEPARTMENTS_NEW_STEPS;
    if (/^\/departments\/.+\/edit$/.test(route)) return DEPARTMENTS_EDIT_STEPS;
    if (route === "/feed") return EVENTS_LIST_STEPS;
    if (route === "/feed/new") return EVENTS_NEW_STEPS;
    if (/^\/feed\/.+\/edit$/.test(route)) return EVENTS_NEW_STEPS;
    if (route === "/classes") return CLASSES_LIST_STEPS;
    if (route === "/classes/new") return CLASSES_NEW_STEPS;
    if (/^\/classes\/.+\/edit$/.test(route)) return CLASSES_NEW_STEPS;
    if (route === "/blog") return BLOG_LIST_STEPS;
    if (route === "/blog/new") return BLOG_NEW_STEPS;
    if (/^\/blog\/.+\/edit$/.test(route)) return BLOG_NEW_STEPS;
    if (route === "/profile") return PROFILE_STEPS;
    if (route === "/administrators") return ADMINISTRATORS_STEPS;
    if (route === "/settings") return SETTINGS_STEPS;
    return DASHBOARD_STEPS;
}

const TOUR_STORAGE_KEY = "alqisc-admin-tour-seen";

export function GuidedTour() {
    const pathname = usePathname();
    const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [targetVersion, setTargetVersion] = useState(0);
    const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
    const [arrowStyle, setArrowStyle] = useState<React.CSSProperties>({});
    const [placement, setPlacement] = useState<"top" | "bottom" | "left" | "right">("bottom");
    const tooltipRef = useRef<HTMLDivElement>(null);
    const steps = getStepsForPath(pathname);

    // Reset step index when navigating to a new page
    useEffect(() => {
        const timer = window.setTimeout(() => {
            setCurrentStep(0);
            setIsRunning(false);
        }, 0);
        return () => window.clearTimeout(timer);
    }, [pathname]);

    // Auto-start tour on first visit to dashboard only
    useEffect(() => {
        if (pathname !== ADMIN_DASHBOARD_PATH) return;
        const seen = localStorage.getItem(TOUR_STORAGE_KEY);
        if (!seen) {
            const timer = setTimeout(() => setIsRunning(true), 800);
            return () => clearTimeout(timer);
        }
    }, [pathname]);

    const positionTooltip = useCallback(() => {
        if (!steps[currentStep]) return;
        const step = steps[currentStep];
        const el = document.querySelector(step.target);
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const tooltipW = Math.min(340, window.innerWidth - 24);
        const tooltipH = tooltipRef.current?.offsetHeight || 180;
        const gap = 14;
        const dir = step.placement || "bottom";

        let top = 0;
        let left = 0;
        let arrowTop = 0;
        let arrowLeft = 0;
        let finalPlacement = dir;

        if (dir === "right") {
            top = rect.top + rect.height / 2 - tooltipH / 2;
            left = rect.right + gap;
            arrowTop = tooltipH / 2 - 8;
            arrowLeft = -8;
            // If it goes off right edge, flip to bottom
            if (left + tooltipW > window.innerWidth - 20) {
                finalPlacement = "bottom";
                top = rect.bottom + gap;
                left = rect.left + rect.width / 2 - tooltipW / 2;
                arrowTop = -8;
                arrowLeft = tooltipW / 2 - 8;
            }
        } else if (dir === "bottom") {
            top = rect.bottom + gap;
            left = rect.left + rect.width / 2 - tooltipW / 2;
            arrowTop = -8;
            arrowLeft = tooltipW / 2 - 8;
        } else if (dir === "top") {
            top = rect.top - tooltipH - gap;
            left = rect.left + rect.width / 2 - tooltipW / 2;
            arrowTop = tooltipH;
            arrowLeft = tooltipW / 2 - 8;
        } else if (dir === "left") {
            top = rect.top + rect.height / 2 - tooltipH / 2;
            left = rect.left - tooltipW - gap;
            arrowTop = tooltipH / 2 - 8;
            arrowLeft = tooltipW;
        }

        // Clamp to viewport
        left = Math.max(12, Math.min(left, window.innerWidth - tooltipW - 12));
        top = Math.max(12, Math.min(top, window.innerHeight - tooltipH - 12));

        setPlacement(finalPlacement);
        setTooltipStyle({
            position: "fixed",
            top,
            left,
            width: tooltipW,
            zIndex: 10002,
            transition: "top 0.3s ease, left 0.3s ease",
        });
        setArrowStyle({
            position: "absolute",
            top: arrowTop,
            left: arrowLeft,
        });
    }, [currentStep, steps]);

    useEffect(() => {
        if (!isRunning || !steps[currentStep] || window.innerWidth >= 1024) return;

        const target = steps[currentStep].target;
        const needsMobileNavigation =
            target === "[data-tour='sidebar']" ||
            target === "[data-tour='logout']" ||
            target.startsWith("[data-tour='nav-");

        window.dispatchEvent(
            new CustomEvent<boolean>(ADMIN_MOBILE_NAV_EVENT, {
                detail: needsMobileNavigation,
            }),
        );

        return () => {
            if (needsMobileNavigation) {
                window.dispatchEvent(
                    new CustomEvent<boolean>(ADMIN_MOBILE_NAV_EVENT, { detail: false }),
                );
            }
        };
    }, [currentStep, isRunning, steps]);

    // Highlight & scroll to element
  useEffect(() => {
    if (!isRunning || !steps[currentStep]) return;

    const target = steps[currentStep].target;
    const needsMembersTab =
      target === "[data-tour='dept-add-member']" ||
      target === "[data-tour='dept-add-team']" ||
      target === "[data-tour='member-actions']";

    if (!needsMembersTab) return;

    const membersTab = document.querySelector(
      "[data-tour='dept-tabs'] button:last-of-type",
    ) as HTMLButtonElement | null;
    membersTab?.click();

    const timer = window.setTimeout(() => {
      setTargetVersion((version) => version + 1);
    }, 120);

    return () => window.clearTimeout(timer);
  }, [currentStep, isRunning, steps]);

  useEffect(() => {
    if (!isRunning || !steps[currentStep]) return;

        const step = steps[currentStep];
        const el = document.querySelector(step.target) as HTMLElement | null;
        if (!el) return;

        // Check if element has fixed positioning (e.g. sidebar)
        const computedPos = window.getComputedStyle(el).position;
        const isFixed = computedPos === "fixed";

        // Scroll element into view (skip for fixed elements)
        if (!isFixed) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Add highlight — don't change position on fixed elements
        if (!isFixed) {
            el.style.position = "relative";
        }
        el.style.zIndex = "10001";
        el.style.boxShadow = "0 0 0 4px var(--secondary), 0 0 0 8px rgba(254,187,12,0.2)";
        if (!isFixed) {
            el.style.borderRadius = "12px";
        }
        el.style.transition = "box-shadow 0.3s ease";

        // Position tooltip after a small delay for scroll
        const timer = setTimeout(positionTooltip, 350);
        window.addEventListener("resize", positionTooltip);

        return () => {
            if (!isFixed) {
                el.style.position = "";
                el.style.borderRadius = "";
            }
            el.style.zIndex = "";
            el.style.boxShadow = "";
            el.style.transition = "";
            clearTimeout(timer);
            window.removeEventListener("resize", positionTooltip);
        };
  }, [isRunning, currentStep, positionTooltip, steps, targetVersion]);

    const endTour = useCallback(() => {
        window.dispatchEvent(
            new CustomEvent<boolean>(ADMIN_MOBILE_NAV_EVENT, { detail: false }),
        );
        setIsRunning(false);
        setCurrentStep(0);
        localStorage.setItem(TOUR_STORAGE_KEY, "true");
    }, []);

    const next = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep((s) => s + 1);
        } else {
            endTour();
        }
    };

    const prev = () => {
        if (currentStep > 0) setCurrentStep((s) => s - 1);
    };

    const skip = () => endTour();

    const startTour = () => {
        setCurrentStep(0);
        setIsRunning(true);
    };

    const arrowDir = {
        top: "border-l-8 border-r-8 border-t-8 border-l-transparent border-r-transparent border-t-white",
        bottom:
            "border-l-8 border-r-8 border-b-8 border-l-transparent border-r-transparent border-b-white",
        left: "border-t-8 border-b-8 border-l-8 border-t-transparent border-b-transparent border-l-white",
        right:
            "border-t-8 border-b-8 border-r-8 border-t-transparent border-b-transparent border-r-white",
    };

    // Arrow points toward the element, so it's on the opposite side of placement
    const arrowClass = {
        top: arrowDir.top,
        bottom: arrowDir.bottom,
        left: arrowDir.left,
        right: arrowDir.left, // arrow points left (toward element)
    }[placement];

    return (
        <>
            {/* Help button - always visible */}
            <button
                onClick={startTour}
                className="fixed bottom-6 right-6 z-[9999] w-12 h-12 bg-[var(--secondary)] hover:bg-[var(--secondary-dark)] text-[var(--dark)] rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-110"
                title="Start guided tour"
            >
                <HelpCircle className="w-6 h-6" />
            </button>

            {isRunning && (
                <>
                    {/* Overlay */}
                    <div
                        className="fixed inset-0 bg-black/50 z-[10000] transition-opacity duration-300"
                        onClick={skip}
                    />

                    {/* Tooltip */}
                    <div ref={tooltipRef} style={tooltipStyle} className="rounded-xl shadow-2xl">
                        {/* Arrow */}
                        <div style={arrowStyle} className="absolute">
                            <div className={`w-0 h-0 ${arrowClass}`} />
                        </div>

                        <div className="bg-white rounded-xl overflow-hidden">
                            {/* Header */}
                            <div className="bg-[var(--primary)] px-5 py-3 flex items-center justify-between">
                                <span className="text-white font-heading font-bold text-sm">
                                    {steps[currentStep].title}
                                </span>
                                <button
                                    onClick={skip}
                                    className="text-white/70 hover:text-white transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            {/* Body */}
                            <div className="px-5 py-4">
                                <p className="text-sm text-[var(--gray)] leading-relaxed">
                                    {steps[currentStep].content}
                                </p>
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 bg-gray-50 flex items-center justify-between border-t border-gray-100">
                                <span className="text-xs text-gray-400">
                                    {currentStep + 1} / {steps.length}
                                </span>
                                <div className="flex items-center gap-2">
                                    {currentStep === 0 ? (
                                        <button
                                            onClick={skip}
                                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors"
                                        >
                                            Skip Tour
                                        </button>
                                    ) : (
                                        <button
                                            onClick={prev}
                                            className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 transition-colors"
                                        >
                                            <ChevronLeft className="w-3 h-3" />
                                            Back
                                        </button>
                                    )}
                                    <button
                                        onClick={next}
                                        className="px-4 py-1.5 bg-[var(--primary)] text-white text-xs font-medium rounded-lg hover:bg-[var(--primary-dark)] flex items-center gap-1 transition-colors"
                                    >
                                        {currentStep === steps.length - 1
                                            ? "Finish"
                                            : "Next"}
                                        {currentStep < steps.length - 1 && (
                                            <ChevronRight className="w-3 h-3" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
