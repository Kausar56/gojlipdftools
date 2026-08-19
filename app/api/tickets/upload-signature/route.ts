import { NextResponse } from "next/server";
import { getCurrentViewerAccess } from "@/lib/adminAuth";
import { createUploadSignature } from "@/lib/cloudinary";

// Any signed-in user can get a signature here — not just staff — since a
// ticket's owner attaches files to their own messages too. Ownership/
// permission for which *ticket* an attachment ends up on is still enforced
// separately, in the reply/create Server Actions (app/dashboard/tickets/
// actions.ts and app/admin/tickets/actions.ts); this route only decides
// whether Cloudinary accepts the upload at all.
export async function POST() {
  try {
    const { user } = await getCurrentViewerAccess();
    if (!user) return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  } catch {
    return NextResponse.json({ error: "Not authorized." }, { status: 403 });
  }

  try {
    // Private ("authenticated") + restricted to what a support attachment
    // actually needs — see lib/cloudinary.ts's createUploadSignature.
    const payload = createUploadSignature("ticket-attachments", {
      type: "authenticated",
      allowedFormats: ["pdf", "jpg", "jpeg", "png"],
    });
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Couldn't create an upload signature." },
      { status: 500 },
    );
  }
}
