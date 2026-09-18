import Image from "next/image";

interface InnerPageHeroProps {
  title: string;
  description: string;
  image: string;
  imagePosition?: string;
}

export function InnerPageHero({
  title,
  description,
  image,
  imagePosition = "center",
}: InnerPageHeroProps) {
  return (
    <section className="relative isolate grid min-h-[520px] place-items-center overflow-hidden bg-[var(--primary)] px-5 pb-20 pt-16 sm:min-h-[580px] sm:px-6 sm:pb-24 lg:min-h-[620px] lg:px-8">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover"
        style={{ objectPosition: imagePosition }}
      />
      <div
        className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,rgba(10,53,72,0.88)_0%,rgba(32,88,112,0.72)_48%,rgba(4,30,43,0.62)_100%)]"
        aria-hidden="true"
      />
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h1 className="text-balance font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-white/85 sm:text-lg">
          {description}
        </p>
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
  );
}
