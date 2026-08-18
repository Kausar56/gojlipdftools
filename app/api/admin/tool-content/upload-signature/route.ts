import { NextResponse } from "next/server";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { createUploadSignature } from "@/lib/cloudinary";

// Tool-content editing is admin-only (see app/admin/tool-content/actions.ts)
// — same restriction here, not the broader "any moderator" check some other
// admin API routes use.
export async function POST() {
  try {
    const { access } = await getCurrentViewerAccess();
    if (access.kind !== "admin") {
      return NextResponse.json({ error: "Not authorized." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    const payload = createUploadSignature("tool-content");
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't create an upload signature." },
      { status: 500 },
    );
  }
}
