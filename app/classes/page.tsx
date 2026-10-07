"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  BookOpen,
  GraduationCap,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type Role =
  | "super_admin"
  | "school_admin"
  | "teacher"
  | "accountant";

type SchoolClass = {
  id: string;
  school_id: string;
  name: string;
  status: string;
  sort_order: number | null;
};

type SchoolSection = {
  id: string;
  school_id: string;
  class_id: string;
  name: string;
  status: string;
};

type Student = {
  id: string;
  class_id: string;
  section_id: string;
  status: string;
};

type TeacherAssignment = {
  id: string;
  class_id: string;
  section_id: string;
  status: string;
};

export default function ClassesPage() {
  const [role, setRole] =
    useState<Role | null>(null);

  const [schoolId, setSchoolId] =
    useState("");

  const [classes, setClasses] =
    useState<SchoolClass[]>([]);

  const [sections, setSections] =
    useState<SchoolSection[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [
    teacherAssignments,
    setTeacherAssignments,
  ] = useState<TeacherAssignment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [search, setSearch] =
    useState("");

  /*
  ==========================================
  ADD CLASS
  ==========================================
  */

  const [
    showClassModal,
    setShowClassModal,
  ] = useState(false);

  const [className, setClassName] =
    useState("");

  const [classSaving, setClassSaving] =
    useState(false);

  /*
  ==========================================
  ADD SECTION
  ==========================================
  */

  const [
    showSectionModal,
    setShowSectionModal,
  ] = useState(false);

  const [
    sectionClassId,
    setSectionClassId,
  ] = useState("");

  const [sectionName, setSectionName] =
    useState("");

  const [
    sectionSaving,
    setSectionSaving,
  ] = useState(false);

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

    if (
      currentRole === "accountant"
    ) {
      window.location.href = "/";
      return;
    }

    setRole(currentRole);
    setSchoolId(profile.school_id);

    /*
    ------------------------------------------
    CLASSES
    ------------------------------------------

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
        school_id,
        name,
        status,
        sort_order
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
    SECTIONS
    ------------------------------------------

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
        school_id,
        class_id,
        name,
        status
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

    /*
    ------------------------------------------
    STUDENTS

    IMPORTANT:
    Student counting is now completely based
    on class_id + section_id.
    No class_name / section text dependency.
    ------------------------------------------
    */

    const {
      data: studentData,
      error: studentError,
    } = await supabase
      .from("students")
      .select(`
        id,
        class_id,
        section_id,
        status
      `)
      .eq(
        "school_id",
        profile.school_id
      );

    if (studentError) {
      setError(
        studentError.message
      );

      setLoading(false);
      return;
    }

    /*
    ------------------------------------------
    TEACHER ASSIGNMENTS
    ------------------------------------------
    */

    let assignments:
      TeacherAssignment[] = [];

    if (currentRole === "teacher") {
      const {
        data: assignmentData,
        error: assignmentError,
      } = await supabase
        .from("teacher_assignments")
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
        .eq("status", "Active");

      if (assignmentError) {
        setError(
          assignmentError.message
        );

        setLoading(false);
        return;
      }

      assignments =
        (assignmentData ??
          []) as TeacherAssignment[];
    }

    setClasses(
      (classData ??
        []) as SchoolClass[]
    );

    setSections(
      (sectionData ??
        []) as SchoolSection[]
    );

    setStudents(
      (studentData ??
        []) as Student[]
    );

    setTeacherAssignments(
      assignments
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
  COUNTS
  ==========================================
  */

  function getClassStudentCount(
    classId: string
  ) {
    return students.filter(
      (student) =>
        student.class_id === classId &&
        student.status === "Active"
    ).length;
  }

  function getSectionStudentCount(
    sectionId: string
  ) {
    return students.filter(
      (student) =>
        student.section_id ===
          sectionId &&
        student.status === "Active"
    ).length;
  }

  function getClassSections(
    classId: string
  ) {
    return sections.filter(
      (section) =>
        section.class_id === classId
    );
  }

  /*
  ==========================================
  TEACHER ASSIGNMENT CHECK
  ==========================================
  */

  function isTeacherAssigned(
    classId: string,
    sectionId: string
  ) {
    if (role !== "teacher") {
      return false;
    }

    return teacherAssignments.some(
      (assignment) =>
        assignment.class_id ===
          classId &&
        assignment.section_id ===
          sectionId &&
        assignment.status ===
          "Active"
    );
  }

  /*
  ==========================================
  SEARCH
  ==========================================
  */

  const filteredClasses =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return classes;
      }

      return classes.filter(
        (schoolClass) => {
          const classSections =
            sections.filter(
              (section) =>
                section.class_id ===
                schoolClass.id
            );

          return (
            schoolClass.name
              .toLowerCase()
              .includes(query) ||
            classSections.some(
              (section) =>
                section.name
                  .toLowerCase()
                  .includes(query)
            )
          );
        }
      );
    }, [
      classes,
      sections,
      search,
    ]);

  /*
  ==========================================
  SUMMARY
  ==========================================
  */

  const totalStudents =
    students.filter(
      (student) =>
        student.status === "Active"
    ).length;

  /*
  ==========================================
  CREATE CLASS
  ==========================================
  */

  async function createClass() {
    setError("");
    setSuccess("");

    const name =
      className.trim();

    if (!name) {
      setError(
        "Class name is required."
      );
      return;
    }

    if (!schoolId) {
      setError(
        "School information is missing."
      );
      return;
    }

    setClassSaving(true);

    const supabase =
      createClient();

    const maxSortOrder =
      classes.reduce(
        (max, item) =>
          Math.max(
            max,
            item.sort_order ?? 0
          ),
        0
      );

    const {
      error: insertError,
    } = await supabase
      .from("classes")
      .insert({
        school_id: schoolId,

        name,

        status: "Active",

        sort_order:
          maxSortOrder + 1,
      });

    if (insertError) {
      if (
        insertError.code === "23505"
      ) {
        setError(
          "This class already exists."
        );
      } else {
        setError(
          insertError.message
        );
      }

      setClassSaving(false);
      return;
    }

    setClassName("");

    setShowClassModal(false);

    setSuccess(
      "Class created successfully."
    );

    await loadPage();

    setClassSaving(false);
  }

  /*
  ==========================================
  CREATE SECTION
  ==========================================
  */

  async function createSection() {
    setError("");
    setSuccess("");

    if (!sectionClassId) {
      setError(
        "Please select a class."
      );
      return;
    }

    const name =
      sectionName.trim();

    if (!name) {
      setError(
        "Section name is required."
      );
      return;
    }

    if (!schoolId) {
      setError(
        "School information is missing."
      );
      return;
    }

    setSectionSaving(true);

    const supabase =
      createClient();

    const {
      error: insertError,
    } = await supabase
      .from("sections")
      .insert({
        school_id: schoolId,

        class_id:
          sectionClassId,

        name,

        status: "Active",
      });

    if (insertError) {
      if (
        insertError.code === "23505"
      ) {
        setError(
          "This section already exists in the selected class."
        );
      } else {
        setError(
          insertError.message
        );
      }

      setSectionSaving(false);
      return;
    }

    setSectionClassId("");
    setSectionName("");

    setShowSectionModal(false);

    setSuccess(
      "Section created successfully."
    );

    await loadPage();

    setSectionSaving(false);
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

          <div className="flex min-h-[70vh] items-center justify-center">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" />

              Loading classes...
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

          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                Classes & Sections
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                {role === "teacher"
                  ? "View your assigned classes and sections."
                  : "Manage the school's academic class structure."}
              </p>
            </div>

            {canManage && (
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button
                  onClick={() =>
                    setShowSectionModal(
                      true
                    )
                  }
                  disabled={
                    classes.length === 0
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Plus size={17} />

                  Add Section
                </button>

                <button
                  onClick={() =>
                    setShowClassModal(
                      true
                    )
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
                >
                  <Plus size={17} />

                  Add Class
                </button>
              </div>
            )}
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

          {role === "teacher" && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0"
              />

              <span>
                Read-only access. Only your
                assigned class and section are
                shown here.
              </span>
            </div>
          )}

          {/* SUMMARY */}

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <SummaryCard
              title={
                role === "teacher"
                  ? "Assigned Classes"
                  : "Active Classes"
              }
              value={classes.length}
              icon={
                <GraduationCap
                  size={20}
                />
              }
            />

            <SummaryCard
              title={
                role === "teacher"
                  ? "Assigned Sections"
                  : "Active Sections"
              }
              value={sections.length}
              icon={
                <BookOpen
                  size={20}
                />
              }
            />

            <SummaryCard
              title={
                role === "teacher"
                  ? "Assigned Students"
                  : "Active Students"
              }
              value={totalStudents}
              icon={
                <Users size={20} />
              }
            />
          </div>

          {/* SEARCH */}

          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex max-w-xl items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
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
                placeholder="Search class or section..."
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>

          {/* CLASSES */}

          {filteredClasses.length ===
          0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <GraduationCap
                size={46}
                className="mx-auto mb-4 text-slate-300"
              />

              <h2 className="font-semibold">
                No Classes Found
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                No class matches the current
                search or assignment.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {filteredClasses.map(
                (schoolClass) => {
                  const classSections =
                    getClassSections(
                      schoolClass.id
                    );

                  return (
                    <div
                      key={schoolClass.id}
                      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* CLASS HEADER */}

                      <div className="flex items-center justify-between gap-3 border-b border-slate-100 p-4 sm:p-5">
                        <div className="min-w-0 flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                            <GraduationCap
                              size={21}
                            />
                          </div>

                          <div>
                            <h2 className="truncate text-lg font-bold">
                              {
                                schoolClass.name
                              }
                            </h2>

                            <p className="mt-1 text-xs text-slate-500">
                              {getClassStudentCount(
                                schoolClass.id
                              )}{" "}
                              active student
                              {getClassStudentCount(
                                schoolClass.id
                              ) === 1
                                ? ""
                                : "s"}
                            </p>
                          </div>
                        </div>

                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                          Active
                        </span>
                      </div>

                      {/* SECTIONS */}

                      <div className="p-4 sm:p-5">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Sections
                        </p>

                        {classSections.length ===
                        0 ? (
                          <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                            No active sections
                            found.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {classSections.map(
                              (
                                section
                              ) => (
                                <div
                                  key={
                                    section.id
                                  }
                                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 sm:p-4"
                                >
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-semibold">
                                        Section{" "}
                                        {
                                          section.name
                                        }
                                      </p>

                                      {isTeacherAssigned(
                                        schoolClass.id,
                                        section.id
                                      ) && (
                                        <span className="rounded-full bg-blue-100 px-2 py-1 text-[10px] font-semibold text-blue-600">
                                          Assigned
                                        </span>
                                      )}
                                    </div>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {getSectionStudentCount(
                                        section.id
                                      )}{" "}
                                      active student
                                      {getSectionStudentCount(
                                        section.id
                                      ) ===
                                      1
                                        ? ""
                                        : "s"}
                                    </p>
                                  </div>

                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                                    <Users
                                      size={
                                        16
                                      }
                                    />
                                  </div>
                                </div>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </div>
      </section>

      {/* ====================================
          ADD CLASS MODAL
      ==================================== */}

      {showClassModal && (
        <Modal
          title="Add Class"
          onClose={() => {
            setShowClassModal(
              false
            );

            setClassName("");
          }}
        >
          <div className="space-y-4">
            <Field label="Class Name">
              <input
                value={className}
                onChange={(e) =>
                  setClassName(
                    e.target.value
                  )
                }
                placeholder="e.g. Grade 10"
                className="input"
              />
            </Field>

            <div className="flex flex-col-reverse gap-3 pt-3 sm:flex-row sm:justify-end">
              <button
                onClick={() =>
                  setShowClassModal(
                    false
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold sm:w-auto"
              >
                Cancel
              </button>

              <button
                onClick={
                  createClass
                }
                disabled={
                  classSaving
                }
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 sm:w-auto"
              >
                {classSaving && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Add Class
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ====================================
          ADD SECTION MODAL
      ==================================== */}

      {showSectionModal && (
        <Modal
          title="Add Section"
          onClose={() => {
            setShowSectionModal(
              false
            );

            setSectionClassId(
              ""
            );

            setSectionName("");
          }}
        >
          <div className="space-y-4">
            <Field label="Class">
              <select
                value={
                  sectionClassId
                }
                onChange={(e) =>
                  setSectionClassId(
                    e.target.value
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

            <Field label="Section Name">
              <input
                value={sectionName}
                onChange={(e) =>
                  setSectionName(
                    e.target.value
                  )
                }
                placeholder="e.g. A"
                className="input"
              />
            </Field>

            <div className="flex justify-end gap-3 pt-3">
              <button
                onClick={() =>
                  setShowSectionModal(
                    false
                  )
                }
                className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={
                  createSection
                }
                disabled={
                  sectionSaving
                }
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {sectionSaving && (
                  <Loader2
                    size={16}
                    className="animate-spin"
                  />
                )}

                Add Section
              </button>
            </div>
          </div>
        </Modal>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid rgb(226 232 240);
          border-radius: 0.75rem;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
          background: white;
        }

        .input:focus {
          border-color: rgb(59 130 246);
          box-shadow: 0 0 0 2px
            rgb(59 130 246 / 0.08);
        }
      `}</style>
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
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
FIELD
==========================================
*/

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-700">
        {label}
      </label>

      {children}
    </div>
  );
}

/*
==========================================
MODAL
==========================================
*/

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-3 sm:p-4">
      <div className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)]">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
          <h2 className="text-lg font-bold">
            {title}
          </h2>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={19} />
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
