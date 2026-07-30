import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Account/auth flows and API routes have no search-relevant content —
      // letting them be crawled just wastes crawl budget on pages that
      // either require a login or return non-HTML responses.
      disallow: [
        "/login",
        "/signup",
        "/forgot-password",
        "/reset-password",
        "/dashboard",
        "/auth/",
        "/api/",
      ],
    },
    sitemap: "https://www.gojli.com/sitemap.xml",
  };
}
