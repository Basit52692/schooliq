"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  CalendarCheck,
  CheckCircle2,
  Clock3,
  History,
  Loader2,
  Save,
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

type SchoolClass = {
  id: string;
  name: string;
};

type SchoolSection = {
  id: string;
  class_id: string;
  name: string;
};

type TeacherAssignment = {
  id: string;
  class_id: string;
  section_id: string;
  status: string;
};

type Student = {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string | null;
  class_id: string;
  section_id: string;
  status: string;
};

type AttendanceRecord = {
  id?: string;
  student_id: string;
  status: AttendanceStatus;
  remarks: string;
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

export default function AttendancePage() {
  const [role, setRole] =
    useState<Role | null>(null);

  const [schoolId, setSchoolId] =
    useState("");

  const [userId, setUserId] =
    useState("");

  const [classes, setClasses] =
    useState<SchoolClass[]>([]);

  const [sections, setSections] =
    useState<SchoolSection[]>([]);

  const [
    teacherAssignments,
    setTeacherAssignments,
  ] = useState<
    TeacherAssignment[]
  >([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [attendance, setAttendance] =
    useState<
      Record<
        string,
        AttendanceRecord
      >
    >({});

  const [
    selectedClassId,
    setSelectedClassId,
  ] = useState("");

  const [
    selectedSectionId,
    setSelectedSectionId,
  ] = useState("");

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(getLocalDate());

  const [search, setSearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [
    studentsLoading,
    setStudentsLoading,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
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

    setUserId(user.id);

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
    Admin   -> all own-school classes
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

    RLS:
    Admin   -> all own-school sections
    Teacher -> assigned sections only
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

    const loadedClasses =
      (classData ??
        []) as SchoolClass[];

    const loadedSections =
      (sectionData ??
        []) as SchoolSection[];

    setClasses(
      loadedClasses
    );

    setSections(
      loadedSections
    );

    /*
    ------------------------------------------
    TEACHER ASSIGNMENTS
    ------------------------------------------
    */

    let loadedAssignments:
      TeacherAssignment[] = [];

    if (
      currentRole ===
      "teacher"
    ) {
      const {
        data:
          assignmentData,
        error:
          assignmentError,
      } = await supabase
        .from(
          "teacher_assignments"
        )
        .select(`
          id,
          class_id,
          section_id,
          status
        `)
        .eq(
          "teacher_id",
          user.id
        )
        .eq(
          "school_id",
          profile.school_id
        )
        .eq(
          "status",
          "Active"
        );

      if (
        assignmentError
      ) {
        setError(
          assignmentError.message
        );

        setLoading(false);
        return;
      }

      loadedAssignments =
        (assignmentData ??
          []) as TeacherAssignment[];

      setTeacherAssignments(
        loadedAssignments
      );
    }

    /*
    ------------------------------------------
    DEFAULT CLASS / SECTION
    ------------------------------------------
    */

    if (
      currentRole ===
      "teacher"
    ) {
      const firstAssignment =
        loadedAssignments[0];

      if (
        firstAssignment
      ) {
        setSelectedClassId(
          firstAssignment.class_id
        );

        setSelectedSectionId(
          firstAssignment.section_id
        );
      }
    } else {
      const firstClass =
        loadedClasses[0];

      if (firstClass) {
        setSelectedClassId(
          firstClass.id
        );

        const firstSection =
          loadedSections.find(
            (section) =>
              section.class_id ===
              firstClass.id
          );

        if (
          firstSection
        ) {
          setSelectedSectionId(
            firstSection.id
          );
        }
      }
    }

    setLoading(false);
  }

  /*
  ==========================================
  AVAILABLE SECTIONS
  ==========================================
  */

  const availableSections =
    useMemo(() => {
      if (
        !selectedClassId
      ) {
        return [];
      }

      if (
        role === "teacher"
      ) {
        const allowedSectionIds =
          new Set(
            teacherAssignments
              .filter(
                (
                  assignment
                ) =>
                  assignment.class_id ===
                  selectedClassId
              )
              .map(
                (
                  assignment
                ) =>
                  assignment.section_id
              )
          );

        return sections.filter(
          (section) =>
            section.class_id ===
              selectedClassId &&
            allowedSectionIds.has(
              section.id
            )
        );
      }

      return sections.filter(
        (section) =>
          section.class_id ===
          selectedClassId
      );
    }, [
      sections,
      selectedClassId,
      role,
      teacherAssignments,
    ]);

  /*
  ==========================================
  CLASS CHANGE
  ==========================================
  */

  function handleClassChange(
    classId: string
  ) {
    setSelectedClassId(
      classId
    );

    const allowedSections =
      sections.filter(
        (section) =>
          section.class_id ===
          classId
      );

    if (
      role === "teacher"
    ) {
      const assignment =
        teacherAssignments.find(
          (item) =>
            item.class_id ===
            classId &&
            item.status ===
              "Active"
        );

      setSelectedSectionId(
        assignment?.section_id ??
          ""
      );
    } else {
      setSelectedSectionId(
        allowedSections[0]
          ?.id ?? ""
      );
    }

    setStudents([]);
    setAttendance({});
    setSearch("");
  }

  /*
  ==========================================
  LOAD STUDENTS + ATTENDANCE
  ==========================================
  */

  useEffect(() => {
    if (
      !selectedClassId ||
      !selectedSectionId ||
      !selectedDate
    ) {
      setStudents([]);
      setAttendance({});
      return;
    }

    loadStudentsAndAttendance();
  }, [
    selectedClassId,
    selectedSectionId,
    selectedDate,
  ]);

  async function loadStudentsAndAttendance() {
    setStudentsLoading(
      true
    );

    setError("");
    setSuccess("");

    const supabase =
      createClient();

    /*
    ------------------------------------------
    STUDENTS

    Filtering is ID based.
    RLS further restricts Teacher access.
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
        section_id,
        status
      `)
      .eq(
        "class_id",
        selectedClassId
      )
      .eq(
        "section_id",
        selectedSectionId
      )
      .eq(
        "status",
        "Active"
      )
      .order(
        "first_name",
        {
          ascending: true,
        }
      );

    if (
      studentError
    ) {
      setError(
        studentError.message
      );

      setStudentsLoading(
        false
      );

      return;
    }

    const loadedStudents =
      (studentData ??
        []) as Student[];

    setStudents(
      loadedStudents
    );

    if (
      loadedStudents.length ===
      0
    ) {
      setAttendance({});

      setStudentsLoading(
        false
      );

      return;
    }

    const studentIds =
      loadedStudents.map(
        (student) =>
          student.id
      );

    /*
    ------------------------------------------
    EXISTING ATTENDANCE
    ------------------------------------------
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
        status,
        remarks
      `)
      .eq(
        "attendance_date",
        selectedDate
      )
      .in(
        "student_id",
        studentIds
      );

    if (
      attendanceError
    ) {
      setError(
        attendanceError.message
      );

      setStudentsLoading(
        false
      );

      return;
    }

    const attendanceMap:
      Record<
        string,
        AttendanceRecord
      > = {};

    /*
      Default every active student
      to Present.
    */

    loadedStudents.forEach(
      (student) => {
        attendanceMap[
          student.id
        ] = {
          student_id:
            student.id,

          status:
            "Present",

          remarks: "",
        };
      }
    );

    /*
      Existing attendance
      overrides defaults.
    */

    (
      attendanceData ?? []
    ).forEach((item) => {
      attendanceMap[
        item.student_id
      ] = {
        id: item.id,

        student_id:
          item.student_id,

        status:
          item.status as AttendanceStatus,

        remarks:
          item.remarks ??
          "",
      };
    });

    setAttendance(
      attendanceMap
    );

    setStudentsLoading(
      false
    );
  }

  /*
  ==========================================
  CHANGE STATUS
  ==========================================
  */

  function changeStatus(
    studentId: string,
    status: AttendanceStatus
  ) {
    setAttendance(
      (current) => ({
        ...current,

        [studentId]: {
          ...current[
            studentId
          ],

          student_id:
            studentId,

          status,
        },
      })
    );

    setSuccess("");
  }

  /*
  ==========================================
  CHANGE REMARKS
  ==========================================
  */

  function changeRemarks(
    studentId: string,
    remarks: string
  ) {
    setAttendance(
      (current) => ({
        ...current,

        [studentId]: {
          ...current[
            studentId
          ],

          student_id:
            studentId,

          status:
            current[
              studentId
            ]?.status ??
            "Present",

          remarks,
        },
      })
    );

    setSuccess("");
  }

  /*
  ==========================================
  MARK ALL
  ==========================================
  */

  function markAll(
    status: AttendanceStatus
  ) {
    const next:
      Record<
        string,
        AttendanceRecord
      > = {};

    students.forEach(
      (student) => {
        next[student.id] = {
          ...attendance[
            student.id
          ],

          student_id:
            student.id,

          status,

          remarks:
            attendance[
              student.id
            ]?.remarks ??
            "",
        };
      }
    );

    setAttendance(next);
    setSuccess("");
  }

  /*
  ==========================================
  SAVE ATTENDANCE
  ==========================================
  */

  async function saveAttendance() {
    setError("");
    setSuccess("");

    if (!schoolId) {
      setError(
        "School information is missing."
      );

      return;
    }

    if (!userId) {
      setError(
        "Logged-in user information is missing."
      );

      return;
    }

    if (
      !selectedClassId ||
      !selectedSectionId
    ) {
      setError(
        "Please select class and section."
      );

      return;
    }

    if (
      students.length ===
      0
    ) {
      setError(
        "There are no students to mark attendance for."
      );

      return;
    }

    setSaving(true);

    const supabase =
      createClient();

    const rows =
      students.map(
        (student) => {
          const record =
            attendance[
              student.id
            ];

          return {
            school_id:
              schoolId,

            student_id:
              student.id,

            attendance_date:
              selectedDate,

            status:
              record?.status ??
              "Present",

            remarks:
              record?.remarks
                ?.trim() ||
              null,

            marked_by:
              userId,

            updated_at:
              new Date().toISOString(),
          };
        }
      );

    /*
      Unique constraint:
      student_id + attendance_date

      Existing -> UPDATE
      Missing  -> INSERT
    */

    const {
      error: saveError,
    } = await supabase
      .from("attendance")
      .upsert(rows, {
        onConflict:
          "student_id,attendance_date",
      });

    if (saveError) {
      setError(
        saveError.message
      );

      setSaving(false);
      return;
    }

    setSuccess(
      "Attendance saved successfully."
    );

    await loadStudentsAndAttendance();

    setSaving(false);
  }

  /*
  ==========================================
  FILTER
  ==========================================
  */

  const filteredStudents =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return students;
      }

      return students.filter(
        (student) => {
          const fullName =
            `${student.first_name} ${
              student.last_name ??
              ""
            }`
              .trim()
              .toLowerCase();

          return (
            fullName.includes(
              query
            ) ||
            student.admission_no
              .toLowerCase()
              .includes(query)
          );
        }
      );
    }, [
      students,
      search,
    ]);

  /*
  ==========================================
  SUMMARY
  ==========================================
  */

  const presentCount =
    students.filter(
      (student) =>
        attendance[
          student.id
        ]?.status ===
        "Present"
    ).length;

  const absentCount =
    students.filter(
      (student) =>
        attendance[
          student.id
        ]?.status ===
        "Absent"
    ).length;

  const lateCount =
    students.filter(
      (student) =>
        attendance[
          student.id
        ]?.status ===
        "Late"
    ).length;

  const leaveCount =
    students.filter(
      (student) =>
        attendance[
          student.id
        ]?.status ===
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
          {/* ==================================
              HEADER
          ================================== */}

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">
                Attendance
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {role ===
                "teacher"
                  ? "Mark attendance for your assigned class and section."
                  : "Manage daily student attendance."}
              </p>
            </div>

            <Link
              href="/attendance/history"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-slate-50 sm:w-auto"
            >
              <History
                size={17}
              />

              Attendance History
            </Link>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* SUCCESS */}

          {success && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {success}
            </div>
          )}

          {/* TEACHER NOTICE */}

          {role ===
            "teacher" && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>
                You can only mark
                and view attendance
                for students in your
                assigned class and
                section.
              </span>
            </div>
          )}

          {/* NO TEACHER ASSIGNMENT */}

          {role ===
            "teacher" &&
            teacherAssignments.length ===
              0 && (
              <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
                No active class
                assignment was found
                for your account.
                Please contact the
                School Administrator.
              </div>
            )}

          {/* ==================================
              SELECTORS
          ================================== */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {/* CLASS */}

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium">
                  Class
                </label>

                <select
                  value={
                    selectedClassId
                  }
                  onChange={(
                    e
                  ) =>
                    handleClassChange(
                      e.target
                        .value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select Class
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

              {/* SECTION */}

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium">
                  Section
                </label>

                <select
                  value={
                    selectedSectionId
                  }
                  onChange={(
                    e
                  ) =>
                    setSelectedSectionId(
                      e.target
                        .value
                    )
                  }
                  disabled={
                    !selectedClassId
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-100"
                >
                  <option value="">
                    Select Section
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
              </div>

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

              {/* SEARCH */}

              <div className="min-w-0">
                <label className="mb-2 block text-sm font-medium">
                  Search Student
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
                    placeholder="Name or admission no..."
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
              title="Students"
              value={
                students.length
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
              MARK ALL
          ================================== */}

          {students.length >
            0 && (
            <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex sm:flex-wrap sm:items-center sm:gap-2 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              <span className="mb-2 block text-sm font-medium text-slate-500 sm:mb-0 sm:mr-2">
                Mark All:
              </span>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                {(
                  [
                    "Present",
                    "Absent",
                    "Late",
                    "Leave",
                  ] as AttendanceStatus[]
                ).map(
                  (
                    status
                  ) => (
                    <button
                      key={
                        status
                      }
                      onClick={() =>
                        markAll(
                          status
                        )
                      }
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-slate-50"
                    >
                      {
                        status
                      }
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* ==================================
              TABLE
          ================================== */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {loading ||
            studentsLoading ? (
              <div className="flex min-h-72 items-center justify-center p-4">
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <Loader2 className="animate-spin" />

                  Loading
                  attendance...
                </div>
              </div>
            ) : !selectedClassId ||
              !selectedSectionId ? (
              <div className="p-6 text-center sm:p-12">
                <CalendarCheck
                  size={46}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h2 className="font-semibold">
                  Select Class &
                  Section
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Choose a class
                  and section to
                  load students.
                </p>
              </div>
            ) : filteredStudents.length ===
              0 ? (
              <div className="p-6 text-center sm:p-12">
                <Users
                  size={46}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h2 className="font-semibold">
                  No Students Found
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  No active
                  students match
                  this class,
                  section or
                  search.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Student
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Admission No.
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
                    {filteredStudents.map(
                      (
                        student
                      ) => {
                        const fullName =
                          `${student.first_name} ${
                            student.last_name ??
                            ""
                          }`.trim();

                        const record =
                          attendance[
                            student.id
                          ];

                        return (
                          <tr
                            key={
                              student.id
                            }
                            className="border-b border-slate-100 last:border-none"
                          >
                            {/* STUDENT */}

                            <td className="px-4 py-4 sm:px-5">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-semibold text-blue-600">
                                  {student.first_name
                                    .charAt(
                                      0
                                    )
                                    .toUpperCase()}
                                </div>

                                <p className="min-w-36 font-semibold">
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

                            {/* STATUS */}

                            <td className="px-4 py-4 sm:px-5">
                              <div className="flex min-w-[310px] flex-wrap gap-2">
                                {(
                                  [
                                    "Present",
                                    "Absent",
                                    "Late",
                                    "Leave",
                                  ] as AttendanceStatus[]
                                ).map(
                                  (
                                    status
                                  ) => (
                                    <button
                                      key={
                                        status
                                      }
                                      onClick={() =>
                                        changeStatus(
                                          student.id,
                                          status
                                        )
                                      }
                                      className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                        record?.status ===
                                        status
                                          ? getActiveStatusClass(
                                              status
                                            )
                                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                      }`}
                                    >
                                      {
                                        status
                                      }
                                    </button>
                                  )
                                )}
                              </div>
                            </td>

                            {/* REMARKS */}

                            <td className="px-4 py-4 sm:px-5">
                              <input
                                value={
                                  record?.remarks ??
                                  ""
                                }
                                onChange={(
                                  e
                                ) =>
                                  changeRemarks(
                                    student.id,
                                    e.target
                                      .value
                                  )
                                }
                                placeholder="Optional..."
                                className="w-56 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                              />
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

          {/* ==================================
              SAVE
          ================================== */}

          {students.length >
            0 && (
            <div className="mt-6 flex justify-stretch sm:justify-end">
              <button
                onClick={
                  saveAttendance
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
                  : "Save Attendance"}
              </button>
            </div>
          )}
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
STATUS BUTTON STYLE
==========================================
*/

function getActiveStatusClass(
  status: AttendanceStatus
) {
  switch (status) {
    case "Present":
      return "bg-emerald-600 text-white";

    case "Absent":
      return "bg-red-600 text-white";

    case "Late":
      return "bg-amber-500 text-white";

    case "Leave":
      return "bg-blue-600 text-white";

    default:
      return "bg-slate-600 text-white";
  }
}