import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getPostBySlug } from "@/lib/firebase/blog";
import { Calendar, User, ArrowLeft, ArrowRight, Tag } from "lucide-react";
import { sanitizeRichText } from "@/lib/sanitize-rich-text";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const post = await getPostBySlug(slug);
    if (!post) return { title: "Post Not Found" };

    return {
      title: post.title,
      description: post.excerpt || "Read this article on the Al-QIsc Club blog.",
      openGraph: post.featured_image_url ? { images: [post.featured_image_url] } : undefined,
      alternates: { canonical: `/blog/${post.slug}` },
    };
  } catch {
    return { title: "Blog Post" };
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug).catch(() => null);

  if (!post || post.status !== "published") notFound();

  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Recently published";

  return (
    <main className="min-h-screen bg-white">
      <section className="relative flex min-h-[520px] items-end overflow-hidden pb-16 pt-32 md:min-h-[600px] md:pb-20 md:pt-36">
        {post.featured_image_url ? (
          <Image
            src={post.featured_image_url}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <Image
            src="/images/backround.JPG"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black/65" aria-hidden="true" />
        <div className="container relative mx-auto px-5 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm font-medium text-white/80 transition-colors hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Blog
            </Link>
            {post.category && (
              <p className="mt-8 inline-flex rounded-full bg-[var(--secondary)] px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--dark)]">
                {post.category}
              </p>
            )}
            <h1 className="mt-4 text-balance font-heading text-4xl font-bold leading-tight text-white md:text-5xl lg:text-6xl">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-white/80">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4 text-[var(--secondary)]" />
                {post.author || "AL-QISC Club"}
              </span>
              <span className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[var(--secondary)]" />
                {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </section>

      <article className="py-16 md:py-20 lg:py-24">
        <div className="container mx-auto px-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl">
            {post.excerpt && (
              <p className="border-l-4 border-[var(--secondary)] pl-5 text-xl font-medium leading-relaxed text-[var(--dark)] md:pl-6 md:text-2xl">
                {post.excerpt}
              </p>
            )}

            <div className="prose prose-lg mt-10 max-w-none prose-headings:font-heading prose-headings:font-bold prose-headings:text-[var(--dark)] prose-p:leading-8 prose-a:text-[var(--primary)] prose-img:rounded-2xl">
              <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content || "") }} />
            </div>

            <footer className="mt-14 flex flex-col gap-5 border-t border-[var(--primary)]/10 pt-7 sm:flex-row sm:items-center sm:justify-between">
              {post.category ? (
                <div className="flex items-center gap-2 text-sm text-[var(--gray)]">
                  <Tag className="h-4 w-4 text-[var(--primary)]" />
                  <span>Filed under</span>
                  <span className="font-semibold text-[var(--dark)]">{post.category}</span>
                </div>
              ) : <span />}
              <Link href="/blog" className="inline-flex items-center gap-2 font-semibold text-[var(--primary)] hover:text-[var(--primary-dark)]">
                Explore more articles <ArrowRight className="h-4 w-4" />
              </Link>
            </footer>
          </div>
        </div>
      </article>
    </main>
  );
}
