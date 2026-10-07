"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  Eye,
  GraduationCap,
  Loader2,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  UserRound,
  Users,
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

  admission_no: string;

  first_name: string;
  last_name: string | null;

  gender: string | null;

  class_id: string;
  section_id: string;

  guardian_name: string;

  status: string;

  created_at: string;
};

type SchoolClass = {
  id: string;
  name: string;
};

type SchoolSection = {
  id: string;
  class_id: string;
  name: string;
};

export default function StudentsPage() {
  const router = useRouter();

  const [role, setRole] =
    useState<Role | null>(null);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [classes, setClasses] =
    useState<SchoolClass[]>([]);

  const [sections, setSections] =
    useState<SchoolSection[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [classFilter, setClassFilter] =
    useState("All");

  const [statusFilter, setStatusFilter] =
    useState("All");

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
    USER
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

    const currentRole =
      profile.role as Role;

    /*
      Accountant should never reach Students.
      Proxy already blocks it.
      This is extra UI protection.
    */

    if (
      currentRole === "accountant"
    ) {
      router.replace("/");
      return;
    }

    setRole(currentRole);

    /*
    ------------------------------------------
    LOAD STUDENTS
    ------------------------------------------

    RLS handles access:

    Admin:
    → all students in own school

    Teacher:
    → only assigned class + section students

    IMPORTANT:
    We now use class_id + section_id.
    No class_name / section text fields.
    ------------------------------------------
    */

    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from("students")
      .select(`
        id,
        admission_no,
        first_name,
        last_name,
        gender,
        class_id,
        section_id,
        guardian_name,
        status,
        created_at
      `)
      .eq(
        "school_id",
        profile.school_id
      )
      .order("first_name", {
        ascending: true,
      });

    if (studentError) {
      setError(
        studentError.message
      );

      setLoading(false);
      return;
    }

    /*
    ------------------------------------------
    LOAD CLASSES
    ------------------------------------------

    Classes RLS:
    Admin → all
    Teacher → assigned classes only
    ------------------------------------------
    */

    const {
      data: classData,
      error: classError,
    } = await supabase
      .from("classes")
      .select(`
        id,
        name
      `)
      .eq(
        "school_id",
        profile.school_id
      )
      .eq("status", "Active")
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
        name
      `)
      .eq(
        "school_id",
        profile.school_id
      )
      .eq("status", "Active")
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

    setStudents(
      (studentData ?? []) as Student[]
    );

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
  PERMISSIONS
  ==========================================
  */

  const canManage =
    role === "school_admin" ||
    role === "super_admin";

  /*
  ==========================================
  LOOKUPS
  ==========================================
  */

  const classMap = useMemo(
    () =>
      new Map(
        classes.map((item) => [
          item.id,
          item.name,
        ])
      ),
    [classes]
  );

  const sectionMap = useMemo(
    () =>
      new Map(
        sections.map((item) => [
          item.id,
          item.name,
        ])
      ),
    [sections]
  );

  function getClassName(
    classId: string
  ) {
    return (
      classMap.get(classId) ??
      "Unknown Class"
    );
  }

  function getSectionName(
    sectionId: string
  ) {
    return (
      sectionMap.get(sectionId) ??
      "Unknown Section"
    );
  }

  /*
  ==========================================
  FILTER STUDENTS
  ==========================================
  */

  const filteredStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return students.filter(
        (student) => {
          const fullName =
            `${student.first_name} ${
              student.last_name ?? ""
            }`
              .trim()
              .toLowerCase();

          const className =
            getClassName(
              student.class_id
            ).toLowerCase();

          const sectionName =
            getSectionName(
              student.section_id
            ).toLowerCase();

          const matchesSearch =
            !query ||
            fullName.includes(
              query
            ) ||
            student.admission_no
              .toLowerCase()
              .includes(query) ||
            className.includes(
              query
            ) ||
            sectionName.includes(
              query
            ) ||
            student.guardian_name
              .toLowerCase()
              .includes(query);

          const matchesClass =
            classFilter === "All" ||
            student.class_id ===
              classFilter;

          const matchesStatus =
            statusFilter === "All" ||
            student.status ===
              statusFilter;

          return (
            matchesSearch &&
            matchesClass &&
            matchesStatus
          );
        }
      );
    }, [
      students,
      classes,
      sections,
      search,
      classFilter,
      statusFilter,
    ]);

  /*
  ==========================================
  SUMMARY
  ==========================================
  */

  const activeStudents =
    students.filter(
      (student) =>
        student.status === "Active"
    ).length;

  const inactiveStudents =
    students.filter(
      (student) =>
        student.status !== "Active"
    ).length;

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

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Students
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {role === "teacher"
                  ? "View students from your assigned class and section."
                  : "Manage student records, classes and enrollment."}
              </p>
            </div>

            {canManage && (
              <Link
                href="/students/new"
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
              >
                <Plus size={17} />
                Add Student
              </Link>
            )}
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* TEACHER NOTICE */}

          {role === "teacher" && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>
                Read-only access. You can
                only view students belonging
                to your assigned class and
                section.
              </span>
            </div>
          )}

          {/* SUMMARY */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title={
                role === "teacher"
                  ? "Assigned Students"
                  : "Total Students"
              }
              value={
                students.length
              }
              icon={
                <Users size={20} />
              }
            />

            <SummaryCard
              title="Active Students"
              value={activeStudents}
              icon={
                <UserRound
                  size={20}
                />
              }
            />

            <SummaryCard
              title="Inactive Students"
              value={inactiveStudents}
              icon={
                <GraduationCap
                  size={20}
                />
              }
            />
          </div>

          {/* FILTERS */}

          <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* SEARCH */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Search
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <Search
                    size={18}
                    className="text-slate-400"
                  />

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(
                        e.target.value
                      )
                    }
                    placeholder="Name, admission no, guardian..."
                    className="w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              {/* CLASS */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Class
                </label>

                <select
                  value={classFilter}
                  onChange={(e) =>
                    setClassFilter(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="All">
                    All Classes
                  </option>

                  {classes.map(
                    (item) => (
                      <option
                        key={item.id}
                        value={item.id}
                      >
                        {item.name}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* STATUS */}

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Status
                </label>

                <select
                  value={
                    statusFilter
                  }
                  onChange={(e) =>
                    setStatusFilter(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="All">
                    All Status
                  </option>

                  <option value="Active">
                    Active
                  </option>

                  <option value="Inactive">
                    Inactive
                  </option>
                </select>
              </div>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-72 items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 className="animate-spin" />
                  Loading students...
                </div>
              </div>
            ) : filteredStudents.length ===
              0 ? (
              <div className="p-12 text-center">
                <Users
                  size={46}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h2 className="font-semibold">
                  No students found
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  No student matches the
                  current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Student
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Admission No.
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Class
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Guardian
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Status
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Actions
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStudents.map(
                      (student) => {
                        const fullName =
                          `${student.first_name} ${
                            student.last_name ??
                            ""
                          }`.trim();

                        return (
                          <tr
                            key={
                              student.id
                            }
                            className="border-b border-slate-100 last:border-none"
                          >
                            {/* STUDENT */}

                            <td className="px-4 py-4 sm:px-5">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 font-semibold text-blue-600">
                                  {student.first_name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <div>
                                  <p className="font-semibold">
                                    {
                                      fullName
                                    }
                                  </p>

                                  <p className="mt-1 text-xs text-slate-500">
                                    {student.gender ??
                                      "—"}
                                  </p>
                                </div>
                              </div>
                            </td>

                            {/* ADMISSION */}

                            <td className="whitespace-nowrap px-4 py-4 font-medium text-slate-600 sm:px-5">
                              {
                                student.admission_no
                              }
                            </td>

                            {/* CLASS */}

                            <td className="px-4 py-4 sm:px-5">
                              <p className="font-semibold">
                                {getClassName(
                                  student.class_id
                                )}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                Section{" "}
                                {getSectionName(
                                  student.section_id
                                )}
                              </p>
                            </td>

                            {/* GUARDIAN */}

                            <td className="max-w-[220px] truncate px-4 py-4 text-slate-600 sm:px-5">
                              {
                                student.guardian_name
                              }
                            </td>

                            {/* STATUS */}

                            <td className="px-4 py-4 sm:px-5">
                              <StatusBadge
                                status={
                                  student.status
                                }
                              />
                            </td>

                            {/* ACTIONS */}

                            <td className="px-4 py-4 sm:px-5">
                              <div className="flex items-center gap-2">
                                <Link
                                  href={`/students/${student.id}`}
                                  title="View Student"
                                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100"
                                >
                                  <Eye
                                    size={
                                      16
                                    }
                                  />
                                </Link>

                                {canManage && (
                                  <Link
                                    href={`/students/${student.id}/edit`}
                                    title="Edit Student"
                                    className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
                                  >
                                    <Pencil
                                      size={
                                        16
                                      }
                                    />
                                  </Link>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

/*
==========================================
SUMMARY CARD
==========================================
*/

function SummaryCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        {icon}
      </div>

      <p className="text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold">
        {value}
      </p>
    </div>
  );
}

/*
==========================================
STATUS BADGE
==========================================
*/

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const active =
    status === "Active";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-600"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {status}
    </span>
  );
}