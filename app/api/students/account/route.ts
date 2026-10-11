import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // Logged-in caller's Supabase client
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Ignore in route context
            }
          },
        },
      }
    );

    // 1. Verify current logged-in caller
    const {
      data: { user: callerUser },
      error: callerError,
    } = await supabase.auth.getUser();

    if (callerError || !callerUser) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Verify caller has permission (admin or teacher)
    const { data: callerProfile, error: profileError } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", callerUser.id)
      .single();

    if (profileError || !callerProfile) {
      return NextResponse.json(
        { error: "Caller profile not found." },
        { status: 403 }
      );
    }

    const allowedRoles = ["school_admin", "super_admin", "teacher"];
    if (!allowedRoles.includes(callerProfile.role)) {
      return NextResponse.json(
        { error: "You are not authorized to create student accounts." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const studentId = String(body.student_id ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "12345678").trim();

    if (!studentId || !email) {
      return NextResponse.json(
        { error: "Student ID and email are required." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    // 3. Verify student exists in this school
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, first_name, last_name, school_id")
      .eq("id", studentId)
      .eq("school_id", callerProfile.school_id)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student not found in this school." },
        { status: 404 }
      );
    }

    // 4. Check if student already has a portal profile
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("student_id", studentId)
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        {
          error: `A portal account already exists for this student with email: ${existingProfile.email}`,
        },
        { status: 400 }
      );
    }

    const fullName = `${student.first_name} ${student.last_name ?? ""}`.trim();

    // 5. Create Auth Account
    let newUserId: string | null = null;
    let adminClient: ReturnType<typeof createClient> | null = null;
    const secretKey = process.env.SUPABASE_SECRET_KEY;

    if (secretKey) {
      // Method A: Admin API (pre-confirms email instantly)
      adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        secretKey,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const { data: created, error: adminErr } =
        await adminClient.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: fullName,
            role: "student",
          },
        });

      if (adminErr || !created.user) {
        // If user already exists in Supabase Auth (e.g. from previous attempt)
        if (
          adminErr?.message?.toLowerCase().includes("already") ||
          adminErr?.message?.toLowerCase().includes("registered")
        ) {
          const { data: userList } = await adminClient.auth.admin.listUsers();
          const existingAuthUser = userList?.users?.find(
            (u) => u.email?.toLowerCase() === email.toLowerCase()
          );

          if (existingAuthUser) {
            newUserId = existingAuthUser.id;
            // Update password to 12345678 and set metadata
            await adminClient.auth.admin.updateUserById(existingAuthUser.id, {
              password,
              email_confirm: true,
              user_metadata: {
                full_name: fullName,
                role: "student",
              },
            });
          } else {
            return NextResponse.json(
              { error: adminErr?.message || "User already exists in authentication." },
              { status: 400 }
            );
          }
        } else {
          return NextResponse.json(
            { error: adminErr?.message || "Failed to create user auth account." },
            { status: 400 }
          );
        }
      } else {
        newUserId = created.user.id;
      }
    } else {
      // Method B: Public sign-up client (when secret key not configured in .env)
      const standaloneClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        }
      );

      const { data: signUpData, error: signUpErr } =
        await standaloneClient.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              role: "student",
            },
          },
        });

      if (signUpErr || !signUpData.user) {
        return NextResponse.json(
          { error: signUpErr?.message || "Failed to sign up student account." },
          { status: 400 }
        );
      }

      newUserId = signUpData.user.id;
    }

    if (!newUserId) {
      return NextResponse.json(
        { error: "Could not obtain user ID from authentication." },
        { status: 500 }
      );
    }

    // 6. Insert profile linked to student (using admin client to bypass RLS when available)
    const profileClient = adminClient ?? supabase;

    const { error: insertProfileError } = await profileClient
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          school_id: student.school_id,
          student_id: student.id,
          full_name: fullName,
          email,
          role: "student",
          status: "Active",
        },
        { onConflict: "id" }
      );

    if (insertProfileError) {
      console.error("Profile insert error:", insertProfileError);

      // Rollback auth user if profile insertion failed
      if (adminClient && newUserId) {
        await adminClient.auth.admin.deleteUser(newUserId).catch(() => {});
      }

      return NextResponse.json(
        {
          error:
            insertProfileError.message ||
            "Failed to save student profile link in database.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student portal account created successfully with default password: " + password,
      email,
      student_id: student.id,
    });
  } catch (err: unknown) {
    console.error("Create student account error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal error creating student account.",
      },
      { status: 500 }
    );
  }
}
