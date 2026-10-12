"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  KeyRound,
  Loader2,
  Save,
  ScanFace,
  ShieldCheck,
  UserRound,
  Users,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type SchoolClass = {
  id: string;
  name: string;
  status: string;
  sort_order: number | null;
};

type SchoolSection = {
  id: string;
  class_id: string;
  name: string;
  status: string;
};

export default function NewStudentPage() {
  const router = useRouter();

  const [schoolId, setSchoolId] =
    useState("");

  const [classes, setClasses] =
    useState<SchoolClass[]>([]);

  const [sections, setSections] =
    useState<SchoolSection[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
  ==========================================
  FORM
  ==========================================
  */

  const [admissionNo, setAdmissionNo] =
    useState("");

  const [firstName, setFirstName] =
    useState("");

  const [lastName, setLastName] =
    useState("");

  const [gender, setGender] =
    useState("");

  const [dateOfBirth, setDateOfBirth] =
    useState("");

  const [classId, setClassId] =
    useState("");

  const [sectionId, setSectionId] =
    useState("");

  const [admissionDate, setAdmissionDate] =
    useState("");

  const [guardianName, setGuardianName] =
    useState("");

  const [guardianPhone, setGuardianPhone] =
    useState("");

  const [guardianEmail, setGuardianEmail] =
    useState("");

  const [address, setAddress] =
    useState("");

  const [studentEmail, setStudentEmail] =
    useState("");

  const [status, setStatus] =
    useState("Active");

  /*
  ==========================================
  INITIAL LOAD
  ==========================================
  */

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    /*
    ------------------------------------------
    LOGGED-IN USER
    ------------------------------------------
    */

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

    /*
    ------------------------------------------
    PROFILE
    ------------------------------------------
    */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("school_id, role")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile
    ) {
      setError(
        profileError?.message ??
          "Unable to load user profile."
      );

      setLoading(false);
      return;
    }

    /*
    Extra UI protection.

    Proxy + RLS already protect writes,
    but this page should only be usable
    by School Admin / Super Admin.
    */

    if (
      profile.role !== "school_admin" &&
      profile.role !== "super_admin"
    ) {
      router.replace("/");
      return;
    }

    setSchoolId(
      profile.school_id
    );

    /*
    ------------------------------------------
    LOAD CLASSES
    ------------------------------------------
    */

    const {
      data: classData,
      error: classError,
    } = await supabase
      .from("classes")
      .select(`
        id,
        name,
        status,
        sort_order
      `)
      .eq(
        "school_id",
        profile.school_id
      )
      .eq(
        "status",
        "Active"
      )
      .order("sort_order", {
        ascending: true,
      })
      .order("name", {
        ascending: true,
      });

    if (classError) {
      setError(
        classError.message
      );

      setLoading(false);
      return;
    }

    /*
    ------------------------------------------
    LOAD SECTIONS
    ------------------------------------------
    */

    const {
      data: sectionData,
      error: sectionError,
    } = await supabase
      .from("sections")
      .select(`
        id,
        class_id,
        name,
        status
      `)
      .eq(
        "school_id",
        profile.school_id
      )
      .eq(
        "status",
        "Active"
      )
      .order("name", {
        ascending: true,
      });

    if (sectionError) {
      setError(
        sectionError.message
      );

      setLoading(false);
      return;
    }

    setClasses(
      (classData ??
        []) as SchoolClass[]
    );

    setSections(
      (sectionData ??
        []) as SchoolSection[]
    );

    setLoading(false);
  }

  /*
  ==========================================
  FILTERED SECTIONS
  ==========================================
  */

  const availableSections =
    useMemo(() => {
      if (!classId) {
        return [];
      }

      return sections.filter(
        (section) =>
          section.class_id ===
          classId
      );
    }, [sections, classId]);

  /*
  ==========================================
  CLASS CHANGE
  ==========================================
  */

  function handleClassChange(
    value: string
  ) {
    setClassId(value);

    /*
    Old section selection must be cleared
    when class changes.
    */

    setSectionId("");
  }

  /*
  ==========================================
  SAVE STUDENT
  ==========================================
  */

  async function saveStudent() {
    setError("");

    if (!schoolId) {
      setError(
        "School information is missing."
      );

      return;
    }

    if (!admissionNo.trim()) {
      setError(
        "Admission number is required."
      );

      return;
    }

    if (!firstName.trim()) {
      setError(
        "First name is required."
      );

      return;
    }

    if (!classId) {
      setError(
        "Please select a class."
      );

      return;
    }

    if (!sectionId) {
      setError(
        "Please select a section."
      );

      return;
    }

    if (!guardianName.trim()) {
      setError(
        "Guardian name is required."
      );

      return;
    }

    const selectedClass =
      classes.find(
        (item) =>
          item.id === classId
      );
    if (!studentEmail.trim()) {
  setError("Student Portal Email is required.");
  return;
}
    const selectedSection =
      sections.find(
        (item) =>
          item.id === sectionId
      );

    if (
      !selectedClass ||
      !selectedSection
    ) {
      setError(
        "Selected class or section is invalid."
      );

      return;
    }

    /*
    Safety check:
    selected section must actually belong
    to selected class.
    */

    if (
      selectedSection.class_id !==
      selectedClass.id
    ) {
      setError(
        "Selected section does not belong to this class."
      );

      return;
    }

    setSaving(true);

    const supabase =
      createClient();

    const {
      data,
      error: insertError,
    } = await supabase
      .from("students")
      .insert({
        school_id: schoolId,

        admission_no:
          admissionNo.trim(),

        first_name:
          firstName.trim(),

        last_name:
          lastName.trim() ||
          null,

        gender:
          gender || null,

        date_of_birth:
          dateOfBirth || null,

        class_id:
          selectedClass.id,

        section_id:
          selectedSection.id,

        admission_date:
          admissionDate ||
          null,

        guardian_name:
          guardianName.trim(),

        guardian_phone:
          guardianPhone.trim() ||
          null,

        guardian_email:
          guardianEmail.trim() ||
          null,

        address:
          address.trim() ||
          null,

        status,
      })
      .select("id")
      .single();

    if (insertError) {
      if (
        insertError.code ===
        "23505"
      ) {
        setError(
          "This admission number already exists in this school."
        );
      } else {
        setError(
          insertError.message
        );
      }

      setSaving(false);
      return;
    }

    if (!data?.id) {
      setError(
        "Student was saved but ID was not returned."
      );

      setSaving(false);
      return;
    }

    // Auto-create student portal account if email is provided
    if (studentEmail.trim()) {
      try {
        const accRes = await fetch("/api/students/account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: data.id,
            email: studentEmail.trim().toLowerCase(),
            password: "12345678",
          }),
        });

        const accData = await accRes.json().catch(() => ({}));

        if (!accRes.ok || accData.error) {
          setError(
            `Student record saved, but portal login account failed: ${accData.error || "Check database permissions."}`
          );
          setSaving(false);
          return;
        }
      } catch (e: unknown) {
        console.error("Auto-create student account error:", e);
        setError(
          `Student record saved, but network error occurred while creating portal account: ${e instanceof Error ? e.message : "Unknown error"}`
        );
        setSaving(false);
        return;
      }
    }

    router.push(
      `/students/${data.id}`
    );

    router.refresh();
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

              Loading student form...
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
          {/* BACK */}

          <Link
            href="/students"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft
              size={17}
            />

            Back to Students
          </Link>

          {/* HEADER */}

          <div className="mb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Add New Student
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Create a new student
              record and assign the
              student to a class and
              section.
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 break-words rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* DATABASE NOTICE */}

          <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
            <ShieldCheck
              size={19}
              className="mt-0.5 shrink-0"
            />

            <span className="min-w-0 break-words">
              Class and section are
              linked using secure
              database IDs. This
              keeps student records
              consistent even when
              class names are
              changed later.
            </span>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* ==================================
                PERSONAL INFORMATION
            ================================== */}

            <FormCard
              title="Personal Information"
              description="Basic details of the student."
              icon={
                <UserRound
                  size={20}
                />
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                <Field
                  label="Admission No."
                  required
                >
                  <input
                    value={
                      admissionNo
                    }
                    onChange={(
                      e
                    ) =>
                      setAdmissionNo(
                        e.target
                          .value
                      )
                    }
                    placeholder="e.g. BFS-1009"
                    className="input"
                  />
                </Field>

                <Field label="Status">
                  <select
                    value={
                      status
                    }
                    onChange={(
                      e
                    ) =>
                      setStatus(
                        e.target
                          .value
                      )
                    }
                    className="input"
                  >
                    <option value="Active">
                      Active
                    </option>

                    <option value="Inactive">
                      Inactive
                    </option>
                  </select>
                </Field>

                <Field
                  label="First Name"
                  required
                >
                  <input
                    value={
                      firstName
                    }
                    onChange={(
                      e
                    ) =>
                      setFirstName(
                        e.target
                          .value
                      )
                    }
                    placeholder="First name"
                    className="input"
                  />
                </Field>

                <Field label="Last Name">
                  <input
                    value={
                      lastName
                    }
                    onChange={(
                      e
                    ) =>
                      setLastName(
                        e.target
                          .value
                      )
                    }
                    placeholder="Last name"
                    className="input"
                  />
                </Field>

                <Field label="Gender">
                  <select
                    value={
                      gender
                    }
                    onChange={(
                      e
                    ) =>
                      setGender(
                        e.target
                          .value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select gender
                    </option>

                    <option value="Male">
                      Male
                    </option>

                    <option value="Female">
                      Female
                    </option>

                    <option value="Other">
                      Other
                    </option>
                  </select>
                </Field>

                <Field label="Date of Birth">
                  <input
                    type="date"
                    value={
                      dateOfBirth
                    }
                    onChange={(
                      e
                    ) =>
                      setDateOfBirth(
                        e.target
                          .value
                      )
                    }
                    className="input"
                  />
                </Field>
              </div>
            </FormCard>

            {/* ==================================
                ACADEMIC INFORMATION
            ================================== */}

            <FormCard
              title="Academic Information"
              description="Assign the student to a class and section."
              icon={
                <GraduationCap
                  size={20}
                />
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3">
                <Field
                  label="Class"
                  required
                >
                  <select
                    value={
                      classId
                    }
                    onChange={(
                      e
                    ) =>
                      handleClassChange(
                        e.target
                          .value
                      )
                    }
                    className="input"
                  >
                    <option value="">
                      Select class
                    </option>

                    {classes.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {
                            item.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field
                  label="Section"
                  required
                >
                  <select
                    value={
                      sectionId
                    }
                    onChange={(
                      e
                    ) =>
                      setSectionId(
                        e.target
                          .value
                      )
                    }
                    disabled={
                      !classId
                    }
                    className="input disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                  >
                    <option value="">
                      {classId
                        ? "Select section"
                        : "Select class first"}
                    </option>

                    {availableSections.map(
                      (item) => (
                        <option
                          key={
                            item.id
                          }
                          value={
                            item.id
                          }
                        >
                          {
                            item.name
                          }
                        </option>
                      )
                    )}
                  </select>
                </Field>

                <Field label="Admission Date">
                  <div className="relative min-w-0">
                    <CalendarDays
                      size={17}
                      className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400"
                    />

                    <input
                      type="date"
                      value={
                        admissionDate
                      }
                      onChange={(
                        e
                      ) =>
                        setAdmissionDate(
                          e.target
                            .value
                        )
                      }
                      className="input pl-10"
                    />
                  </div>
                </Field>
              </div>

              {classId &&
                availableSections.length ===
                  0 && (
                  <div className="mt-4 break-words rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                    This class does
                    not have an
                    active section.
                    Add a section
                    from Classes &
                    Sections first.
                  </div>
                )}
            </FormCard>

            {/* ==================================
                GUARDIAN INFORMATION
            ================================== */}

            <FormCard
              title="Guardian Information"
              description="Parent or guardian contact information."
              icon={
                <Users
                  size={20}
                />
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                <Field
                  label="Guardian Name"
                  required
                >
                  <input
                    value={
                      guardianName
                    }
                    onChange={(
                      e
                    ) =>
                      setGuardianName(
                        e.target
                          .value
                      )
                    }
                    placeholder="Guardian full name"
                    className="input"
                  />
                </Field>

                <Field label="Guardian Phone">
                  <input
                    value={
                      guardianPhone
                    }
                    onChange={(
                      e
                    ) =>
                      setGuardianPhone(
                        e.target
                          .value
                      )
                    }
                    placeholder="03XX-XXXXXXX"
                    className="input"
                  />
                </Field>

                <Field label="Guardian Email">
                  <input
                    type="email"
                    value={
                      guardianEmail
                    }
                    onChange={(
                      e
                    ) =>
                      setGuardianEmail(
                        e.target
                          .value
                      )
                    }
                    placeholder="guardian@example.com"
                    className="input"
                  />
                </Field>

                <Field label="Address">
                  <input
                    value={
                      address
                    }
                    onChange={(
                      e
                    ) =>
                      setAddress(
                        e.target
                          .value
                      )
                    }
                    placeholder="Student address"
                    className="input"
                  />
                </Field>
              </div>
            </FormCard>

            {/* ==================================
                STUDENT PORTAL LOGIN ACCOUNT
            ================================== */}

            <FormCard
              title="Student Portal Login Credentials"
              description="Create a student login account for attendance and portal access."
              icon={
                <ScanFace
                  size={20}
                />
              }
            >
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
                <Field label="Student Portal Email" required>
                  <input
                    type="email"
                    value={studentEmail}
                    onChange={(e) => setStudentEmail(e.target.value)}
                    placeholder="student@school.com"
                    className="input"
                  />
                </Field>

                <div className="flex flex-col justify-center rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs text-blue-900">
                  <div className="flex items-center gap-2 font-bold text-blue-950">
                    <KeyRound size={16} className="text-blue-600" />
                    Default Password: <span className="font-mono text-sm font-extrabold text-blue-600">12345678</span>
                  </div>
                  <p className="mt-1 text-[11px] leading-relaxed text-blue-700">
                    The student will use this email and default password to sign in. They will be prompted for one-time facial biometric setup and can update their password anytime.
                  </p>
                </div>
              </div>
            </FormCard>

            {/* ACTIONS */}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Link
                href="/students"
                className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 sm:w-auto"
              >
                Cancel
              </Link>

              <button
                type="button"
                onClick={
                  saveStudent
                }
                disabled={
                  saving
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Save
                    size={17}
                  />
                )}

                {saving
                  ? "Saving..."
                  : "Save Student"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* GLOBAL INPUT STYLE */}

      <style jsx global>{`
        .input {
          width: 100%;
          min-width: 0;
          max-width: 100%;
          box-sizing: border-box;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
          transition: 150ms;
        }

        .input:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px rgb(59 130 246 / 0.08);
        }
      `}</style>
    </main>
  );
}

/*
==========================================
FORM CARD
==========================================
*/

function FormCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="mb-5 flex min-w-0 items-start gap-3 sm:mb-6 sm:items-center">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
          {icon}
        </div>

        <div className="min-w-0">
          <h2 className="break-words font-bold">
            {title}
          </h2>

          <p className="mt-0.5 break-words text-xs text-slate-500">
            {description}
          </p>
        </div>
      </div>

      {children}
    </div>
  );
}

/*
==========================================
FIELD
==========================================
*/

function Field({
  label,
  required = false,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}

        {required && (
          <span className="ml-1 text-red-500">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  );
}