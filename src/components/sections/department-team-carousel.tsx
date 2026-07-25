import Image from "next/image";
import {
  Facebook,
  Github,
  Globe2,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Twitter,
} from "lucide-react";

interface TeamMember {
  id?: string;
  name: string;
  role: string;
  image: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  linkedin?: string;
  github?: string;
  email?: string;
  phone?: string;
  website?: string;
}

interface DepartmentTeamCarouselProps {
  title: string;
  subtitle?: string;
  members: TeamMember[];
  autoScroll?: boolean;
}

const socialLinks = [
  { key: "facebook", label: "Facebook", Icon: Facebook },
  { key: "twitter", label: "Twitter", Icon: Twitter },
  { key: "instagram", label: "Instagram", Icon: Instagram },
  { key: "linkedin", label: "LinkedIn", Icon: Linkedin },
  { key: "github", label: "GitHub", Icon: Github },
  { key: "email", label: "Email", Icon: Mail },
  { key: "phone", label: "Phone", Icon: Phone },
  { key: "website", label: "Website", Icon: Globe2 },
] as const;

function getHref(key: (typeof socialLinks)[number]["key"], value: string) {
  if (key === "email") return `mailto:${value}`;
  if (key === "phone") return `tel:${value}`;
  return value;
}

export function DepartmentTeamCarousel({
  title,
  subtitle = "Meet the team",
  members,
}: DepartmentTeamCarouselProps) {
  if (!members.length) return null;

  return (
    <section className="border-t border-[var(--primary)]/10 bg-white py-20 md:py-24 lg:py-28">
      <div className="container mx-auto px-5 sm:px-6 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center md:mb-14">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--primary)]">{subtitle}</p>
          <h2 className="font-heading text-3xl font-bold text-[var(--dark)] sm:text-4xl">{title}</h2>
        </div>

        <div className="grid justify-items-center gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member) => {
            const availableLinks = socialLinks.filter(({ key }) => member[key]).slice(0, 4);

            return (
            <article
              key={member.id || `${member.name}-${member.role}`}
              className="relative flex min-h-[390px] w-full max-w-[350px] flex-col overflow-hidden rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] shadow-[0_10px_30px_rgba(15,23,42,0.09)]"
            >
              <div
                className="absolute inset-x-0 top-0 h-36 bg-[var(--secondary)] [clip-path:polygon(0_0,100%_0,100%_58%,50%_100%,0_58%)]"
                aria-hidden="true"
              />
              <div className="relative mx-auto mt-7 h-44 w-44 shrink-0 overflow-hidden rounded-full border-[5px] border-[var(--secondary)] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.12)]">
                <Image
                  src={member.image}
                  alt={member.name}
                  fill
                  sizes="176px"
                  className="object-cover object-top"
                />
              </div>
              <div className="flex flex-1 flex-col px-6 pb-6 pt-7 text-center">
                <h3 className="font-heading text-xl font-bold leading-snug text-[var(--dark)]">{member.name}</h3>
                <p className="mt-2 text-base font-medium leading-6 text-[var(--gray)]">{member.role}</p>
                {availableLinks.length ? (
                <div className="mt-auto flex justify-center gap-2.5 border-t border-[var(--primary)]/10 pt-6">
                  {availableLinks.map(({ key, label, Icon }) => {
                    const value = member[key];
                    if (!value) return null;
                    const isExternal = !["email", "phone"].includes(key);

                    return (
                      <a
                        key={key}
                        href={getHref(key, value)}
                        target={isExternal ? "_blank" : undefined}
                        rel={isExternal ? "noopener noreferrer" : undefined}
                        aria-label={`${label} for ${member.name}`}
                        title={label}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--primary)]/20 bg-white text-[var(--primary)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary)] hover:text-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
                      >
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </a>
                    );
                  })}
                </div>
                ) : null}
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
