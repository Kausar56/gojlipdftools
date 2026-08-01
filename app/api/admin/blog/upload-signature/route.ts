import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/adminAuth";
import { createUploadSignature } from "@/lib/cloudinary";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user || !isAdminEmail(data.user.email)) {
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
