"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  Camera,
  CheckCircle2,
  Clock,
  GraduationCap,
  History,
  KeyRound,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  ScanFace,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserRound,
  X,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  loadFaceModels,
  extractFaceDescriptor,
  verifyFaceMatch,
} from "@/lib/faceRecognition";

type StudentData = {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string | null;
  class_id: string;
  section_id: string;
  school_id: string;
  status: string;
  class_name?: string;
  section_name?: string;
};

type TodayAttendance = {
  id?: string;
  status: string;
  remarks: string | null;
  updated_at?: string;
};

type AttendanceLog = {
  id: string;
  attendance_date: string;
  status: string;
  remarks: string | null;
};

function getLocalDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function StudentPortalPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [userId, setUserId] = useState("");
  const [schoolName, setSchoolName] = useState("SchoolIQ");
  const [student, setStudent] = useState<StudentData | null>(null);

  const [hasFaceSetup, setHasFaceSetup] = useState(false);
  const [storedDescriptor, setStoredDescriptor] = useState<number[] | null>(null);

  const [todayAttendance, setTodayAttendance] = useState<TodayAttendance | null>(null);
  const [recentLogs, setRecentLogs] = useState<AttendanceLog[]>([]);

  // SCANNER MODAL STATE
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerStarting, setScannerStarting] = useState(false);
  const [scannerError, setScannerError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatusMessage, setScanStatusMessage] = useState("Align your face in the oval");
  const [scanSuccess, setScanSuccess] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // CHANGE PASSWORD STATE
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    try {
      setPasswordLoading(true);
      const { error: pwdErr } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (pwdErr) {
        setPasswordError(pwdErr.message);
      } else {
        setPasswordSuccess("Password updated successfully!");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setChangePasswordOpen(false);
          setPasswordSuccess("");
        }, 1600);
      }
    } catch (err: unknown) {
      setPasswordError(
        err instanceof Error ? err.message : "Failed to update password."
      );
    } finally {
      setPasswordLoading(false);
    }
  }

  /*
  ==========================================
  INITIAL LOAD
  ==========================================
  */
  useEffect(() => {
    loadPortalData();
  }, []);

  async function loadPortalData() {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      setUserId(user.id);

      // 1. Fetch Profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("id, school_id, role, student_id, full_name")
        .eq("id", user.id)
        .single();

      if (profileError || !profile) {
        setError("User profile not found.");
        setLoading(false);
        return;
      }

      let studentId = profile.student_id;

      // If admin testing without student_id, fallback to first student
      if (!studentId && (profile.role === "school_admin" || profile.role === "super_admin")) {
        const { data: sample } = await supabase
          .from("students")
          .select("id")
          .eq("school_id", profile.school_id)
          .limit(1)
          .single();

        if (sample) studentId = sample.id;
      }

      if (!studentId) {
        setError("No student record linked to this account.");
        setLoading(false);
        return;
      }

      // 2. Fetch School Name
      if (profile.school_id) {
        const { data: school } = await supabase
          .from("schools")
          .select("name")
          .eq("id", profile.school_id)
          .single();

        if (school?.name) setSchoolName(school.name);
      }

      // 3. Fetch Student Record
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select(`
          id,
          admission_no,
          first_name,
          last_name,
          class_id,
          section_id,
          school_id,
          status,
          classes:class_id(name),
          sections:section_id(name)
        `)
        .eq("id", studentId)
        .single();

      if (studentError || !studentData) {
        setError("Unable to load student record.");
        setLoading(false);
        return;
      }

      setStudent({
        id: studentData.id,
        admission_no: studentData.admission_no,
        first_name: studentData.first_name,
        last_name: studentData.last_name,
        class_id: studentData.class_id,
        section_id: studentData.section_id,
        school_id: studentData.school_id,
        status: studentData.status,
        class_name: (studentData.classes as unknown as { name?: string })?.name,
        section_name: (studentData.sections as unknown as { name?: string })?.name,
      });

      // 4. Fetch Face Embedding
      const { data: faceRecord } = await supabase
        .from("student_face_embeddings")
        .select("descriptor")
        .eq("student_id", studentId)
        .maybeSingle();

      if (faceRecord && faceRecord.descriptor) {
        setHasFaceSetup(true);
        setStoredDescriptor(faceRecord.descriptor as number[]);
      } else {
        setHasFaceSetup(false);
        setStoredDescriptor(null);
      }

      // 5. Fetch Today's Attendance
      const todayDate = getLocalDateString();
      const { data: todayRecord } = await supabase
        .from("attendance")
        .select("id, status, remarks, updated_at")
        .eq("student_id", studentId)
        .eq("attendance_date", todayDate)
        .maybeSingle();

      setTodayAttendance(todayRecord ?? null);

      // 6. Fetch Recent Attendance History (Last 14 days)
      const { data: historyRecords } = await supabase
        .from("attendance")
        .select("id, attendance_date, status, remarks")
        .eq("student_id", studentId)
        .order("attendance_date", { ascending: false })
        .limit(14);

      setRecentLogs((historyRecords ?? []) as AttendanceLog[]);
    } catch (err: unknown) {
      console.error("Portal load error:", err);
      setError(err instanceof Error ? err.message : "Error loading portal.");
    } finally {
      setLoading(false);
    }
  }

  /*
  ==========================================
  LOGOUT
  ==========================================
  */
  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  /*
  ==========================================
  SCANNER MODAL CONTROLS
  ==========================================
  */
  async function openScannerModal() {
    if (!hasFaceSetup || !storedDescriptor) {
      router.push("/portal/setup-face");
      return;
    }

    setScannerOpen(true);
    setScannerStarting(true);
    setScannerError("");
    setScanSuccess(false);
    setScanStatusMessage("Starting camera...");

    try {
      await loadFaceModels();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScannerStarting(false);
        startContinuousScan();
      }
    } catch (err) {
      console.error("Scanner error:", err);
      setScannerError("Unable to access webcam. Please check permissions.");
      setScannerStarting(false);
    }
  }

  function closeScannerModal() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setScannerOpen(false);
    setScanning(false);
    setScanSuccess(false);
  }

  /*
  ==========================================
  CONTINUOUS FACE VERIFICATION LOOP
  ==========================================
  */
  function startContinuousScan() {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    setScanning(true);
    setScanStatusMessage("Looking for your face...");

    scanIntervalRef.current = setInterval(async () => {
      if (
        !videoRef.current ||
        videoRef.current.paused ||
        videoRef.current.ended ||
        !storedDescriptor ||
        !student
      ) {
        return;
      }

      try {
        const scan = await extractFaceDescriptor(videoRef.current);

        if (!scan.found || !scan.descriptor) {
          setScanStatusMessage("No face detected — center your face");
          return;
        }

        setScanStatusMessage("Verifying identity...");

        // Compare live face with enrolled face descriptor
        const match = verifyFaceMatch(storedDescriptor, scan.descriptor, 0.45);

        if (match.isMatch) {
          // STOP SCANNING LOOP ON SUCCESS
          if (scanIntervalRef.current) {
            clearInterval(scanIntervalRef.current);
            scanIntervalRef.current = null;
          }

          setScanStatusMessage(`Identity Confirmed (${match.confidencePercent}% confidence)!`);
          setScanSuccess(true);

          // SAVE ATTENDANCE TO DATABASE VIA API
          let saveSuccess = false;
          let saveErrorMessage = "";

          try {
            const apiRes = await fetch("/api/portal/attendance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                student_id: student.id,
                confidence: match.confidencePercent,
              }),
            });

            const apiData = await apiRes.json().catch(() => ({}));

            if (apiRes.ok && apiData.success) {
              saveSuccess = true;
            } else {
              saveErrorMessage = apiData.error || `HTTP ${apiRes.status}`;
            }
          } catch (e: unknown) {
            saveErrorMessage = e instanceof Error ? e.message : "Network error";
          }

          // Fallback to direct client upsert if API returned error
          if (!saveSuccess) {
            const todayDate = getLocalDateString();
            const { error: directError } = await supabase.from("attendance").upsert(
              {
                school_id: student.school_id,
                student_id: student.id,
                attendance_date: todayDate,
                status: "Present",
                remarks: "Self-marked via Facial Recognition",
                marked_by: userId || null,
                updated_at: new Date().toISOString(),
              },
              {
                onConflict: "student_id,attendance_date",
              }
            );

            if (!directError) {
              saveSuccess = true;
            } else {
              saveErrorMessage = directError.message || saveErrorMessage;
            }
          }

          if (!saveSuccess) {
            console.error("Attendance save failed:", saveErrorMessage);
            setScannerError(
              `Face matched (${match.confidencePercent}%), but database save failed: ${saveErrorMessage}`
            );
          } else {
            // Update local state immediately
            setTodayAttendance({
              status: "Present",
              remarks: "Self-marked via Facial Recognition",
              updated_at: new Date().toISOString(),
            });

            // Close modal after 1.8 seconds
            setTimeout(() => {
              closeScannerModal();
              loadPortalData();
            }, 1800);
          }
        } else {
          setScanStatusMessage("Face does not match registered profile. Please look directly.");
        }
      } catch (err) {
        console.error("Continuous scan error:", err);
      }
    }, 450);
  }

  // Attendance stats calculation
  const totalLogs = recentLogs.length;
  const presentCount = recentLogs.filter((l) => l.status === "Present").length;
  const attendanceRate = totalLogs > 0 ? Math.round((presentCount / totalLogs) * 100) : 100;

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800">
      {/* HEADER NAVBAR */}
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
              <GraduationCap size={22} />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900">{schoolName}</h1>
              <p className="text-xs text-slate-500">Student Portal</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setPasswordError("");
                setPasswordSuccess("");
                setChangePasswordOpen(true);
              }}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 hover:text-blue-600"
            >
              <KeyRound size={15} />
              Change Password
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-red-600"
            >
              <LogOut size={16} />
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-5xl px-6 py-8">
        {/* LOADING STATE */}
        {loading && (
          <div className="flex min-h-[300px] flex-col items-center justify-center">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">Loading student profile...</p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle size={18} />
              Notice
            </div>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        {!loading && student && (
          <div className="space-y-6">
            {/* STUDENT HERO CARD */}
            <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xs md:p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-md">
                    {student.first_name[0]}
                    {student.last_name ? student.last_name[0] : ""}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-slate-900">
                        {student.first_name} {student.last_name ?? ""}
                      </h2>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                        {student.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      Admission #{student.admission_no} • {student.class_name ?? "Class"} - {student.section_name ?? "Section"}
                    </p>
                  </div>
                </div>

                {/* BIOMETRIC BADGE */}
                <div className="flex flex-col items-start gap-2 md:items-end">
                  {hasFaceSetup ? (
                    <div className="flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-xs font-semibold text-emerald-800">
                      <ShieldCheck size={18} className="text-emerald-600" />
                      Face ID Enrolled & Active
                      <Link
                        href="/portal/setup-face"
                        className="ml-2 text-blue-600 underline hover:text-blue-800"
                      >
                        Update
                      </Link>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800">
                      <AlertCircle size={18} className="text-amber-600" />
                      Face Setup Incomplete
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ONE-TIME SETUP ALERT IF NOT REGISTERED */}
            {!hasFaceSetup && (
              <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-6 shadow-xs md:flex-row md:items-center">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-500 p-2.5 text-white">
                    <ScanFace size={24} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-amber-900">
                      One-Time Facial Registration Required
                    </h3>
                    <p className="mt-0.5 text-xs text-amber-700">
                      You must register your face template once before you can use the AI camera check-in system.
                    </p>
                  </div>
                </div>

                <Link
                  href="/portal/setup-face"
                  className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-amber-700"
                >
                  <Sparkles size={16} />
                  Complete Face Setup Now
                </Link>
              </div>
            )}

            {/* ATTENDANCE SECTION */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {/* TODAY'S ATTENDANCE STATUS CARD (2 cols) */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs md:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarCheck size={20} className="text-blue-600" />
                    <h3 className="font-bold text-slate-900">Today&apos;s Attendance</h3>
                  </div>
                  <span className="text-xs font-medium text-slate-500">
                    {new Date().toLocaleDateString(undefined, {
                      weekday: "long",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>

                {todayAttendance?.status === "Present" ? (
                  /* ALREADY MARKED PRESENT */
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50/60 p-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
                      <CheckCircle2 size={36} />
                    </div>
                    <h4 className="mt-3 text-xl font-bold text-emerald-900">
                      Attendance Marked: PRESENT
                    </h4>
                    <p className="mt-1 text-xs text-emerald-700">
                      {todayAttendance.remarks || "Marked via Facial Recognition"}
                    </p>
                    <p className="mt-2 text-[11px] text-slate-400">
                      Recorded for today. You are all set!
                    </p>
                  </div>
                ) : (
                  /* NOT MARKED YET */
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                      <ScanFace size={30} />
                    </div>
                    <h4 className="mt-3 text-lg font-bold text-slate-800">
                      Not Checked In Yet
                    </h4>
                    <p className="mt-1 max-w-sm text-xs text-slate-500">
                      Look into your camera to verify your face and instantly record today&apos;s attendance.
                    </p>

                    <button
                      onClick={openScannerModal}
                      disabled={!hasFaceSetup}
                      className="mt-5 flex items-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Camera size={18} />
                      Scan Face to Mark Attendance
                    </button>

                    {!hasFaceSetup && (
                      <p className="mt-2 text-[11px] text-amber-600">
                        * Please complete Face Setup first above.
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* MONTHLY SUMMARY METRIC (1 col) */}
              <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
                <div>
                  <div className="flex items-center gap-2 text-slate-700">
                    <Clock size={18} className="text-blue-600" />
                    <h3 className="font-bold">Recent Record</h3>
                  </div>

                  <div className="mt-6 text-center">
                    <div className="inline-flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-600 bg-blue-50 text-2xl font-extrabold text-blue-700">
                      {attendanceRate}%
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      Presence Rate
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {presentCount} of {totalLogs} recorded sessions present
                    </p>
                  </div>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-4 text-center">
                  <Link
                    href="/test-face"
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Open AI Model Test Sandbox &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* RECENT ATTENDANCE HISTORY TABLE */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History size={18} className="text-slate-600" />
                  <h3 className="font-bold text-slate-900">Recent Attendance Logs</h3>
                </div>
                <span className="text-xs text-slate-400">Last 14 entries</span>
              </div>

              {recentLogs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No previous attendance records found.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400">
                        <th className="pb-3 font-semibold">Date</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 font-semibold">Verification Method</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="py-3 font-medium text-slate-800">
                            {new Date(log.attendance_date).toLocaleDateString(undefined, {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                log.status === "Present"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : log.status === "Late"
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 text-slate-500">
                            {log.remarks || "Regular Entry"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ========================================================
          LIVE FACE SCANNER MODAL FOR ATTENDANCE
      ======================================================== */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* CLOSE BUTTON */}
            <button
              onClick={closeScannerModal}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                Facial Attendance Check-In
              </h3>
              <p className="text-xs text-slate-500">
                Hold your face steadily in front of the camera to verify.
              </p>
            </div>

            {/* VIDEO VIEWFINDER */}
            <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-slate-900">
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="h-full w-full object-cover"
              />

              {scannerStarting && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/80 text-white">
                  <Loader2 size={32} className="animate-spin text-blue-500" />
                  <p className="mt-2 text-xs font-semibold">Warming up AI models & camera...</p>
                </div>
              )}

              {/* CIRCLE TARGET GUIDELINE */}
              {!scannerStarting && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={`relative h-56 w-56 rounded-full border-4 transition-all duration-300 ${
                      scanSuccess
                        ? "border-emerald-400 bg-emerald-500/20 shadow-[0_0_32px_rgba(52,211,153,0.8)]"
                        : "border-blue-400/80 bg-blue-500/5 shadow-[0_0_16px_rgba(96,165,250,0.4)]"
                    }`}
                  >
                    {scanSuccess && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <CheckCircle2 size={64} className="text-emerald-400 animate-bounce" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* LIVE STATUS BANNER */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900/85 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur-md">
                {scanStatusMessage}
              </div>
            </div>

            {scannerError && (
              <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                {scannerError}
              </div>
            )}

            <div className="mt-4 text-center">
              <p className="text-[11px] text-slate-400">
                Verifying 1-to-1 Euclidean distance with student ID #{student?.admission_no}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          CHANGE PASSWORD MODAL
      ======================================================== */}
      {changePasswordOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl">
            {/* CLOSE BUTTON */}
            <button
              onClick={() => setChangePasswordOpen(false)}
              className="absolute right-4 top-4 rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            >
              <X size={20} />
            </button>

            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                <Lock size={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Change Password
                </h3>
                <p className="text-xs text-slate-500">
                  Set a new password for your portal account
                </p>
              </div>
            </div>

            {passwordError && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-700">
                {passwordSuccess}
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min. 6 characters)"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setChangePasswordOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                >
                  {passwordLoading && <Loader2 size={14} className="animate-spin" />}
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
