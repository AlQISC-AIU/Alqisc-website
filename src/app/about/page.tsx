import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, HandHeart, UsersRound } from "lucide-react";
import { TeamDirectory } from "@/components/sections/team-directory";
import { SectionHeader } from "@/components/ui/section-header";
import {
  getCachedActiveDepartmentsWithTeams,
  getCachedSettings,
} from "@/lib/firebase/public-content";

export const metadata: Metadata = {
  title: "About AL-QISC",
  description:
    "Meet the AL-QISC executive committee, departments, and members at Albukhary International University, and learn about our mission and vision.",
  alternates: { canonical: "/about" },
};

const defaultAboutText = `AL-QISC stands for Al-Qur'an and Islamic Club. Our aim is to encourage students to learn and teach the Holy Qur'an while strengthening Islamic values and community engagement.

At Albukhary International University, AL-QISC creates welcoming opportunities for Qur'an recitation, Tajweed practice, classes, inspiring talks, competitions, and Ramadan gatherings.

Through these programmes, we help students build knowledge, unity, and a deeper connection to Islam while serving the wider community.`;

export default async function AboutPage() {
  const [departmentsWithTeams, settings] = await Promise.all([
    getCachedActiveDepartmentsWithTeams(),
    getCachedSettings().catch(() => ({} as Record<string, string>)),
  ]);
  const executiveCommittee = departmentsWithTeams.find((department) => department.slug === "exco");
  const departments = departmentsWithTeams.filter((department) => department.slug !== "exco");
  const aboutImage = settings.about_image || "/images/committee1.jpg";

  return (
    <>
      <section className="relative isolate grid min-h-[520px] place-items-center overflow-hidden bg-[var(--primary)] px-5 pb-20 pt-16 sm:min-h-[580px] sm:px-6 sm:pb-24 lg:min-h-[620px] lg:px-8">
        <Image
          src="/images/backround.JPG"
          alt="AL-QISC student community at Albukhary International University"
          fill
          priority
          sizes="100vw"
          quality={85}
          className="-z-20 object-cover object-[62%_47%] sm:object-[center_47%]"
        />
        <div
          className="absolute inset-0 -z-10 bg-[linear-gradient(92deg,rgba(22,69,91,0.98)_0%,rgba(31,85,109,0.94)_36%,rgba(52,112,141,0.66)_52%,rgba(14,53,72,0.18)_77%,rgba(6,43,59,0.38)_100%)]"
          aria-hidden="true"
        />
        <div className="container mx-auto flex min-h-[500px] items-center px-5 pb-24 pt-16 sm:min-h-[550px] sm:px-6 sm:pb-28 lg:px-8">
          <div className="max-w-xl">
            <h1 className="text-balance font-heading text-5xl font-bold leading-[1.04] text-white sm:text-6xl lg:text-7xl">
              About <span className="text-[var(--secondary)]">AL-QISC</span>
            </h1>
            <p className="mt-6 max-w-lg text-pretty text-base leading-8 text-white/85 sm:text-lg">
              Learn about our purpose, values, and the community behind the AL-Qur&apos;an and Islamic Club.
            </p>
            <Link
              href="#our-story"
              className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[var(--secondary)] px-6 py-3 text-sm font-bold text-[var(--dark)] shadow-lg transition hover:bg-[var(--secondary-dark)] focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-[#184c65]"
            >
              Our journey
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
        <svg
          className="pointer-events-none absolute -bottom-px left-0 h-[140px] w-full sm:h-[180px]"
          viewBox="0 0 1440 180"
          preserveAspectRatio="none"
          shapeRendering="geometricPrecision"
          aria-hidden="true"
        >
          <path
            d="M0 92 C180 70 350 30 520 38 C690 46 820 136 1030 142 C1240 148 1350 116 1440 92 V180 H0 Z"
            fill="white"
          />
        </svg>
      </section>

      <section id="our-story" className="scroll-mt-24 py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-16">
            <figure className="relative mx-auto min-h-[390px] w-full max-w-[650px] sm:min-h-[470px]">
              <div
                className="absolute -left-2 bottom-8 h-28 w-28 opacity-50 sm:-left-8 sm:h-36 sm:w-36"
                style={{ backgroundImage: "radial-gradient(var(--secondary) 1.5px, transparent 1.5px)", backgroundSize: "16px 16px" }}
                aria-hidden="true"
              />
              <div className="absolute left-0 top-0 h-[70%] w-[68%] overflow-hidden rounded-2xl border-4 border-white bg-[var(--light)] shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
                <Image
                  src="/images/committee2.jpg"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 68vw, 36vw"
                  className="object-cover object-[center_18%]"
                />
              </div>
              <div className="absolute bottom-0 right-0 h-[72%] w-[80%] overflow-hidden rounded-2xl border-4 border-white bg-[var(--light)] shadow-[0_20px_48px_rgba(15,23,42,0.16)]">
                <Image
                  src={aboutImage}
                  alt="AL-QISC committee at Albukhary International University"
                  fill
                  sizes="(max-width: 1024px) 80vw, 42vw"
                  className="object-cover object-[center_72%]"
                />
              </div>
            </figure>

            <div>
              <h2 className="mb-6 text-balance font-heading text-3xl font-bold text-[var(--dark)] md:text-4xl">The AL-QISC Background</h2>
              <div className="space-y-4 text-[var(--gray)] leading-relaxed">
                {(settings.about_text || defaultAboutText).split("\n\n").map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
              <Link
                href="#mission-vision"
                className="mt-7 inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--secondary)] px-5 py-2.5 text-sm font-bold text-[var(--dark)] transition hover:bg-[var(--secondary-dark)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
              >
                Read more
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <div className="mt-8 grid grid-cols-3 divide-x divide-[var(--primary)]/15 rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)] px-2 py-5">
                {[
                  { label: "Strong community", Icon: UsersRound },
                  { label: "Islamic values", Icon: HandHeart },
                  { label: "Positive impact", Icon: BookOpen },
                ].map(({ label, Icon }) => (
                  <div key={label} className="px-2 text-center">
                    <Icon className="mx-auto h-6 w-6 text-[var(--primary)]" aria-hidden="true" />
                    <p className="mt-2 text-xs font-semibold leading-4 text-[var(--dark)] sm:text-sm">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mission-vision" className="relative isolate scroll-mt-24 overflow-hidden bg-[#dceafa] py-20 md:py-24 lg:py-28">
        <Image src="/images/visionbg.jpg" alt="" fill sizes="100vw" className="-z-20 object-cover object-center" />
        <div className="absolute inset-0 -z-10 bg-[#eaf3ff]/55" aria-hidden="true" />
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-5xl gap-7 md:grid-cols-2 lg:gap-9">
            <article className="flex h-full flex-col items-center rounded-2xl border border-white/80 bg-white/95 p-8 text-center shadow-[0_18px_45px_rgba(31,85,109,0.14)] sm:p-10">
              <i className="fas fa-seedling mx-auto mb-5 text-6xl leading-none text-[var(--primary)] md:text-7xl" aria-hidden="true" />
              <h2 className="mb-4 font-heading text-3xl font-bold text-[var(--dark)]">Mission</h2>
              <p className="flex-1 leading-8 text-[var(--gray)]">
                {settings.mission_text || "To promote Islamic values and teachings through meaningful activities by enhancing understanding of the Quran, empowering young Islamic leaders to serve their communities, fostering an inclusive and welcoming environment, and strengthening brotherhood and sisterhood through collaboration."}
              </p>
            </article>
            <article className="flex h-full flex-col items-center rounded-2xl border border-white/80 bg-white/95 p-8 text-center shadow-[0_18px_45px_rgba(31,85,109,0.14)] sm:p-10">
              <i className="fas fa-dove mx-auto mb-5 text-6xl leading-none text-[var(--primary)] md:text-7xl" aria-hidden="true" />
              <h2 className="mb-4 font-heading text-3xl font-bold text-[var(--dark)]">Vision</h2>
              <p className="leading-8 text-[var(--gray)]">
                {settings.vision_text || "To become a distinguished platform for fostering Islamic education and community engagement, inspiring a deep love for the Quran and its teachings, and uniting a diverse Ummah through collaborative and spiritually enriching activities."}
              </p>
              <p className="mt-4 text-sm italic leading-6 text-[var(--gray-dark)]">Guided by Aqidah, Akhlaq, Adab, Amanah, and Amalan principles.</p>
            </article>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <SectionHeader subtitle="Our advisor" title="Guidance and support" align="center" />
          <div className="mx-auto mt-10 grid max-w-5xl items-center gap-10 md:mt-12 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)] md:gap-14">
            <div className="relative mx-auto h-64 w-64 overflow-hidden rounded-full border-4 border-white shadow-xl md:h-72 md:w-72">
              <Image
                src={settings.advisor_image || "/images/Advicer.jpeg"}
                alt={`${settings.advisor_name || "Mr. Mohammad Osaid Al Shanti"}, ${settings.advisor_title || "Advisor"}`}
                fill
                sizes="(max-width: 768px) 256px, 288px"
                className="object-cover object-top"
              />
            </div>
            <div className="max-w-lg text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Meet our advisor</p>
              <h3 className="mt-2 font-heading text-3xl font-bold text-[var(--dark)]">
                {settings.advisor_name || "Mr. Mohammad Osaid Al Shanti"}
              </h3>
              <p className="mt-1 text-lg font-semibold text-[var(--primary)]">{settings.advisor_title || "Advisor"}</p>
              <p className="mt-5 leading-relaxed text-[var(--gray)]">
                {settings.advisor_description || "Mr. Osaid provides invaluable guidance and mentorship to AL-QISC, helping the club serve its community with knowledge, care, and purpose."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="our-team" className="scroll-mt-24 bg-[var(--light)] py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <SectionHeader
            subtitle="Leadership & departments"
            title="People behind our mission"
            align="center"
            description="Meet the students leading AL-QISC and explore each department without a crowded organization chart."
          />
          <TeamDirectory executiveCommittee={executiveCommittee} departments={departments} />
        </div>
      </section>
    </>
  );
}
