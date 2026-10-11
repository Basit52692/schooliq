import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          supabaseResponse = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(
            ({ name, value, options }) =>
              supabaseResponse.cookies.set(
                name,
                value,
                options
              )
          );
        },
      },
    }
  );

  // Verify logged-in user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Allow static test page without mandatory auth
  if (pathname === "/test-face" || pathname.startsWith("/test-face/")) {
    return supabaseResponse;
  }

  // Allow API routes to be handled by route handlers
  if (pathname.startsWith("/api/")) {
    return supabaseResponse;
  }

  // ==============================
  // NOT LOGGED IN
  // ==============================

  if (!user) {
    if (pathname !== "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // ==============================
  // GET USER ROLE
  // ==============================

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const status = profile?.status;

  // Inactive users cannot access the system
  if (
    role !== "school_admin" &&
    role !== "super_admin" &&
    status !== "Active"
  ) {
    await supabase.auth.signOut();

    const url = request.nextUrl.clone();
    url.pathname = "/login";

    const redirectResponse = NextResponse.redirect(url);

    supabaseResponse.cookies
      .getAll()
      .forEach((cookie) => {
        redirectResponse.cookies.set(cookie);
      });

    return redirectResponse;
  }

  // If profile/role is missing
  if (!role) {
    await supabase.auth.signOut();

    const url = request.nextUrl.clone();
    url.pathname = "/login";

    return NextResponse.redirect(url);
  }

  // ==============================
  // LOGGED IN USER ON LOGIN PAGE
  // ==============================

  if (pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = role === "student" ? "/portal" : "/";
    return NextResponse.redirect(url);
  }

  // ==============================
  // STUDENT ROLE ACCESS RULES
  // ==============================

  if (role === "student") {
    if (pathname === "/portal" || pathname.startsWith("/portal/")) {
      return supabaseResponse;
    }

    // Students cannot access admin/staff dashboard routes
    const url = request.nextUrl.clone();
    url.pathname = "/portal";
    return NextResponse.redirect(url);
  }

  // ==============================
  // NON-STUDENT ACCESS TO PORTAL
  // ==============================

  if (
    (pathname === "/portal" || pathname.startsWith("/portal/")) &&
    role !== "school_admin" &&
    role !== "super_admin"
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // ==============================
  // ROLE ACCESS RULES (STAFF)
  // ==============================

  const adminOnlyRoutes = [
    "/settings",
  ];

  const teacherBlockedRoutes = [
    "/fees",
    "/reports",
    "/staff",
    "/settings",
  ];

  const accountantBlockedRoutes = [
    "/students",
    "/classes",
    "/attendance",
    "/staff",
    "/settings",
  ];

  // SCHOOL ADMIN + SUPER ADMIN
  if (
    role === "school_admin" ||
    role === "super_admin"
  ) {
    return supabaseResponse;
  }

  // TEACHER
  if (role === "teacher") {
    // Teacher cannot create or edit students
    const teacherStudentWriteRoute =
      pathname === "/students/new" ||
      /^\/students\/[^/]+\/edit$/.test(pathname);

    if (teacherStudentWriteRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/";

      return NextResponse.redirect(url);
    }

    const blocked = teacherBlockedRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

    if (blocked) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // ACCOUNTANT
  if (role === "accountant") {
    const blocked = accountantBlockedRoutes.some(
      (route) =>
        pathname === route ||
        pathname.startsWith(`${route}/`)
    );

    if (blocked) {
      const url = request.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return supabaseResponse;
  }

  // Unknown role → safest option
  const url = request.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|models/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp|bin|json)$).*)",
  ],
};