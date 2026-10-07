"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  ArrowLeft,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  Search,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Role =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "accountant";

type AttendanceStatus =
  | "Present"
  | "Absent"
  | "Late"
  | "Leave";

type AttendanceRow = {
  id: string;
  student_id: string;
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
};

type Student = {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string | null;
  class_id: string;
  section_id: string;
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

type HistoryRow =
  AttendanceRow & {
    student: Student;
  };

function getLocalDate() {
  const now = new Date();

  const year =
    now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function AttendanceHistoryPage() {
  const [role, setRole] =
    useState<Role | null>(null);

  const [schoolId, setSchoolId] =
    useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(getLocalDate());

  const [records, setRecords] =
    useState<HistoryRow[]>([]);

  const [classes, setClasses] =
    useState<SchoolClass[]>([]);

  const [sections, setSections] =
    useState<SchoolSection[]>([]);

  const [search, setSearch] =
    useState("");

  const [
    classFilter,
    setClassFilter,
  ] = useState("All");

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

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
    PROFILE
    ------------------------------------------
    */

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select(
        "school_id, role"
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

    const currentRole =
      profile.role as Role;

    if (
      currentRole ===
      "accountant"
    ) {
      window.location.href =
        "/";
      return;
    }

    setRole(currentRole);

    setSchoolId(
      profile.school_id
    );

    /*
    ------------------------------------------
    CLASSES

    RLS:
    Admin   -> own school
    Teacher -> assigned classes only
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
      .eq(
        "status",
        "Active"
      )
      .order(
        "sort_order",
        {
          ascending: true,
        }
      )
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
    SECTIONS
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
  LOAD ATTENDANCE HISTORY
  ==========================================
  */

  useEffect(() => {
    if (!schoolId) {
      return;
    }

    loadHistory();
  }, [
    schoolId,
    selectedDate,
  ]);

  async function loadHistory() {
    setLoading(true);
    setError("");

    const supabase =
      createClient();

    /*
      Attendance RLS:

      Admin:
      -> all own-school records

      Teacher:
      -> assigned students only
    */

    const {
      data:
        attendanceData,
      error:
        attendanceError,
    } = await supabase
      .from("attendance")
      .select(`
        id,
        student_id,
        attendance_date,
        status,
        remarks
      `)
      .eq(
        "school_id",
        schoolId
      )
      .eq(
        "attendance_date",
        selectedDate
      )
      .order(
        "created_at",
        {
          ascending: true,
        }
      );

    if (
      attendanceError
    ) {
      setError(
        attendanceError.message
      );

      setLoading(false);
      return;
    }

    const attendanceRows =
      (attendanceData ??
        []) as AttendanceRow[];

    if (
      attendanceRows.length ===
      0
    ) {
      setRecords([]);
      setLoading(false);
      return;
    }

    const studentIds =
      attendanceRows.map(
        (item) =>
          item.student_id
      );

    /*
    ------------------------------------------
    STUDENTS

    ID based:
    class_id + section_id
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
        class_id,
        section_id
      `)
      .in(
        "id",
        studentIds
      );

    if (
      studentError
    ) {
      setError(
        studentError.message
      );

      setLoading(false);
      return;
    }

    const students =
      (studentData ??
        []) as Student[];

    const studentMap =
      new Map(
        students.map(
          (student) => [
            student.id,
            student,
          ]
        )
      );

    const merged:
      HistoryRow[] = [];

    attendanceRows.forEach(
      (record) => {
        const student =
          studentMap.get(
            record.student_id
          );

        if (!student) {
          return;
        }

        merged.push({
          ...record,
          student,
        });
      }
    );

    setRecords(merged);

    setLoading(false);
  }

  /*
  ==========================================
  LOOKUPS
  ==========================================
  */

  const classMap =
    useMemo(
      () =>
        new Map(
          classes.map(
            (item) => [
              item.id,
              item.name,
            ]
          )
        ),
      [classes]
    );

  const sectionMap =
    useMemo(
      () =>
        new Map(
          sections.map(
            (item) => [
              item.id,
              item.name,
            ]
          )
        ),
      [sections]
    );

  function getClassName(
    classId: string
  ) {
    return (
      classMap.get(
        classId
      ) ??
      "Unknown Class"
    );
  }

  function getSectionName(
    sectionId: string
  ) {
    return (
      sectionMap.get(
        sectionId
      ) ??
      "Unknown Section"
    );
  }

  /*
  ==========================================
  FILTER
  ==========================================
  */

  const filteredRecords =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return records.filter(
        (record) => {
          const student =
            record.student;

          const fullName =
            `${student.first_name} ${
              student.last_name ??
              ""
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
              .includes(
                query
              ) ||
            className.includes(
              query
            ) ||
            sectionName.includes(
              query
            ) ||
            record.status
              .toLowerCase()
              .includes(
                query
              ) ||
            (
              record.remarks ??
              ""
            )
              .toLowerCase()
              .includes(
                query
              );

          const matchesClass =
            classFilter ===
              "All" ||
            student.class_id ===
              classFilter;

          return (
            matchesSearch &&
            matchesClass
          );
        }
      );
    }, [
      records,
      classes,
      sections,
      search,
      classFilter,
    ]);

  /*
  ==========================================
  SUMMARY
  ==========================================
  */

  const presentCount =
    filteredRecords.filter(
      (item) =>
        item.status ===
        "Present"
    ).length;

  const absentCount =
    filteredRecords.filter(
      (item) =>
        item.status ===
        "Absent"
    ).length;

  const lateCount =
    filteredRecords.filter(
      (item) =>
        item.status ===
        "Late"
    ).length;

  const leaveCount =
    filteredRecords.filter(
      (item) =>
        item.status ===
        "Leave"
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
          {/* BACK */}

          <Link
            href="/attendance"
            className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-blue-600"
          >
            <ArrowLeft
              size={17}
            />

            Back to Attendance
          </Link>

          {/* HEADER */}

          <div className="mb-6">
            <h1 className="text-2xl font-bold sm:text-3xl">
              Attendance History
            </h1>

            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              {role ===
              "teacher"
                ? "View attendance history for students in your assigned class and section."
                : "View school attendance records by date and class."}
            </p>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* TEACHER NOTICE */}

          {role ===
            "teacher" && (
            <div className="mb-5 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>
                You can only view
                attendance records
                for students
                belonging to your
                assigned class and
                section.
              </span>
            </div>
          )}

          {/* ==================================
              FILTERS
          ================================== */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {/* DATE */}

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium">
                  Attendance Date
                </label>

                <input
                  type="date"
                  value={
                    selectedDate
                  }
                  onChange={(
                    e
                  ) =>
                    setSelectedDate(
                      e.target
                        .value
                    )
                  }
                  className="w-full min-w-0 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                />
              </div>

              {/* CLASS */}

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium">
                  Class
                </label>

                <select
                  value={
                    classFilter
                  }
                  onChange={(
                    e
                  ) =>
                    setClassFilter(
                      e.target
                        .value
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
              </div>

              {/* SEARCH */}

              <div className="min-w-0 md:col-span-2 xl:col-span-1">
                <label className="mb-2 block text-sm font-medium">
                  Search
                </label>

                <div className="flex min-w-0 items-center gap-3 rounded-xl border border-slate-200 px-3 py-3 sm:px-4">
                  <Search
                    size={18}
                    className="shrink-0 text-slate-400"
                  />

                  <input
                    value={
                      search
                    }
                    onChange={(
                      e
                    ) =>
                      setSearch(
                        e.target
                          .value
                      )
                    }
                    placeholder="Student, admission no, class..."
                    className="min-w-0 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ==================================
              SUMMARY
          ================================== */}

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
            <SummaryCard
              title="Total"
              value={
                filteredRecords.length
              }
              icon={
                <Users
                  size={19}
                />
              }
            />

            <SummaryCard
              title="Present"
              value={
                presentCount
              }
              icon={
                <CheckCircle2
                  size={19}
                />
              }
            />

            <SummaryCard
              title="Absent"
              value={
                absentCount
              }
              icon={
                <XCircle
                  size={19}
                />
              }
            />

            <SummaryCard
              title="Late"
              value={
                lateCount
              }
              icon={
                <Clock3
                  size={19}
                />
              }
            />

            <SummaryCard
              title="Leave"
              value={
                leaveCount
              }
              icon={
                <CalendarCheck
                  size={19}
                />
              }
            />
          </div>

          {/* ==================================
              TABLE
          ================================== */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ? (
              <div className="flex min-h-72 items-center justify-center p-4">
                <div className="flex items-center gap-3 text-center text-sm text-slate-500">
                  <Loader2 className="shrink-0 animate-spin" />

                  Loading attendance
                  history...
                </div>
              </div>
            ) : filteredRecords.length ===
              0 ? (
              <div className="p-6 text-center sm:p-12">
                <CalendarCheck
                  size={46}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h2 className="font-semibold">
                  No Attendance
                  Records
                </h2>

                <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
                  No attendance
                  records match the
                  selected date or
                  filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] text-sm">
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
                        Status
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Remarks
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredRecords.map(
                      (
                        record
                      ) => {
                        const student =
                          record.student;

                        const fullName =
                          `${student.first_name} ${
                            student.last_name ??
                            ""
                          }`.trim();

                        return (
                          <tr
                            key={
                              record.id
                            }
                            className="border-b border-slate-100 last:border-none"
                          >
                            {/* STUDENT */}

                            <td className="px-4 py-4 sm:px-5">
                              <div className="flex min-w-[160px] items-center gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-semibold text-blue-600">
                                  {student.first_name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <p className="font-semibold">
                                  {
                                    fullName
                                  }
                                </p>
                              </div>
                            </td>

                            {/* ADMISSION */}

                            <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-5">
                              {
                                student.admission_no
                              }
                            </td>

                            {/* CLASS */}

                            <td className="whitespace-nowrap px-4 py-4 sm:px-5">
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

                            {/* STATUS */}

                            <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                              <StatusBadge
                                status={
                                  record.status
                                }
                              />
                            </td>

                            {/* REMARKS */}

                            <td className="px-4 py-4 text-slate-500 sm:px-5">
                              <div
                                className="max-w-[260px] truncate"
                                title={
                                  record.remarks ??
                                  ""
                                }
                              >
                                {record.remarks ??
                                  "—"}
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
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        {icon}
      </div>

      <p className="truncate text-xs text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-xl font-bold sm:text-2xl">
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
  status: AttendanceStatus;
}) {
  const styles: Record<
    AttendanceStatus,
    string
  > = {
    Present:
      "bg-emerald-50 text-emerald-600",

    Absent:
      "bg-red-50 text-red-600",

    Late:
      "bg-amber-50 text-amber-600",

    Leave:
      "bg-blue-50 text-blue-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles[status]}`}
    >
      {status}
    </span>
  );
}