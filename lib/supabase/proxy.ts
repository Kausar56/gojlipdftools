import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { tools } from "@/lib/tools";

const TOOL_SLUGS = new Set(tools.map((tool) => tool.slug));

/** Refreshes the Supabase auth session cookie on every request, and blocks a
 *  banned account from using any tool page — see app/admin/users/actions.ts's
 *  banUser for why this checks app_metadata.banned instead of just relying
 *  on Supabase's own sign-in rejection: a banned user should still be able
 *  to reach their dashboard and message support, just not run any tool.
 *  Called from the root proxy.ts. */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options));
      },
    },
  });

  // Do not remove — refreshes the session and must run before any Server Component reads it.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.app_metadata?.banned === true) {
    const slug = request.nextUrl.pathname.replace(/^\/|\/$/g, "");
    if (TOOL_SLUGS.has(slug)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}
