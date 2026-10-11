import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

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

    // 1. Verify authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in." },
        { status: 401 }
      );
    }

    // 2. Fetch Profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, school_id, role, student_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile not found." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    let targetStudentId = profile.student_id;

    // Allow admin testing if no student_id attached
    if (!targetStudentId && (profile.role === "school_admin" || profile.role === "super_admin")) {
      targetStudentId = body.student_id;
    }

    if (!targetStudentId) {
      return NextResponse.json(
        { error: "No student profile is linked to this account." },
        { status: 400 }
      );
    }

    // 3. Fetch student record to get class_id & section_id
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("id, school_id, class_id, section_id")
      .eq("id", targetStudentId)
      .single();

    if (studentError || !student) {
      return NextResponse.json(
        { error: "Student record not found." },
        { status: 404 }
      );
    }

    // 4. Save attendance matching exact database schema
    const todayDate = getLocalDateString();
    const { data, error: attError } = await supabase
      .from("attendance")
      .upsert(
        {
          school_id: student.school_id,
          student_id: student.id,
          attendance_date: todayDate,
          status: "Present",
          remarks: "Self-marked via Facial Recognition",
          marked_by: user.id,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "student_id,attendance_date",
        }
      )
      .select()
      .maybeSingle();

    if (attError) {
      console.error("API attendance upsert error:", attError);
      return NextResponse.json(
        { error: attError.message || "Failed to record attendance in database." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance marked as Present successfully.",
      data,
    });
  } catch (err: unknown) {
    console.error("Server attendance error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Internal server error saving attendance.",
      },
      { status: 500 }
    );
  }
}
