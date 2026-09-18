"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Department } from "@/lib/firebase/types";

interface NavItem {
  name: string;
  href: string;
  children?: { name: string; href: string }[];
}

function buildNavigation(departments: Department[]): NavItem[] {
  const deptChildren = departments.map((d) => ({
    name: d.name,
    href: `/departments/${d.slug}`,
  }));

  return [
    { name: "Home", href: "/" },
    { name: "About", href: "/about" },
    { name: "Events", href: "/events" },
    { name: "Classes", href: "/classes" },
    { name: "Contact", href: "/contact" },
    { name: "Blog", href: "/blog" },
    ...(deptChildren.length > 0
      ? [{ name: "Department", href: "#", children: deptChildren }]
      : []),
    { name: "Donation", href: "/donation" },
  ];
}

export function Navbar({ departments = [] }: { settings?: Record<string, string>; departments?: Department[] }) {
  const pathname = usePathname();
  const navigation = buildNavigation(departments);
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isItemActive = (item: NavItem) => {
    if (item.children) return pathname.startsWith("/departments/");
    if (item.href === "/") return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 border-b border-white/10 backdrop-blur-md transition-all duration-300",
        isScrolled
          ? "bg-[var(--primary)]/95 shadow-lg"
          : "bg-[var(--primary)]/88"
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logos */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-3">
              {/* AIU Logo */}
              <Image
                src="/images/aiu-logo.png"
                alt="AIU Logo"
                width={100}
                height={75}
                priority
                className="h-[60px] w-auto object-contain"
              />
              {/* Al-Qisc Logo */}
              <Image
                src="/images/logo.png"
                alt="Al-QIsc Logo"
                width={55}
                height={55}
                priority
                className="h-[50px] w-auto object-contain"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-1">
            {navigation.map((item) => (
              <div
                key={item.name}
                className="relative group"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setActiveDropdown(null);
                }}
              >
                {item.children ? (
                  <>
                    <button
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-4 py-2 font-medium text-white transition-all hover:border-white/50 hover:bg-white/10 hover:text-white",
                        isItemActive(item)
                          ? "border-white/90 bg-white/10 shadow-sm"
                          : "border-transparent",
                      )}
                      onMouseEnter={() => setActiveDropdown(item.name)}
                      onMouseLeave={() => setActiveDropdown(null)}
                      onFocus={() => setActiveDropdown(item.name)}
                      onClick={() => setActiveDropdown((current) => current === item.name ? null : item.name)}
                      aria-haspopup="menu"
                      aria-expanded={activeDropdown === item.name}
                      aria-controls={`desktop-menu-${item.name.toLowerCase().replaceAll(" ", "-")}`}
                    >
                      {item.name}
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <div
                      id={`desktop-menu-${item.name.toLowerCase().replaceAll(" ", "-")}`}
                      role="menu"
                      className={cn(
                        "absolute top-full left-0 bg-white rounded-lg shadow-xl py-2 min-w-[200px] transition-all duration-200",
                        activeDropdown === item.name
                          ? "opacity-100 visible translate-y-0"
                          : "opacity-0 invisible -translate-y-2"
                      )}
                      onMouseEnter={() => setActiveDropdown(item.name)}
                      onMouseLeave={() => setActiveDropdown(null)}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          role="menuitem"
                          onClick={() => setActiveDropdown(null)}
                          className="block px-4 py-2 text-[var(--dark)] hover:bg-[var(--light)] hover:text-[var(--primary)] transition-colors"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isItemActive(item) ? "page" : undefined}
                    className={cn(
                      "rounded-md border px-4 py-2 font-medium text-white transition-all hover:border-white/50 hover:bg-white/10 hover:text-white",
                      isItemActive(item)
                        ? "border-white/90 bg-white/10 shadow-sm"
                        : "border-transparent",
                    )}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "lg:hidden transition-all duration-300",
            isOpen
              ? "max-h-[calc(100vh-5rem)] pb-4 overflow-y-auto overflow-x-hidden"
              : "max-h-0 overflow-hidden"
          )}
        >
          <div className="flex flex-col gap-1">
            {navigation.map((item) => (
              <div key={item.name}>
                {item.children ? (
                  <>
                    <button
                      className={cn(
                        "flex w-full items-center justify-between rounded-lg border px-4 py-3 text-white transition-colors hover:bg-white/10",
                        isItemActive(item) ? "border-white/70 bg-white/10" : "border-transparent",
                      )}
                      onClick={() =>
                        setActiveDropdown(
                          activeDropdown === item.name ? null : item.name
                        )
                      }
                    >
                      {item.name}
                      <ChevronDown
                        className={cn(
                          "w-4 h-4 transition-transform",
                          activeDropdown === item.name && "rotate-180"
                        )}
                      />
                    </button>
                    <div
                      className={cn(
                        "overflow-hidden transition-all duration-200 pl-4",
                        activeDropdown === item.name
                          ? "max-h-[500px]"
                          : "max-h-0"
                      )}
                    >
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block px-4 py-2 text-white/80 hover:text-[var(--secondary)] transition-colors"
                          onClick={() => setIsOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isItemActive(item) ? "page" : undefined}
                    className={cn(
                      "block rounded-lg border px-4 py-3 text-white transition-colors hover:bg-white/10",
                      isItemActive(item) ? "border-white/70 bg-white/10" : "border-transparent",
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </nav>
  );
}
