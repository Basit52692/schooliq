"use client";

import {
  useEffect,
  useState,
} from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import {
  ArrowLeft,
  CalendarDays,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Pencil,
  Phone,
  ShieldCheck,
  UserRound,
  Users,
  WalletCards,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Role =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "accountant";

type Student = {
  id: string;
  school_id: string;

  admission_no: string;

  first_name: string;
  last_name: string | null;

  gender: string | null;
  date_of_birth: string | null;

  class_id: string;
  section_id: string;

  admission_date: string | null;

  guardian_name: string;
  guardian_phone: string | null;
  guardian_email: string | null;

  address: string | null;

  status: string;

  created_at: string;
  updated_at: string | null;
};

export default function StudentProfilePage() {
  const params = useParams();

  const studentId =
    typeof params.id === "string"
      ? params.id
      : "";

  const [student, setStudent] =
    useState<Student | null>(null);

  const [role, setRole] =
    useState<Role | null>(null);

  const [className, setClassName] =
    useState("");

  const [sectionName, setSectionName] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
  ==========================================
  LOAD PROFILE + STUDENT
  ==========================================
  */

  useEffect(() => {
    loadStudent();
  }, [studentId]);

  async function loadStudent() {
    if (!studentId) {
      setError(
        "Student ID is missing."
      );

      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    const supabase =
      createClient();

    /*
    ------------------------------------------
    USER
    ------------------------------------------
    */

    const {
      data: { user },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      setError(
        "Unable to load logged-in user."
      );

      setLoading(false);
      return;
    }

    /*
    ------------------------------------------
    USER ROLE
    ------------------------------------------
    */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "role, school_id"
      )
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

    setRole(
      profile.role as Role
    );

    /*
    ------------------------------------------
    STUDENT

    Student RLS handles:
    Admin:
    -> own-school students

    Teacher:
    -> assigned class/section students only
    ------------------------------------------
    */

    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from("students")
      .select(`
        id,
        school_id,
        admission_no,
        first_name,
        last_name,
        gender,
        date_of_birth,
        class_id,
        section_id,
        admission_date,
        guardian_name,
        guardian_phone,
        guardian_email,
        address,
        status,
        created_at,
        updated_at
      `)
      .eq(
        "id",
        studentId
      )
      .single();

    if (
      studentError ||
      !studentData
    ) {
      setError(
        "Student not found or you do not have permission to view this student."
      );

      setLoading(false);
      return;
    }

    const loadedStudent =
      studentData as Student;

    setStudent(
      loadedStudent
    );

    /*
    ------------------------------------------
    CLASS NAME
    ------------------------------------------
    */

    const {
      data: classData,
      error: classError,
    } = await supabase
      .from("classes")
      .select("name")
      .eq(
        "id",
        loadedStudent.class_id
      )
      .single();

    if (classError) {
      console.error(
        classError
      );
    }

    setClassName(
      classData?.name ??
        "Unknown Class"
    );

    /*
    ------------------------------------------
    SECTION NAME
    ------------------------------------------
    */

    const {
      data: sectionData,
      error: sectionError,
    } = await supabase
      .from("sections")
      .select("name")
      .eq(
        "id",
        loadedStudent.section_id
      )
      .single();

    if (sectionError) {
      console.error(
        sectionError
      );
    }

    setSectionName(
      sectionData?.name ??
        "Unknown Section"
    );

    setLoading(false);
  }

  /*
  ==========================================
  PERMISSION
  ==========================================
  */

  const canManage =
    role === "school_admin" ||
    role === "super_admin";

  /*
  ==========================================
  HELPERS
  ==========================================
  */

  function fullName() {
    if (!student) {
      return "";
    }

    return `${student.first_name} ${
      student.last_name ?? ""
    }`.trim();
  }

  function formatDate(
    value: string | null
  ) {
    if (!value) {
      return "—";
    }

    const date =
      new Date(
        `${value}T00:00:00`
      );

    return date.toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
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

              Loading student
              profile...
            </div>
          </div>
        </section>
      </main>
    );
  }

  /*
  ==========================================
  ERROR
  ==========================================
  */

  if (
    error ||
    !student
  ) {
    return (
      <main className="min-h-screen bg-[#f4f7fb] text-slate-900">
        <Sidebar />

        <section className="ml-64 min-h-screen">
          <Navbar />

          <div className="p-4 sm:p-5 lg:p-7">
            <Link
              href="/students"
              className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
            >
              <ArrowLeft
                size={17}
              />

              Back to Students
            </Link>

            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center sm:p-10">
              <ShieldCheck
                size={44}
                className="mx-auto mb-4 text-red-500"
              />

              <h1 className="text-xl font-bold">
                Student Unavailable
              </h1>

              <p className="mx-auto mt-2 max-w-lg break-words text-sm text-red-600">
                {error ||
                  "This student cannot be accessed."}
              </p>
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

          {/* ==================================
              HEADER
          ================================== */}

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 sm:h-14 sm:w-14">
                <UserRound
                  size={26}
                />
              </div>

              <div className="min-w-0">
                <h1 className="break-words text-2xl font-bold sm:text-3xl">
                  {fullName()}
                </h1>

                <p className="mt-1 break-words text-sm text-slate-500">
                  {student.admission_no}
                  {" • "}
                  {className}
                  {"-"}
                  {sectionName}
                </p>
              </div>
            </div>

            {/* ADMIN ONLY */}

            {canManage && (
              <Link
                href={`/students/${student.id}/edit`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
              >
                <Pencil
                  size={17}
                />

                Edit Student
              </Link>
            )}
          </div>

          {/* TEACHER NOTICE */}

          {role ===
            "teacher" && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>
                Read-only access.
                You can view this
                student because the
                student belongs to
                your assigned class
                and section.
              </span>
            </div>
          )}

          {/* STATUS */}

          <div className="mb-6">
            <span
              className={`inline-flex rounded-full px-4 py-2 text-xs font-semibold ${
                student.status ===
                "Active"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-slate-100 text-slate-500"
              }`}
            >
              {student.status}
            </span>
          </div>

          {/* ==================================
              CARDS
          ================================== */}

          <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-2">
            {/* PERSONAL */}

            <InfoCard
              title="Personal Information"
              description="Student personal details."
              icon={
                <UserRound
                  size={20}
                />
              }
            >
              <InfoRow
                label="Full Name"
                value={
                  fullName()
                }
              />

              <InfoRow
                label="Gender"
                value={
                  student.gender ??
                  "—"
                }
              />

              <InfoRow
                label="Date of Birth"
                value={formatDate(
                  student.date_of_birth
                )}
              />

              <InfoRow
                label="Address"
                value={
                  student.address ??
                  "—"
                }
                icon={
                  <MapPin
                    size={16}
                  />
                }
              />
            </InfoCard>

            {/* ACADEMIC */}

            <InfoCard
              title="Academic Information"
              description="Enrollment and class details."
              icon={
                <GraduationCap
                  size={20}
                />
              }
            >
              <InfoRow
                label="Admission No."
                value={
                  student.admission_no
                }
              />

              <InfoRow
                label="Class"
                value={
                  className
                }
              />

              <InfoRow
                label="Section"
                value={
                  sectionName
                }
              />

              <InfoRow
                label="Admission Date"
                value={formatDate(
                  student.admission_date
                )}
                icon={
                  <CalendarDays
                    size={16}
                  />
                }
              />
            </InfoCard>

            {/* GUARDIAN */}

            <InfoCard
              title="Guardian Information"
              description="Parent or guardian contact details."
              icon={
                <Users
                  size={20}
                />
              }
            >
              <InfoRow
                label="Guardian Name"
                value={
                  student.guardian_name
                }
              />

              <InfoRow
                label="Phone"
                value={
                  student.guardian_phone ??
                  "—"
                }
                icon={
                  <Phone
                    size={16}
                  />
                }
              />

              <InfoRow
                label="Email"
                value={
                  student.guardian_email ??
                  "—"
                }
                icon={
                  <Mail
                    size={16}
                  />
                }
              />
            </InfoCard>

            {/* OVERVIEW */}

            <InfoCard
              title="Student Overview"
              description="Quick academic and financial overview."
              icon={
                <ShieldCheck
                  size={20}
                />
              }
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div className="min-w-0 rounded-xl bg-blue-50 p-4">
                  <CalendarDays
                    size={20}
                    className="mb-3 text-blue-600"
                  />

                  <p className="text-xs text-slate-500">
                    Attendance
                  </p>

                  <p className="mt-1 break-words font-bold">
                    View in
                    Attendance
                  </p>
                </div>

                <div className="min-w-0 rounded-xl bg-emerald-50 p-4">
                  <WalletCards
                    size={20}
                    className="mb-3 text-emerald-600"
                  />

                  <p className="text-xs text-slate-500">
                    Fee Status
                  </p>

                  <p className="mt-1 break-words font-bold">
                    Managed in Fees
                  </p>
                </div>
              </div>
            </InfoCard>
          </div>
        </div>
      </section>
    </main>
  );
}

/*
==========================================
INFO CARD
==========================================
*/

function InfoCard({
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

      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
}

/*
==========================================
INFO ROW
==========================================
*/

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-3 last:border-none last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
      <div className="flex min-w-0 items-center gap-2 text-sm text-slate-500">
        {icon && (
          <span className="shrink-0">
            {icon}
          </span>
        )}

        <span>
          {label}
        </span>
      </div>

      <p className="min-w-0 break-words text-sm font-semibold text-slate-800 sm:max-w-[60%] sm:text-right">
        {value}
      </p>
    </div>
  );
}