import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getPublishedPosts } from "@/lib/blog";

const description = "Guides, tips, and updates from the Gojli team.";

export const metadata: Metadata = {
  title: "Blog",
  description,
  alternates: { canonical: "/blog" },
  openGraph: { title: "Blog", description, url: "/blog" },
  twitter: { title: "Blog", description },
};

export default async function BlogIndexPage() {
  const posts = await getPublishedPosts();

  return (
    <div className="mx-auto max-w-4xl px-4 py-14 sm:px-8">
      <h1 className="text-3xl font-semibold text-base-content sm:text-4xl">Blog</h1>
      <p className="mt-2 text-base-content/70">{description}</p>

      {posts.length === 0 ? (
        <p className="mt-10 text-base-content/60">No posts published yet — check back soon.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.id}
              href={`/blog/${post.slug}`}
              className="group card overflow-hidden border border-base-300 bg-base-100 transition hover:shadow-lg"
            >
              {post.thumbnailUrl && (
                <div className="relative h-40 w-full bg-base-200">
                  <Image src={post.thumbnailUrl} alt={post.title} fill className="object-cover" />
                </div>
              )}
              <div className="p-4">
                <h2 className="font-semibold text-base-content group-hover:text-primary">{post.title}</h2>
                {post.excerpt && <p className="mt-1.5 line-clamp-2 text-sm text-base-content/60">{post.excerpt}</p>}
                {post.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {post.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="badge badge-outline badge-xs">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 flex items-center gap-1.5 text-xs text-base-content/40">
                  {/* Always "Gojli Team" regardless of who actually wrote the
                      post — visitors never see a specific staff member's name. */}
                  <span>Gojli Team</span>
                  {post.publishedAt && <span>·</span>}
                  {post.publishedAt && (
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
