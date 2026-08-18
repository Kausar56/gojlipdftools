import { NextResponse } from "next/server";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { createUploadSignature } from "@/lib/cloudinary";

// Same permission gate as app/admin/blog/actions.ts's createPost/updatePost —
// a real admin always has it, a moderator needs "blog:create" granted
// explicitly. This used to only check isAdminEmail(), so a moderator with
// full blog access still got "Not authorized." the moment they tried to
// upload a thumbnail or an inline content image.
export async function POST() {
  try {
    const { access } = await getCurrentViewerAccess();
    if (!hasPermission(access, "blog:create")) {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const payload = createUploadSignature("blog-thumbnails");
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't create an upload signature." },
      { status: 500 },
    );
  }
}
