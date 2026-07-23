"use client";

import { useEffect } from "react";
import { recordToolVisit } from "@/lib/recentTools";

export function RecentToolTracker({ slug }: { slug: string }) {
  useEffect(() => {
    recordToolVisit(slug);
  }, [slug]);

  return null;
}
