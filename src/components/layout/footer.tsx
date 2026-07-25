import Link from "next/link";
import Image from "next/image";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  MapPin,
  Phone,
  Mail,
  ChevronRight,
} from "lucide-react";

const footerLinks = {
  about: [
    { name: "About us", href: "/about" },
    { name: "Contact us", href: "/contact" },
    { name: "Our Projects", href: "/events" },
    { name: "Our Classes", href: "/classes" },
  ],
  quickLinks: [
    { name: "Projects & Units", href: "/" },
    { name: "Forthcoming events", href: "/events" },
    { name: "News & Media", href: "/departments/ict-media" },
    { name: "Prayer Time Table", href: "/" },
  ],
};

export function Footer({ settings = {} }: { settings?: Record<string, string> }) {
  const socialLinks = [
    {
      name: "Facebook",
      href: settings.social_facebook || "https://www.facebook.com/people/Aiu-Alqisc-Club/61554751049769/",
      icon: Facebook,
    },
    { name: "Twitter", href: settings.social_twitter || "#", icon: Twitter },
    {
      name: "Instagram",
      href: settings.social_instagram || "https://www.instagram.com/alqisc.aiu/",
      icon: Instagram,
    },
    { name: "LinkedIn", href: settings.social_linkedin || "#", icon: Linkedin },
  ];
  return (
    <footer className="bg-[var(--primary)] text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Column */}
          <div>
            <Link href="/" className="inline-block mb-4">
              <Image
                src="/images/logo.png"
                alt="Al-QIsc Logo"
                width={96}
                height={96}
                className="w-24 h-24 object-contain"
              />
            </Link>
            <p className="text-white/80 mb-6">
              Together we walk, side by side! For the Ummah, we serve and grow!
            </p>
            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-[var(--primary)] hover:bg-[var(--secondary)] hover:text-[var(--dark)] transition-colors"
                  aria-label={social.name}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* About Links */}
          <div>
            <h3 className="text-[var(--secondary)] text-xl font-semibold mb-6">
              About
            </h3>
            <ul className="space-y-3">
              {footerLinks.about.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-[var(--secondary)]" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-[var(--secondary)] text-xl font-semibold mb-6">
              Quick Link
            </h3>
            <ul className="space-y-3">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.name}>
                  <Link
                    href={link.href}
                    className="flex items-center gap-2 text-white/80 hover:text-white transition-colors"
                  >
                    <ChevronRight className="w-4 h-4 text-[var(--secondary)]" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h3 className="text-[var(--secondary)] text-xl font-semibold mb-6">
              Contact Us
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 pb-4 border-b border-[var(--primary-light)]">
                <MapPin className="w-5 h-5 text-[var(--secondary)] flex-shrink-0 mt-1" />
                <span className="text-white/80">
                  {settings.contact_address || "Albukhary International University Jalan Tun Abdul Razak, 05200, Alor Setar, Kedah Darul Aman, Malaysia."}
                </span>
              </li>
              <li className="flex items-center gap-3 pb-4 border-b border-[var(--primary-light)]">
                <Phone className="w-5 h-5 text-[var(--secondary)] flex-shrink-0" />
                <a
                  href={`tel:${settings.contact_phone || "+60177316088"}`}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {settings.contact_phone || "+60 17-731 6088"}
                </a>
              </li>
              <li className="flex items-center gap-3 pb-4 border-b border-[var(--primary-light)]">
                <Mail className="w-5 h-5 text-[var(--secondary)] flex-shrink-0" />
                <a
                  href={`mailto:${settings.contact_email || "alqiscpersonal@gmail.com"}`}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  {settings.contact_email || "alqiscpersonal@gmail.com"}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/20 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-white/80">
              © {new Date().getFullYear()}{" "}
              <span className="text-[var(--secondary)]">Al-QIsc Club</span>. All
              rights reserved.
            </p>
            <p className="text-white/80">
              Designed by{" "}
              <span className="text-[var(--secondary)]">
                ICT Department of Al-QIsc Club
              </span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
