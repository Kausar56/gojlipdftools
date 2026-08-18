import { NextResponse } from "next/server";
import { getCurrentViewerAccess, hasPermission } from "@/lib/adminAuth";
import { createUploadSignature } from "@/lib/cloudinary";

// Same permission gate as app/admin/tool-content/actions.ts — a real admin
// always has it, a moderator needs "tool_content:edit" granted explicitly.
export async function POST() {
  try {
    const { access } = await getCurrentViewerAccess();
    if (!hasPermission(access, "tool_content:edit")) {
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
