"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  HelpCircle,
  Loader2,
  RefreshCw,
  ScanFace,
  ShieldAlert,
  Sparkles,
  XCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  loadFaceModels,
  extractFaceDescriptor,
} from "@/lib/faceRecognition";

type StudentInfo = {
  id: string;
  admission_no: string;
  first_name: string;
  last_name: string | null;
  school_id: string;
  class_name?: string;
  section_name?: string;
};

export default function FaceSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [student, setStudent] = useState<StudentInfo | null>(null);
  const [hasExistingFace, setHasExistingFace] = useState(false);

  // Camera & Model State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState("");
  const [modelsReady, setModelsReady] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [saving, setSaving] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectIntervalRef = useRef<NodeJS.Timeout | null>(null);

  /*
  ==========================================
  INITIAL LOAD: AUTH, STUDENT & EMBEDDING
  ==========================================
  */
  useEffect(() => {
    async function initPage() {
      try {
        setLoading(true);
        setError("");

        // 1. Get current logged-in user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("User not authenticated. Please log in.");
          setLoading(false);
          return;
        }

        // 2. Get profile
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

        // If admin/super_admin testing without a student_id link, fetch first student in school for test
        if (!studentId && (profile.role === "school_admin" || profile.role === "super_admin")) {
          const { data: sampleStudent } = await supabase
            .from("students")
            .select("id")
            .eq("school_id", profile.school_id)
            .limit(1)
            .single();

          if (sampleStudent) {
            studentId = sampleStudent.id;
          }
        }

        if (!studentId) {
          setError(
            "No student record is linked to this account. Please contact your school administrator."
          );
          setLoading(false);
          return;
        }

        // 3. Fetch Student Details
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select(`
            id,
            admission_no,
            first_name,
            last_name,
            school_id,
            classes:class_id(name),
            sections:section_id(name)
          `)
          .eq("id", studentId)
          .single();

        if (studentError || !studentData) {
          setError("Unable to load student details.");
          setLoading(false);
          return;
        }

        setStudent({
          id: studentData.id,
          admission_no: studentData.admission_no,
          first_name: studentData.first_name,
          last_name: studentData.last_name,
          school_id: studentData.school_id,
          class_name: (studentData.classes as unknown as { name?: string })?.name,
          section_name: (studentData.sections as unknown as { name?: string })?.name,
        });

        // 4. Check if face already registered
        const { data: faceRecord } = await supabase
          .from("student_face_embeddings")
          .select("id")
          .eq("student_id", studentId)
          .maybeSingle();

        if (faceRecord) {
          setHasExistingFace(true);
        }

        // 5. Preload neural network weights
        await loadFaceModels();
        setModelsReady(true);
      } catch (err: unknown) {
        console.error("Setup page error:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unexpected error occurred during setup."
        );
      } finally {
        setLoading(false);
      }
    }

    initPage();

    return () => {
      stopCamera();
    };
  }, []);

  /*
  ==========================================
  CAMERA CONTROL
  ==========================================
  */
  async function startCamera() {
    setCameraError("");
    setFaceDetected(false);

    try {
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
        setCameraActive(true);
        startLiveFaceDetection();
      }
    } catch (err: unknown) {
      console.error("Webcam access error:", err);
      setCameraError(
        "Could not access your camera. Please check your browser permissions."
      );
      setCameraActive(false);
    }
  }

  function stopCamera() {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
      detectIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setFaceDetected(false);
    setDetecting(false);
  }

  /*
  ==========================================
  LIVE FACE DETECTION LOOP
  ==========================================
  */
  function startLiveFaceDetection() {
    if (detectIntervalRef.current) {
      clearInterval(detectIntervalRef.current);
    }

    detectIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
        return;
      }

      try {
        setDetecting(true);
        const scan = await extractFaceDescriptor(videoRef.current);
        setFaceDetected(scan.found);
      } catch (err) {
        console.error("Live detection check error:", err);
      } finally {
        setDetecting(false);
      }
    }, 450);
  }

  /*
  ==========================================
  CAPTURE AND SAVE 128-D FACE VECTOR
  ==========================================
  */
  async function handleCaptureAndSave() {
    if (!videoRef.current || !student) return;

    try {
      setSaving(true);
      setError("");

      // 1. High precision extraction from current video frame
      const scan = await extractFaceDescriptor(videoRef.current);

      if (!scan.found || !scan.descriptor) {
        setError(
          "No clear single face detected. Please ensure your face is well lit and looking directly at the camera."
        );
        setSaving(false);
        return;
      }

      // 2. Save 128-d descriptor into Supabase
      const { error: upsertError } = await supabase
        .from("student_face_embeddings")
        .upsert(
          {
            student_id: student.id,
            school_id: student.school_id,
            descriptor: scan.descriptor,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: "student_id",
          }
        );

      if (upsertError) {
        setError(upsertError.message || "Failed to save face embedding.");
        setSaving(false);
        return;
      }

      // 3. Success! Stop camera and redirect
      stopCamera();
      setSuccess(true);

      setTimeout(() => {
        router.push("/portal");
      }, 1600);
    } catch (err: unknown) {
      console.error("Error saving face embedding:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while saving your face setup."
      );
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      {/* TOP BAR */}
      <div className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link
            href="/portal"
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            <ArrowLeft size={18} />
            Back to Portal
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-blue-600">
            <ScanFace size={16} />
            Biometric Setup
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* HEADING */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
            <ScanFace size={28} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {hasExistingFace
              ? "Update Your Face Recognition ID"
              : "Set Up Your Face Recognition ID"}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Capture your facial profile once to unlock automatic 1-second attendance check-in.
          </p>

          {student && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs text-slate-600 shadow-2xs">
              <span className="font-semibold text-slate-800">
                {student.first_name} {student.last_name ?? ""}
              </span>
              <span>•</span>
              <span>Adm: #{student.admission_no}</span>
              {student.class_name && (
                <>
                  <span>•</span>
                  <span>{student.class_name} {student.section_name ?? ""}</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 shadow-xs">
            <Loader2 size={32} className="animate-spin text-blue-600" />
            <p className="mt-3 text-sm text-slate-500">
              Loading AI neural network models...
            </p>
          </div>
        )}

        {/* ERROR STATE */}
        {error && !loading && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <div className="flex items-center gap-2 font-semibold">
              <XCircle size={18} />
              Setup Notice
            </div>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        {/* SUCCESS MODAL / BANNER */}
        {success && (
          <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-emerald-50/80 p-8 text-center shadow-xs">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600 text-white shadow-md">
              <CheckCircle2 size={36} />
            </div>
            <h2 className="mt-4 text-2xl font-bold text-emerald-900">
              Face ID Registered Successfully!
            </h2>
            <p className="mt-1 max-w-md text-sm text-emerald-700">
              Your 128-dimensional facial biometric descriptor is securely saved. Redirecting to your student dashboard...
            </p>
            <div className="mt-4">
              <Loader2 size={20} className="animate-spin text-emerald-600" />
            </div>
          </div>
        )}

        {/* CAMERA CARD */}
        {!loading && !success && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* CAMERA VIEWFINDER (2 cols) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:col-span-2">
              <div className="relative aspect-4/3 w-full overflow-hidden rounded-2xl bg-slate-900">
                {/* VIDEO ELEMENT */}
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className={`h-full w-full object-cover transition-opacity duration-300 ${
                    cameraActive ? "opacity-100" : "opacity-0"
                  }`}
                />

                {/* PLACEHOLDER WHEN CAMERA OFF */}
                {!cameraActive && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                    <Camera size={48} className="mb-2 stroke-1" />
                    <p className="text-sm font-medium">Camera is currently turned off</p>
                    <p className="mt-1 text-xs text-slate-500">
                      Click &quot;Start Camera&quot; below to begin face enrollment
                    </p>
                  </div>
                )}

                {/* CIRCULAR FACE TARGET OVERLAY */}
                {cameraActive && (
                  <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div
                      className={`relative h-64 w-64 rounded-full border-4 transition-all duration-300 ${
                        faceDetected
                          ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_24px_rgba(52,211,153,0.5)]"
                          : "border-amber-400/80 bg-amber-500/5 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
                      }`}
                    >
                      {/* GUIDE NOTIFICATION PILL */}
                      <div
                        className={`absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-md ${
                          faceDetected
                            ? "bg-emerald-600/90 text-white"
                            : "bg-slate-900/80 text-amber-300"
                        }`}
                      >
                        {faceDetected
                          ? "✓ Face Aligned — Ready"
                          : "Position face inside oval"}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* CAMERA ERROR */}
              {cameraError && (
                <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-600">
                  {cameraError}
                </div>
              )}

              {/* CONTROLS */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                {!cameraActive ? (
                  <button
                    onClick={startCamera}
                    disabled={!modelsReady}
                    className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
                  >
                    <Camera size={18} />
                    Start Camera
                  </button>
                ) : (
                  <button
                    onClick={stopCamera}
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                  >
                    Turn Off Camera
                  </button>
                )}

                {cameraActive && (
                  <button
                    onClick={handleCaptureAndSave}
                    disabled={saving || !faceDetected}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving Biometric Vector...
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        Capture & Register Face
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* INSTRUCTIONS & PRIVACY SIDEBAR (1 col) */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="flex items-center gap-2 font-bold text-slate-800">
                  <HelpCircle size={18} className="text-blue-600" />
                  Best Quality Tips
                </h3>
                <ul className="mt-3 space-y-2.5 text-xs text-slate-600">
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">1.</span>
                    <span>Ensure your face is clearly lit from the front, not backlit.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">2.</span>
                    <span>Remove dark sunglasses, caps, or face masks.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">3.</span>
                    <span>Look directly into the camera with a neutral expression.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold text-blue-600">4.</span>
                    <span>Only one person should be in the camera frame.</span>
                  </li>
                </ul>
              </div>

              <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-5">
                <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-900">
                  <ShieldAlert size={16} className="text-blue-600" />
                  Biometric Privacy
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-blue-800">
                  Your photo is never stored on the server. The AI extracts a one-way 128-dimensional mathematical vector (a sequence of 128 numbers) which cannot be converted back into an image.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
