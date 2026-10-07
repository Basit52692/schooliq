"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Calculator,
  GraduationCap,
  Loader2,
  Search,
  UserPlus,
  Users,
  X,
} from "lucide-react";

import Sidebar from "@/components/Sidebar";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/client";

type StaffMember = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  role: "teacher" | "accountant";
  status: string;
  created_at: string;
};

type TeacherAssignment = {
  id: string;
  teacher_id: string;
  class_id: string;
  section_id: string;
  status: string;
};

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);

  const [selectedStaff, setSelectedStaff] =
    useState<StaffMember | null>(null);

  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");

  const [editRole, setEditRole] = useState<
    "teacher" | "accountant"
  >("teacher");

  const [editPassword, setEditPassword] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [showAssignmentForm, setShowAssignmentForm] =
    useState(false);

  const [assignmentTeacher, setAssignmentTeacher] =
    useState<StaffMember | null>(null);

  const [classes, setClasses] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);

  const [selectedClassId, setSelectedClassId] =
    useState("");

  const [selectedSectionId, setSelectedSectionId] =
    useState("");

  const [assignmentSaving, setAssignmentSaving] =
    useState(false);

  const [teacherAssignments, setTeacherAssignments] =
    useState<TeacherAssignment[]>([]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [role, setRole] = useState<
    "teacher" | "accountant"
  >("teacher");

  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /*
  ==========================================
  LOAD STAFF
  ==========================================
  */

  async function loadStaff() {
    setLoading(true);
    setError("");

    const supabase = createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select(`
        id,
        full_name,
        email,
        phone,
        role,
        status,
        created_at
      `)
      .in("role", ["teacher", "accountant"])
      .order("created_at", {
        ascending: false,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setStaff((data ?? []) as StaffMember[]);
    setLoading(false);
  }

  /*
  ==========================================
  LOAD CLASSES + SECTIONS
  ==========================================
  */

  async function loadAcademicStructure() {
    const supabase = createClient();

    const [classesResult, sectionsResult] =
      await Promise.all([
        supabase
          .from("classes")
          .select("id, name, status")
          .eq("status", "Active")
          .order("sort_order", {
            ascending: true,
          }),

        supabase
          .from("sections")
          .select("id, class_id, name, status")
          .eq("status", "Active")
          .order("name", {
            ascending: true,
          }),
      ]);

    if (classesResult.error) {
      setError(classesResult.error.message);
      return;
    }

    if (sectionsResult.error) {
      setError(sectionsResult.error.message);
      return;
    }

    setClasses(classesResult.data ?? []);
    setSections(sectionsResult.data ?? []);
  }

  /*
  ==========================================
  LOAD TEACHER ASSIGNMENTS
  ==========================================
  */

  async function loadTeacherAssignments() {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("teacher_assignments")
      .select(`
        id,
        teacher_id,
        class_id,
        section_id,
        status
      `)
      .eq("status", "Active");

    if (error) {
      setError(error.message);
      return;
    }

    setTeacherAssignments(
      (data ?? []) as TeacherAssignment[]
    );
  }

  useEffect(() => {
    loadStaff();
    loadAcademicStructure();
    loadTeacherAssignments();
  }, []);

  /*
  ==========================================
  CREATE STAFF
  ==========================================
  */

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();

    setMessage("");
    setError("");

    if (!fullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    if (password.length < 8) {
      setError(
        "Temporary password must be at least 8 characters."
      );
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/staff", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          full_name: fullName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          role,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ??
            "Unable to create staff account."
        );

        setSaving(false);
        return;
      }

      setMessage(
        "Staff account created successfully."
      );

      setFullName("");
      setEmail("");
      setPhone("");
      setPassword("");
      setRole("teacher");

      setShowForm(false);

      await loadStaff();
    } catch {
      setError(
        "Unable to connect to the staff API."
      );
    }

    setSaving(false);
  }

  /*
  ==========================================
  CHANGE STATUS
  ==========================================
  */

  async function changeStaffStatus(
    member: StaffMember
  ) {
    const newStatus =
      member.status === "Active"
        ? "Inactive"
        : "Active";

    const confirmed = window.confirm(
      `Are you sure you want to mark ${member.full_name} as ${newStatus}?`
    );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const supabase = createClient();

    const { error } = await supabase.rpc(
      "set_staff_status",
      {
        p_profile_id: member.id,
        p_status: newStatus,
      }
    );

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      `${member.full_name} is now ${newStatus}.`
    );

    await loadStaff();
  }

  /*
  ==========================================
  UPDATE STAFF
  ==========================================
  */

  async function updateStaff(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedStaff) return;

    setMessage("");
    setError("");

    if (!editFullName.trim()) {
      setError("Full name is required.");
      return;
    }

    if (
      editPassword &&
      editPassword.length < 8
    ) {
      setError(
        "New password must be at least 8 characters."
      );
      return;
    }

    setEditSaving(true);

    try {
      const response = await fetch("/api/staff", {
        method: "PATCH",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          staff_id: selectedStaff.id,
          full_name: editFullName.trim(),
          phone: editPhone.trim(),
          role: editRole,
          password: editPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(
          result.error ??
            "Unable to update staff member."
        );

        setEditSaving(false);
        return;
      }

      setMessage(
        result.message ??
          "Staff profile updated successfully."
      );

      setShowEditForm(false);
      setSelectedStaff(null);

      setEditFullName("");
      setEditPhone("");
      setEditPassword("");
      setEditRole("teacher");

      await loadStaff();
    } catch {
      setError(
        "Unable to connect to the staff API."
      );
    }

    setEditSaving(false);
  }

  /*
  ==========================================
  SAVE TEACHER ASSIGNMENT
  ==========================================
  */

  async function saveTeacherAssignment(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!assignmentTeacher) return;

    setMessage("");
    setError("");

    if (!selectedClassId) {
      setError("Please select a class.");
      return;
    }

    if (!selectedSectionId) {
      setError("Please select a section.");
      return;
    }

    setAssignmentSaving(true);

    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("User not authenticated.");
      setAssignmentSaving(false);
      return;
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from("profiles")
      .select("school_id")
      .eq("id", user.id)
      .single();

    if (
      profileError ||
      !profile?.school_id
    ) {
      setError(
        profileError?.message ??
          "Unable to load school."
      );

      setAssignmentSaving(false);
      return;
    }

    const {
      error: assignmentError,
    } = await supabase
      .from("teacher_assignments")
      .upsert(
        {
          school_id: profile.school_id,
          teacher_id:
            assignmentTeacher.id,
          class_id: selectedClassId,
          section_id:
            selectedSectionId,
          status: "Active",
        },
        {
          onConflict:
            "teacher_id,class_id,section_id",
        }
      );

    if (assignmentError) {
      setError(
        assignmentError.message
      );

      setAssignmentSaving(false);
      return;
    }

    setMessage(
      `${assignmentTeacher.full_name} assigned successfully.`
    );

    setShowAssignmentForm(false);
    setAssignmentTeacher(null);
    setSelectedClassId("");
    setSelectedSectionId("");

    await loadTeacherAssignments();

    setAssignmentSaving(false);
  }

  /*
  ==========================================
  REMOVE ASSIGNMENT
  ==========================================
  */

  async function removeTeacherAssignment(
    teacherId: string
  ) {
    const assignment =
      teacherAssignments.find(
        (item) =>
          item.teacher_id ===
            teacherId &&
          item.status === "Active"
      );

    if (!assignment) {
      setError(
        "No active assignment found."
      );
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to remove this teacher assignment?"
      );

    if (!confirmed) return;

    setMessage("");
    setError("");

    const supabase =
      createClient();

    const { error } =
      await supabase
        .from(
          "teacher_assignments"
        )
        .delete()
        .eq(
          "id",
          assignment.id
        );

    if (error) {
      setError(error.message);
      return;
    }

    setMessage(
      "Teacher assignment removed successfully."
    );

    await loadTeacherAssignments();
  }

  /*
  ==========================================
  COUNTS
  ==========================================
  */

  const teachers = staff.filter(
    (member) =>
      member.role === "teacher"
  ).length;

  const accountants = staff.filter(
    (member) =>
      member.role ===
      "accountant"
  ).length;

  /*
  ==========================================
  SEARCH
  ==========================================
  */

  const filteredStaff =
    useMemo(() => {
      const query = search
        .trim()
        .toLowerCase();

      if (!query) {
        return staff;
      }

      return staff.filter(
        (member) =>
          member.full_name
            .toLowerCase()
            .includes(query) ||
          member.email
            ?.toLowerCase()
            .includes(query) ||
          member.phone
            ?.toLowerCase()
            .includes(query) ||
          member.role
            .toLowerCase()
            .includes(query)
      );
    }, [staff, search]);

  /*
  ==========================================
  HELPERS
  ==========================================
  */

  function roleLabel(
    value: string
  ) {
    if (
      value === "teacher"
    ) {
      return "Teacher";
    }

    if (
      value === "accountant"
    ) {
      return "Accountant";
    }

    return value;
  }

  function getAssignmentLabel(
    teacherId: string
  ) {
    const assignments =
      teacherAssignments.filter(
        (item) =>
          item.teacher_id ===
            teacherId &&
          item.status === "Active"
      );

    if (
      assignments.length === 0
    ) {
      return "Not Assigned";
    }

    return assignments
      .map((assignment) => {
        const classItem =
          classes.find(
            (item) =>
              item.id ===
              assignment.class_id
          );

        const sectionItem =
          sections.find(
            (item) =>
              item.id ===
              assignment.section_id
          );

        return `${
          classItem?.name ??
          "Class"
        } - ${
          sectionItem?.name ??
          "Section"
        }`;
      })
      .join(", ");
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
            <div className="min-w-0">
              <h1 className="text-2xl font-bold sm:text-3xl">
                Staff & Users
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage teachers
                and finance staff
                accounts.
              </p>
            </div>

            <button
              onClick={() => {
                setError("");
                setMessage("");
                setShowForm(true);
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 sm:w-auto"
            >
              <UserPlus
                size={18}
              />

              Add Staff Member
            </button>
          </div>

          {/* MESSAGE */}

          {message && (
            <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium text-emerald-700">
              {message}
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              {error}
            </div>
          )}

          {/* SUMMARY */}

          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Total Staff"
              value={
                staff.length
              }
              icon={
                <Users
                  size={20}
                />
              }
            />

            <SummaryCard
              title="Teachers"
              value={teachers}
              icon={
                <GraduationCap
                  size={20}
                />
              }
            />

            <SummaryCard
              title="Accountants"
              value={
                accountants
              }
              icon={
                <Calculator
                  size={20}
                />
              }
            />
          </div>

          {/* STAFF TABLE */}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            {/* SEARCH */}

            <div className="border-b border-slate-200 p-4 sm:p-5">
              <div className="flex w-full max-w-md min-w-0 items-center gap-3 rounded-xl bg-slate-100 px-3 py-3 sm:px-4">
                <Search
                  size={18}
                  className="shrink-0 text-slate-400"
                />

                <input
                  value={search}
                  onChange={(e) =>
                    setSearch(
                      e.target.value
                    )
                  }
                  placeholder="Search staff..."
                  className="min-w-0 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {loading ? (
              <div className="flex min-h-72 items-center justify-center p-4">
                <Loader2 className="animate-spin text-blue-600" />
              </div>
            ) : filteredStaff.length ===
              0 ? (
              <div className="p-6 text-center sm:p-12">
                <Users
                  size={42}
                  className="mx-auto mb-4 text-slate-300"
                />

                <h2 className="font-semibold">
                  No staff accounts
                  yet
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create your first
                  Teacher or
                  Accountant
                  account.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left text-slate-500">
                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Staff Member
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Email
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Phone
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Role
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Assigned
                        Class
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Status
                      </th>

                      <th className="whitespace-nowrap px-4 py-4 sm:px-5">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStaff.map(
                      (member) => (
                        <tr
                          key={
                            member.id
                          }
                          className="border-b border-slate-100 last:border-none"
                        >
                          {/* MEMBER */}

                          <td className="px-4 py-4 sm:px-5">
                            <p className="font-semibold">
                              {
                                member.full_name
                              }
                            </p>
                          </td>

                          {/* EMAIL */}

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-5">
                            {member.email ??
                              "—"}
                          </td>

                          {/* PHONE */}

                          <td className="whitespace-nowrap px-4 py-4 text-slate-600 sm:px-5">
                            {member.phone ??
                              "—"}
                          </td>

                          {/* ROLE */}

                          <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-600">
                              {roleLabel(
                                member.role
                              )}
                            </span>
                          </td>

                          {/* ASSIGNMENT */}

                          <td className="px-4 py-4 sm:px-5">
                            {member.role ===
                            "teacher" ? (
                              <span className="block max-w-[260px] whitespace-normal text-sm font-medium text-slate-700">
                                {getAssignmentLabel(
                                  member.id
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400">
                                —
                              </span>
                            )}
                          </td>

                          {/* STATUS */}

                          <td className="whitespace-nowrap px-4 py-4 sm:px-5">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                member.status ===
                                "Active"
                                  ? "bg-emerald-50 text-emerald-600"
                                  : "bg-red-50 text-red-600"
                              }`}
                            >
                              {
                                member.status
                              }
                            </span>
                          </td>

                          {/* ACTIONS */}

                          <td className="px-4 py-4 sm:px-5">
                            <div className="flex min-w-[320px] flex-wrap gap-2">
                              <button
                                onClick={() => {
                                  setSelectedStaff(
                                    member
                                  );

                                  setEditFullName(
                                    member.full_name
                                  );

                                  setEditPhone(
                                    member.phone ??
                                      ""
                                  );

                                  setEditRole(
                                    member.role
                                  );

                                  setEditPassword(
                                    ""
                                  );

                                  setError(
                                    ""
                                  );

                                  setMessage(
                                    ""
                                  );

                                  setShowEditForm(
                                    true
                                  );
                                }}
                                className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-100"
                              >
                                Edit
                              </button>

                              {member.role ===
                                "teacher" && (
                                <button
                                  onClick={() => {
                                    setAssignmentTeacher(
                                      member
                                    );

                                    setSelectedClassId(
                                      ""
                                    );

                                    setSelectedSectionId(
                                      ""
                                    );

                                    setError(
                                      ""
                                    );

                                    setMessage(
                                      ""
                                    );

                                    setShowAssignmentForm(
                                      true
                                    );
                                  }}
                                  className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-600 transition hover:bg-violet-100"
                                >
                                  Assign
                                  Class
                                </button>
                              )}

                              {member.role ===
                                "teacher" &&
                                teacherAssignments.some(
                                  (
                                    item
                                  ) =>
                                    item.teacher_id ===
                                      member.id &&
                                    item.status ===
                                      "Active"
                                ) && (
                                  <button
                                    onClick={() =>
                                      removeTeacherAssignment(
                                        member.id
                                      )
                                    }
                                    className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-600 transition hover:bg-amber-100"
                                  >
                                    Remove
                                    Class
                                  </button>
                                )}

                              <button
                                onClick={() =>
                                  changeStaffStatus(
                                    member
                                  )
                                }
                                className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                                  member.status ===
                                  "Active"
                                    ? "bg-red-50 text-red-600 hover:bg-red-100"
                                    : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                                }`}
                              >
                                {member.status ===
                                "Active"
                                  ? "Deactivate"
                                  : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ==================================
          ADD STAFF MODAL
      ================================== */}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
          <form
            onSubmit={
              createStaff
            }
            className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:p-6"
          >
            <div className="mb-6 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="text-lg font-bold sm:text-xl">
                  Add Staff Member
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Create a Teacher
                  or Accountant
                  login account.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false
                  )
                }
                className="shrink-0 rounded-lg p-2 hover:bg-slate-100"
              >
                <X size={19} />
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Full Name
                </label>

                <input
                  value={
                    fullName
                  }
                  onChange={(e) =>
                    setFullName(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Ali Khan"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Email Address
                </label>

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(
                      e.target.value
                    )
                  }
                  required
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="teacher@example.com"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Phone
                </label>

                <input
                  value={phone}
                  onChange={(e) =>
                    setPhone(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="03XXXXXXXXX"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Role
                </label>

                <select
                  value={role}
                  onChange={(e) =>
                    setRole(
                      e.target
                        .value as
                        | "teacher"
                        | "accountant"
                    )
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                >
                  <option value="teacher">
                    Teacher
                  </option>

                  <option value="accountant">
                    Accountant
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Temporary
                  Password
                </label>

                <input
                  type="password"
                  value={
                    password
                  }
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  placeholder="Minimum 8 characters"
                />

                <p className="mt-2 text-xs text-slate-400">
                  Share this
                  temporary
                  password securely
                  with the staff
                  member.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowForm(
                    false
                  )
                }
                className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold sm:w-auto"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
              >
                {saving && (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                )}

                {saving
                  ? "Creating..."
                  : "Create Account"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ==================================
          EDIT STAFF MODAL
      ================================== */}

      {showEditForm &&
        selectedStaff && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
            <form
              onSubmit={
                updateStaff
              }
              className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:p-6"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold sm:text-xl">
                    Edit Staff
                    Member
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Update staff
                    information or
                    reset password.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(
                      false
                    );

                    setSelectedStaff(
                      null
                    );
                  }}
                  className="shrink-0 rounded-lg p-2 hover:bg-slate-100"
                >
                  <X
                    size={19}
                  />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* FULL NAME */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Full Name
                  </label>

                  <input
                    value={
                      editFullName
                    }
                    onChange={(
                      e
                    ) =>
                      setEditFullName(
                        e.target
                          .value
                      )
                    }
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                {/* EMAIL */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Email Address
                  </label>

                  <input
                    value={
                      selectedStaff.email ??
                      ""
                    }
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Email cannot
                    be changed from
                    this form.
                  </p>
                </div>

                {/* PHONE */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Phone
                  </label>

                  <input
                    value={
                      editPhone
                    }
                    onChange={(
                      e
                    ) =>
                      setEditPhone(
                        e.target
                          .value
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="03XXXXXXXXX"
                  />
                </div>

                {/* ROLE */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Role
                  </label>

                  <select
                    value={
                      editRole
                    }
                    onChange={(
                      e
                    ) =>
                      setEditRole(
                        e.target
                          .value as
                          | "teacher"
                          | "accountant"
                      )
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
                  >
                    <option value="teacher">
                      Teacher
                    </option>

                    <option value="accountant">
                      Accountant
                    </option>
                  </select>
                </div>

                {/* PASSWORD */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    New Password
                  </label>

                  <input
                    type="password"
                    value={
                      editPassword
                    }
                    onChange={(
                      e
                    ) =>
                      setEditPassword(
                        e.target
                          .value
                      )
                    }
                    minLength={8}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500"
                    placeholder="Leave blank to keep current password"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Enter a new
                    password only if
                    you want to reset
                    it.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditForm(
                      false
                    );

                    setSelectedStaff(
                      null
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    editSaving
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
                >
                  {editSaving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {editSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

      {/* ==================================
          ASSIGN CLASS MODAL
      ================================== */}

      {showAssignmentForm &&
        assignmentTeacher && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-5">
            <form
              onSubmit={
                saveTeacherAssignment
              }
              className="max-h-[calc(100vh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-4 shadow-xl sm:max-h-[calc(100vh-2rem)] sm:p-6"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold sm:text-xl">
                    Assign Class
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Assign a class
                    and section to{" "}
                    {
                      assignmentTeacher.full_name
                    }
                    .
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentForm(
                      false
                    );

                    setAssignmentTeacher(
                      null
                    );

                    setSelectedClassId(
                      ""
                    );

                    setSelectedSectionId(
                      ""
                    );
                  }}
                  className="shrink-0 rounded-lg p-2 hover:bg-slate-100"
                >
                  <X
                    size={19}
                  />
                </button>
              </div>

              {error && (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div className="space-y-5">
                {/* TEACHER */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Teacher
                  </label>

                  <input
                    value={
                      assignmentTeacher.full_name
                    }
                    disabled
                    className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500"
                  />
                </div>

                {/* CLASS */}

                <div>
                  <label className="mb-2 block text-sm font-medium">
                    Class
                  </label>

                  <select
                    value={
                      selectedClassId
                    }
                    onChange={(
                      e
                    ) => {
                      setSelectedClassId(
                        e.target
                          .value
                      );

                      setSelectedSectionId(
                        ""
                      );
                    }}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500"
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
                </div>

                {/* SECTION */}

                <div>
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
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
                  >
                    <option value="">
                      Select section
                    </option>

                    {sections
                      .filter(
                        (
                          section
                        ) =>
                          section.class_id ===
                          selectedClassId
                      )
                      .map(
                        (
                          section
                        ) => (
                          <option
                            key={
                              section.id
                            }
                            value={
                              section.id
                            }
                          >
                            {
                              section.name
                            }
                          </option>
                        )
                      )}
                  </select>
                </div>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignmentForm(
                      false
                    );

                    setAssignmentTeacher(
                      null
                    );

                    setSelectedClassId(
                      ""
                    );

                    setSelectedSectionId(
                      ""
                    );
                  }}
                  className="w-full rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold sm:w-auto"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    assignmentSaving
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:opacity-60 sm:w-auto"
                >
                  {assignmentSaving && (
                    <Loader2
                      size={17}
                      className="animate-spin"
                    />
                  )}

                  {assignmentSaving
                    ? "Assigning..."
                    : "Assign Class"}
                </button>
              </div>
            </form>
          </div>
        )}
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
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
        {icon}
      </div>

      <p className="text-sm text-slate-500">
        {title}
      </p>

      <p className="mt-1 text-2xl font-bold sm:text-3xl">
        {value}
      </p>
    </div>
  );
}