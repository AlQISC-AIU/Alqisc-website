import Image from "next/image";
import Link from "next/link";
import { InnerPageHero } from "@/components/sections/inner-page-hero";
import { SectionHeader } from "@/components/ui/section-header";
import { OrganizationChart } from "@/components/sections/organization-chart";
import { getDepartmentBySlug, getActiveDepartments } from "@/lib/firebase/departments";
import { getSettings } from "@/lib/firebase/settings";

export const metadata = {
  title: "About Us | Al-QIsc Club",
  description:
    "Learn about Al-Qur'an and Islamic Club (ALQISC) at Albukhary International University - our mission, vision, and dedicated team.",
};

export default async function AboutPage() {
  const [allDepartments, settings] = await Promise.all([
    getActiveDepartments(),
    getSettings().catch(() => ({} as Record<string, string>))
  ]);

  // Fetch each department with its teams and members
  const departmentsWithTeams = await Promise.all(
    allDepartments.map((dept) => getDepartmentBySlug(dept.slug).catch(() => dept))
  );

  const executiveCommittee = departmentsWithTeams.find((d) => d.slug === "exco");
  const departmentCards = departmentsWithTeams.filter((d) => d.slug !== "exco");
  const aboutImage = settings.about_image || "/images/committee1.jpg";

  return (
    <>
      <InnerPageHero
        image="/images/backround.JPG"
        title="About AL-QISC"
        description="Learn about our purpose, values, and the community behind the club."
        imagePosition="center 48%"
      />

      {/* About Section */}
      <section className="py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
            {/* Both layers use the committee image managed from admin settings. */}
            <figure className="relative mx-auto min-h-[410px] w-full max-w-[650px] sm:min-h-[480px] lg:min-h-[520px]">
              <div className="absolute left-0 top-0 h-[72%] w-[72%] overflow-hidden rounded-2xl bg-[var(--light)] shadow-[0_12px_32px_rgba(15,23,42,0.10)]">
                <Image
                  src={aboutImage}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 72vw, 36vw"
                  className="scale-110 object-cover object-[center_58%] blur-[3px]"
                />
              </div>
              <div className="absolute bottom-0 right-0 aspect-[4/3] w-[84%] overflow-hidden rounded-2xl border-4 border-white bg-[var(--light)] shadow-[0_18px_45px_rgba(15,23,42,0.14)]">
                <Image
                  src={aboutImage}
                  alt="AL-QISC committee at Albukhary International University"
                  fill
                  sizes="(max-width: 1024px) 84vw, 42vw"
                  className="object-cover object-[center_58%]"
                />
              </div>
            </figure>

            {/* Content */}
            <div>
              <h5 className="text-[var(--primary)] font-semibold uppercase tracking-wider text-sm mb-2">
                About Us
              </h5>
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-[var(--dark)] mb-6">
                The AL-QIsC Background
              </h2>
              <div className="space-y-4 text-[var(--gray)] leading-relaxed">
                {(settings.about_text || `ALQISC stands for Al-Qur'an and Islamic Club. Our aim is to encourage students to learn and teach the Holy Quran, inspired by the words of our Prophet (Sallallaahu 'alaihi wa sallam), who said, "The best of you are the ones who learn the Qur'an and teach it to others" [Al-Bukhari].

The Al-Qur'an and Islamic Club (ALQISC) at Albukhary International University is dedicated to nurturing spiritual growth and promoting Islamic knowledge. Our club offers a range of programs, including Qur'an recitation and practice sessions with a focus on proper Tajweed and Makhraj.

We organize engaging classes, inspiring talks by guest speakers from around the world, and enriching events such as Qur'anic competitions and Iftar gatherings during Ramadan. These initiatives are open to students, staff, and the wider community, fostering an inclusive environment for learning and reflection.

Through our activities, we aim to inspire a deeper connection to Islam, cultivate a sense of unity, and enrich our lives with knowledge and spirituality for success in this world and the hereafter.`).split("\n\n").map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
              <Link
                href="#organization-chart"
                className="mt-8 inline-flex items-center btn-secondary"
              >
                Read more
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="bg-[url('/images/visionbg.jpg')] bg-cover bg-center py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <SectionHeader
            subtitle="Our Objectives"
            title="Mission and Vision"
            align="center"
          />

          <div className="mx-auto mt-10 grid max-w-6xl gap-6 md:mt-12 md:grid-cols-2 lg:gap-8">
            {/* Mission Card */}
            <div className="rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)]/95 p-7 text-center shadow-sm sm:p-9 lg:p-10">
              <i
                className="fas fa-seedling mx-auto mb-5 text-6xl leading-none text-[var(--primary)] md:text-7xl"
                aria-hidden="true"
              />
              <h3 className="font-heading text-2xl font-bold text-[var(--dark)] mb-4">
                Mission
              </h3>
              <p className="text-[var(--gray)] leading-relaxed">
                {settings.mission_text || "To promote Islamic values and teachings through meaningful activities by enhancing understanding of the Quran, empowering young Islamic leaders to serve their communities, fostering an inclusive and welcoming environment, and strengthening brotherhood and sisterhood through collaboration."}
              </p>
            </div>

            {/* Vision Card */}
            <div className="rounded-2xl border border-[var(--primary)]/10 bg-[var(--light)]/95 p-7 text-center shadow-sm sm:p-9 lg:p-10">
              <i
                className="fas fa-dove mx-auto mb-5 text-6xl leading-none text-[var(--primary)] md:text-7xl"
                aria-hidden="true"
              />
              <h3 className="font-heading text-2xl font-bold text-[var(--dark)] mb-4">
                Vision
              </h3>
              <p className="text-[var(--gray)] leading-relaxed">
                {settings.vision_text || "To become a distinguished platform for fostering Islamic education and community engagement, inspiring a deep love for the Quran and its teachings, and uniting a diverse Ummah through collaborative and spiritually enriching activities."}
              </p>
              <p className="mt-4 text-sm italic text-[var(--gray)]">
                Guided by Aqidah, Akhlaq, Adab, Amanah, and Amalan principles.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Advisor Section */}
      <section className="py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <SectionHeader
            subtitle="Meet Our Advisor"
            title="Guidance and Support"
            align="center"
          />

          <div className="mx-auto mt-10 grid max-w-5xl items-center gap-10 md:mt-12 md:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)] md:gap-14">
            {/* Advisor Image */}
            <div className="mx-auto h-64 w-64 overflow-hidden rounded-full border-4 border-white shadow-md md:h-72 md:w-72">
              <Image
                src={settings.advisor_image || "/images/Advicer.jpeg"}
                alt={`${settings.advisor_name || "Mr. Osaid"} - ${settings.advisor_title || "Advisor"}`}
                width={256}
                height={256}
                className="w-full h-full object-cover"
              />
            </div>

            {/* Advisor Details */}
            <div className="max-w-lg text-center md:text-left">
              <h3 className="font-heading text-2xl font-bold text-[var(--dark)] mb-2">
                {settings.advisor_name || "Mr. Osaid"}
              </h3>
              <p className="text-[var(--primary)] font-semibold text-lg mb-4">
                {settings.advisor_title || "Advisor"}
              </p>
              <p className="text-[var(--gray)] leading-relaxed">
                {settings.advisor_description || "Mr. Osaid provides invaluable guidance and mentorship to the Al-Qur'an and Islamic Club (AL-QISC). With a wealth of experience and knowledge, he plays a pivotal role in steering the club toward achieving its mission and goals. His dedication and wisdom are a cornerstone of the club's success."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Organization Chart */}
      <section id="organization-chart" className="bg-[var(--light)] py-20 md:py-24 lg:py-28">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <SectionHeader
            subtitle="Leadership & Departments"
            title="Organization Chart"
            align="center"
            description="Meet the full AL-QISC team structure, from executive leadership to every department member."
          />

          <OrganizationChart
            executiveCommittee={executiveCommittee}
            departments={departmentCards}
          />
        </div>
      </section>
    </>
  );
}
