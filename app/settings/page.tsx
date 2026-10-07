"use client";

import { useEffect, useState } from "react";

import {
  Building2,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);

  const [profileSaving, setProfileSaving] =
    useState(false);

  const [schoolSaving, setSchoolSaving] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [userId, setUserId] = useState("");
  const [schoolId, setSchoolId] = useState("");

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("");

  const [schoolName, setSchoolName] = useState("");
  const [schoolCode, setSchoolCode] = useState("");

  /*
  ==========================================
  LOAD SETTINGS
  ==========================================
  */

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      setError("");

      const supabase = createClient();

      // Logged-in user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError(
          "Unable to load logged-in user."
        );

        setLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      // Profile
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from("profiles")
        .select(
          "full_name, phone, role, school_id"
        )
        .eq("id", user.id)
        .single();

      if (
        profileError ||
        !profile
      ) {
        setError(
          profileError?.message ??
            "Profile not found."
        );

        setLoading(false);
        return;
      }

      setFullName(
        profile.full_name ?? ""
      );

      setPhone(
        profile.phone ?? ""
      );

      setRole(
        profile.role ?? ""
      );

      setSchoolId(
        profile.school_id ?? ""
      );

      // School
      if (profile.school_id) {
        const {
          data: school,
          error: schoolError,
        } = await supabase
          .from("schools")
          .select("name, code")
          .eq(
            "id",
            profile.school_id
          )
          .single();

        if (schoolError) {
          setError(
            schoolError.message
          );

          setLoading(false);
          return;
        }

        if (school) {
          setSchoolName(
            school.name ?? ""
          );

          setSchoolCode(
            school.code ?? ""
          );
        }
      }

      setLoading(false);
    }

    loadSettings();
  }, []);

  /*
  ==========================================
  SAVE ADMIN PROFILE
  ==========================================
  */

  async function saveProfile(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!fullName.trim()) {
      setError(
        "Full name is required."
      );

      return;
    }

    setProfileSaving(true);

    setMessage("");
    setError("");

    const supabase =
      createClient();

    const {
      error: updateError,
    } = await supabase
      .from("profiles")
      .update({
        full_name:
          fullName.trim(),

        phone:
          phone.trim() ||
          null,
      })
      .eq("id", userId);

    if (updateError) {
      setError(
        updateError.message
      );

      setProfileSaving(
        false
      );

      return;
    }

    setMessage(
      "Admin profile updated successfully."
    );

    setProfileSaving(false);
  }

  /*
  ==========================================
  SAVE SCHOOL
  ==========================================
  */

  async function saveSchool(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (
      !schoolName.trim()
    ) {
      setError(
        "School name is required."
      );

      return;
    }

    if (
      !schoolCode.trim()
    ) {
      setError(
        "School code is required."
      );

      return;
    }

    setSchoolSaving(true);

    setMessage("");
    setError("");

    const supabase =
      createClient();

    const {
      error: updateError,
    } = await supabase
      .from("schools")
      .update({
        name:
          schoolName.trim(),

        code:
          schoolCode
            .trim()
            .toUpperCase(),
      })
      .eq(
        "id",
        schoolId
      );

    if (updateError) {
      setError(
        updateError.message
      );

      setSchoolSaving(
        false
      );

      return;
    }

    setSchoolCode(
      schoolCode
        .trim()
        .toUpperCase()
    );

    setMessage(
      "School profile updated successfully."
    );

    setSchoolSaving(false);
  }

  /*
  ==========================================
  ROLE LABEL
  ==========================================
  */

  function readableRole(
    value: string
  ) {
    if (
      value ===
      "school_admin"
    ) {
      return "Administrator";
    }

    if (
      value ===
      "super_admin"
    ) {
      return "Super Admin";
    }

    if (
      value === "teacher"
    ) {
      return "Teacher";
    }

    if (
      value ===
      "accountant"
    ) {
      return "Accountant";
    }

    return value;
  }

  /*
  ==========================================
  LOADING
  ==========================================
  */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f4f7fb]">
        <Sidebar />

        <section className="ml-64 min-h-screen">
          <Navbar />

          <div className="flex min-h-[70vh] items-center justify-center p-4">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <Loader2 className="animate-spin" />

              Loading settings...
            </div>
          </div>
        </section>
      </main>
    );
  }

  /*
  ==========================================
  UI
  ==========================================
  */

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
      <Sidebar />

      <section className="ml-64 min-h-screen">
        <Navbar />

        <div className="p-4 sm:p-5 lg:p-7">
          {/* HEADER */}

          <div className="mb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Settings
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Manage your school
              and administrator
              information.
            </p>
          </div>

          {/* MESSAGES */}

          {message && (
            <div className="mb-5 break-words rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          {error && (
            <div className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* ==================================
              SETTINGS GRID
          ================================== */}

          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
            {/* ==============================
                SCHOOL PROFILE
            ============================== */}

            <form
              onSubmit={
                saveSchool
              }
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
              {/* CARD HEADER */}

              <div className="mb-5 flex min-w-0 items-start gap-3 sm:mb-6 sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                  <Building2
                    size={21}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold">
                    School Profile
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Basic
                    information about
                    your school.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* SCHOOL NAME */}

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium">
                    School Name
                  </label>

                  <input
                    value={
                      schoolName
                    }
                    onChange={(
                      e
                    ) =>
                      setSchoolName(
                        e.target
                          .value
                      )
                    }
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    placeholder="School name"
                  />
                </div>

                {/* SCHOOL CODE */}

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium">
                    School Code
                  </label>

                  <input
                    value={
                      schoolCode
                    }
                    onChange={(
                      e
                    ) =>
                      setSchoolCode(
                        e.target
                          .value
                      )
                    }
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm uppercase outline-none transition focus:border-blue-500"
                    placeholder="BFS001"
                  />

                  <p className="mt-2 break-words text-xs text-slate-400">
                    Unique code used
                    to identify this
                    school.
                  </p>
                </div>

                {/* SAVE */}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={
                      schoolSaving
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {schoolSaving ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save
                        size={17}
                      />
                    )}

                    {schoolSaving
                      ? "Saving..."
                      : "Save School"}
                  </button>
                </div>
              </div>
            </form>

            {/* ==============================
                ADMIN PROFILE
            ============================== */}

            <form
              onSubmit={
                saveProfile
              }
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
              {/* CARD HEADER */}

              <div className="mb-5 flex min-w-0 items-start gap-3 sm:mb-6 sm:items-center">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                  <UserRound
                    size={21}
                  />
                </div>

                <div className="min-w-0">
                  <h2 className="text-lg font-bold">
                    Administrator
                    Profile
                  </h2>

                  <p className="mt-0.5 text-sm text-slate-500">
                    Manage your
                    personal account
                    information.
                  </p>
                </div>
              </div>

              <div className="space-y-5">
                {/* FULL NAME */}

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium">
                    Full Name
                  </label>

                  <input
                    value={
                      fullName
                    }
                    onChange={(
                      e
                    ) =>
                      setFullName(
                        e.target
                          .value
                      )
                    }
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    placeholder="Full name"
                  />
                </div>

                {/* PHONE */}

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium">
                    Phone
                  </label>

                  <input
                    value={
                      phone
                    }
                    onChange={(
                      e
                    ) =>
                      setPhone(
                        e.target
                          .value
                      )
                    }
                    className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                    placeholder="03XXXXXXXXX"
                  />
                </div>

                {/* EMAIL */}

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium">
                    Email Address
                  </label>

                  <input
                    value={email}
                    disabled
                    className="w-full min-w-0 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Email is linked
                    with your login
                    account.
                  </p>
                </div>

                {/* ROLE */}

                <div className="min-w-0">
                  <label className="mb-2 block text-sm font-medium">
                    Role
                  </label>

                  <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <ShieldCheck
                      size={18}
                      className="shrink-0 text-blue-600"
                    />

                    <span className="min-w-0 break-words text-sm font-medium">
                      {readableRole(
                        role
                      )}
                    </span>
                  </div>
                </div>

                {/* SAVE */}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={
                      profileSaving
                    }
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                  >
                    {profileSaving ? (
                      <Loader2
                        size={17}
                        className="animate-spin"
                      />
                    ) : (
                      <Save
                        size={17}
                      />
                    )}

                    {profileSaving
                      ? "Saving..."
                      : "Save Profile"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}