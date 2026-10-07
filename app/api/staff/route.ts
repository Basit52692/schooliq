import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();

    // Logged-in user's Supabase client
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
              cookiesToSet.forEach(
                ({ name, value, options }) =>
                  cookieStore.set(
                    name,
                    value,
                    options
                  )
              );
            } catch {
              // Safe to ignore in route context
            }
          },
        },
      }
    );

    // Verify current logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Get current admin profile
    const { data: adminProfile, error: profileError } =
      await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("id", user.id)
        .single();

    if (profileError || !adminProfile) {
      return NextResponse.json(
        { error: "Admin profile not found." },
        { status: 403 }
      );
    }

    // Only school_admin can create school staff
    if (adminProfile.role !== "school_admin") {
      return NextResponse.json(
        {
          error:
            "You are not authorized to create staff accounts.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const fullName = String(
      body.full_name ?? ""
    ).trim();

    const email = String(
      body.email ?? ""
    )
      .trim()
      .toLowerCase();

    const phone = String(
      body.phone ?? ""
    ).trim();

    const password = String(
      body.password ?? ""
    );

    const role = String(
      body.role ?? ""
    );

    if (!fullName || !email || !password) {
      return NextResponse.json(
        {
          error:
            "Full name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (
      role !== "teacher" &&
      role !== "accountant"
    ) {
      return NextResponse.json(
        {
          error:
            "Role must be Teacher or Accountant.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          error:
            "Temporary password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // Server-only admin client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Create Auth account
    const {
      data: createdUser,
      error: createUserError,
    } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (
      createUserError ||
      !createdUser.user
    ) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ??
            "Unable to create user.",
        },
        { status: 400 }
      );
    }

    // Create profile linked to same school
    const { error: insertProfileError } =
      await adminClient
        .from("profiles")
        .insert({
          id: createdUser.user.id,
          school_id:
            adminProfile.school_id,
          full_name: fullName,
          email,
          phone: phone || null,
          role,
          status: "Active",
        });

    // Roll back Auth user if profile failed
    if (insertProfileError) {
      await adminClient.auth.admin.deleteUser(
        createdUser.user.id
      );

      return NextResponse.json(
        {
          error:
            insertProfileError.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Staff account created successfully.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while creating staff account.",
      },
      { status: 500 }
    );
  }
}
export async function PATCH(request: Request) {
  try {
    const cookieStore = await cookies();

    // Logged-in user's client
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
              cookiesToSet.forEach(
                ({ name, value, options }) =>
                  cookieStore.set(
                    name,
                    value,
                    options
                  )
              );
            } catch {
              // Safe to ignore here
            }
          },
        },
      }
    );

    // Current logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    // Current admin profile
    const { data: adminProfile, error: adminError } =
      await supabase
        .from("profiles")
        .select("school_id, role")
        .eq("id", user.id)
        .single();

    if (adminError || !adminProfile) {
      return NextResponse.json(
        { error: "Admin profile not found." },
        { status: 403 }
      );
    }

    // Only School Admin
    if (adminProfile.role !== "school_admin") {
      return NextResponse.json(
        {
          error:
            "You are not authorized to manage staff.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const staffId = String(
      body.staff_id ?? ""
    ).trim();

    const fullName = String(
      body.full_name ?? ""
    ).trim();

    const phone = String(
      body.phone ?? ""
    ).trim();

    const role = String(
      body.role ?? ""
    );

    const newPassword = String(
      body.password ?? ""
    );

    if (!staffId) {
      return NextResponse.json(
        { error: "Staff ID is required." },
        { status: 400 }
      );
    }

    if (!fullName) {
      return NextResponse.json(
        { error: "Full name is required." },
        { status: 400 }
      );
    }

    if (
      role !== "teacher" &&
      role !== "accountant"
    ) {
      return NextResponse.json(
        {
          error:
            "Role must be Teacher or Accountant.",
        },
        { status: 400 }
      );
    }

    if (
      newPassword &&
      newPassword.length < 8
    ) {
      return NextResponse.json(
        {
          error:
            "New password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    // Server-only privileged client
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SECRET_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Verify target staff member
    const {
      data: targetStaff,
      error: targetError,
    } = await adminClient
      .from("profiles")
      .select("id, school_id, role")
      .eq("id", staffId)
      .single();

    if (targetError || !targetStaff) {
      return NextResponse.json(
        { error: "Staff member not found." },
        { status: 404 }
      );
    }

    // Cannot manage another school's staff
    if (
      targetStaff.school_id !==
      adminProfile.school_id
    ) {
      return NextResponse.json(
        {
          error:
            "You cannot manage this staff member.",
        },
        { status: 403 }
      );
    }

    // Only Teacher / Accountant can be edited here
    if (
      targetStaff.role !== "teacher" &&
      targetStaff.role !== "accountant"
    ) {
      return NextResponse.json(
        {
          error:
            "Only Teacher or Accountant accounts can be edited.",
        },
        { status: 403 }
      );
    }

    // Update profile
    const { error: updateProfileError } =
      await adminClient
        .from("profiles")
        .update({
          full_name: fullName,
          phone: phone || null,
          role,
        })
        .eq("id", staffId);

    if (updateProfileError) {
      return NextResponse.json(
        {
          error:
            updateProfileError.message,
        },
        { status: 400 }
      );
    }

    // Reset password only when admin entered one
    if (newPassword) {
      const { error: passwordError } =
        await adminClient.auth.admin.updateUserById(
          staffId,
          {
            password: newPassword,
          }
        );

      if (passwordError) {
        return NextResponse.json(
          {
            error:
              "Profile updated, but password reset failed: " +
              passwordError.message,
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: newPassword
        ? "Staff profile and password updated successfully."
        : "Staff profile updated successfully.",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Something went wrong while updating staff.",
      },
      { status: 500 }
    );
  }
}