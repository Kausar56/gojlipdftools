import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedPostBySlug, estimateReadingMinutes } from "@/lib/blog";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return {};

  const title = post.metaTitle || post.title;
  const description = post.metaDescription || post.excerpt || post.title;

  return {
    title,
    description,
    keywords: post.tags.length > 0 ? post.tags : undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title,
      description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      modifiedTime: post.updatedAt,
      // Always "Gojli Team" — a specific staff member's name never appears
      // on public-facing pages, regardless of who actually wrote the post.
      authors: ["Gojli Team"],
      tags: post.tags.length > 0 ? post.tags : undefined,
      images: post.thumbnailUrl ? [{ url: post.thumbnailUrl }] : undefined,
    },
    twitter: {
      card: post.thumbnailUrl ? "summary_large_image" : "summary",
      title,
      description,
      images: post.thumbnailUrl ? [post.thumbnailUrl] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) notFound();

  const readingMinutes = estimateReadingMinutes(post.contentHtml);
  // Always "Gojli Team" — a specific staff member's name never appears on
  // public-facing pages, regardless of who actually wrote the post (see
  // post.authorName, which stays admin-only in AdminBlogTable/BlogPostEditor).
  const authorName = "Gojli Team";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt ?? undefined,
    image: post.thumbnailUrl ?? undefined,
    keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
    datePublished: post.publishedAt ?? post.createdAt,
    dateModified: post.updatedAt,
    author: { "@type": "Organization", name: authorName },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://www.gojli.com/blog/${post.slug}` },
    publisher: { "@type": "Organization", name: "Gojli" },
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.gojli.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.gojli.com/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: `https://www.gojli.com/blog/${post.slug}` },
    ],
  };

  return (
    <article className="mx-auto max-w-3xl px-4 py-14 sm:px-8">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <nav className="text-xs text-base-content/50">
        <Link href="/blog" className="hover:text-primary">
          Blog
        </Link>
      </nav>

      <h1 className="mt-2 text-3xl font-semibold text-base-content sm:text-4xl">{post.title}</h1>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-sm text-base-content/50">
        <span>{authorName}</span>
        {post.publishedAt && (
          <>
            <span>·</span>
            <span>
              {new Date(post.publishedAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </>
        )}
        <span>·</span>
        <span>{readingMinutes} min read</span>
      </div>

      {post.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span key={tag} className="badge badge-outline badge-sm">
              {tag}
            </span>
          ))}
        </div>
      )}

      {post.thumbnailUrl && (
        <div className="relative mt-6 h-64 w-full overflow-hidden rounded-xl bg-base-200 sm:h-96">
          <Image src={post.thumbnailUrl} alt={post.title} fill className="object-cover" priority />
        </div>
      )}

      <div
        className="prose prose-neutral mt-8 max-w-none dark:prose-invert"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  );
}
