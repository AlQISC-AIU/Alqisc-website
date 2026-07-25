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
    <section className="relative isolate grid min-h-svh place-items-center overflow-hidden bg-[var(--primary)] px-5 pt-24 sm:px-6 md:pt-28 lg:px-8">
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover"
        style={{ objectPosition: imagePosition }}
      />
      <div className="absolute inset-0 -z-10 bg-black/65" aria-hidden="true" />
      <div className="mx-auto max-w-3xl py-12 text-center">
        <h1 className="text-balance font-heading text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
          {title}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-balance text-base leading-7 text-white/85 sm:text-lg">
          {description}
        </p>
      </div>
    </section>
  );
}
