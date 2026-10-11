"use client";

import { useEffect, useRef, useState } from "react";
import {
  BrainCircuit,
  CheckCircle2,
  FileCode2,
  HelpCircle,
  Loader2,
  Play,
  RefreshCw,
  ScanFace,
  Upload,
  UserCheck,
  UserX,
  XCircle,
} from "lucide-react";
import {
  loadFaceModels,
  extractFaceDescriptor,
  verifyFaceMatch,
  FaceScanResult,
} from "@/lib/faceRecognition";

export default function TestFacePage() {
  const [modelsLoading, setModelsLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const [modelsReady, setModelsReady] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"image" | "math">("image");

  // Image comparison state
  const [imgAUrl, setImgAUrl] = useState<string | null>(null);
  const [imgBUrl, setImgBUrl] = useState<string | null>(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [resultA, setResultA] = useState<FaceScanResult | null>(null);
  const [resultB, setResultB] = useState<FaceScanResult | null>(null);
  const [matchResult, setMatchResult] = useState<{
    isMatch: boolean;
    distance: number;
    confidencePercent: number;
  } | null>(null);

  const imgRefA = useRef<HTMLImageElement | null>(null);
  const imgRefB = useRef<HTMLImageElement | null>(null);

  // Math test state
  const [mathResults, setMathResults] = useState<Array<{
    name: string;
    description: string;
    distance: number;
    confidence: number;
    passed: boolean;
    expected: string;
  }> | null>(null);

  /*
  ==========================================
  LOAD MODELS ON MOUNT
  ==========================================
  */
  useEffect(() => {
    async function initModels() {
      try {
        setModelsLoading(true);
        setModelError("");
        await loadFaceModels();
        setModelsReady(true);
      } catch (err: unknown) {
        console.error("Model load error:", err);
        setModelError(
          err instanceof Error
            ? err.message
            : "Failed to load neural network weights from /models"
        );
      } finally {
        setModelsLoading(false);
      }
    }

    initModels();
  }, []);

  /*
  ==========================================
  HANDLE IMAGE UPLOADS
  ==========================================
  */
  function handleFileUpload(
    e: React.ChangeEvent<HTMLInputElement>,
    slot: "A" | "B"
  ) {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    if (slot === "A") {
      setImgAUrl(url);
      setResultA(null);
    } else {
      setImgBUrl(url);
      setResultB(null);
    }
    setMatchResult(null);
  }

  /*
  ==========================================
  RUN FACE COMPARISON ON STATIC IMAGES
  ==========================================
  */
  async function runComparison() {
    if (!imgRefA.current || !imgRefB.current) {
      alert("Please upload both images before analyzing.");
      return;
    }

    try {
      setAnalyzing(true);
      setMatchResult(null);

      // Extract from Image A
      const resA = await extractFaceDescriptor(imgRefA.current);
      setResultA(resA);

      // Extract from Image B
      const resB = await extractFaceDescriptor(imgRefB.current);
      setResultB(resB);

      if (resA.found && resA.descriptor && resB.found && resB.descriptor) {
        const match = verifyFaceMatch(resA.descriptor, resB.descriptor);
        setMatchResult(match);
      }
    } catch (err) {
      console.error("Comparison error:", err);
      alert("Error processing facial recognition on images.");
    } finally {
      setAnalyzing(false);
    }
  }

  /*
  ==========================================
  RUN STATIC VECTOR MATH BENCHMARK
  ==========================================
  */
  function runMathBenchmark() {
    // 1. Identical Vector (Exact same face)
    const vector1 = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.15));
    const test1 = verifyFaceMatch(vector1, [...vector1]);

    // 2. Minor Natural Variation (Same face, slight expression/noise)
    const vector2 = vector1.map((v) => v + (Math.random() * 0.04 - 0.02));
    const test2 = verifyFaceMatch(vector1, vector2);

    // 3. Different Person (Impostor face)
    const vector3 = Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.35));
    const test3 = verifyFaceMatch(vector1, vector3);

    setMathResults([
      {
        name: "Test 1: Exact Self-Match",
        description: "Testing identical 128-d vector (same person, zero noise)",
        distance: test1.distance,
        confidence: test1.confidencePercent,
        passed: test1.isMatch && test1.distance === 0,
        expected: "Distance: 0.00 | Confidence: 100% | Match: TRUE",
      },
      {
        name: "Test 2: Natural Pose/Lighting Variation",
        description: "Testing same person vector with simulated sensor noise",
        distance: test2.distance,
        confidence: test2.confidencePercent,
        passed: test2.isMatch && test2.distance < 0.25,
        expected: "Distance: < 0.25 | Confidence: > 75% | Match: TRUE",
      },
      {
        name: "Test 3: Impostor / Different Student",
        description: "Testing completely different vector against registered student",
        distance: test3.distance,
        confidence: test3.confidencePercent,
        passed: !test3.isMatch,
        expected: "Distance: > 0.60 | Confidence: 0% | Match: FALSE",
      },
    ]);
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-blue-100 p-2 text-blue-600">
                <BrainCircuit size={24} />
              </span>
              <h1 className="text-2xl font-bold text-slate-900">
                AI Single-Face Model Test Harness
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              FYP verification module: test neural network model weights, 128-d descriptor extraction, and Euclidean distance verification.
            </p>
          </div>

          {/* MODEL STATUS BADGE */}
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
            {modelsLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-blue-600" />
                <span className="text-slate-600">Loading Weights (/models)...</span>
              </>
            ) : modelsReady ? (
              <>
                <CheckCircle2 size={16} className="text-emerald-600" />
                <span className="font-semibold text-emerald-700">
                  ResNet-34 + SSD MobileNet Ready
                </span>
              </>
            ) : (
              <>
                <XCircle size={16} className="text-red-600" />
                <span className="font-semibold text-red-600">
                  {modelError || "Model Failed"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* TABS */}
        <div className="mb-6 flex gap-3 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab("image")}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "image"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <ScanFace size={16} />
            Test 1: Static Image Face Recognition
          </button>
          <button
            onClick={() => {
              setActiveTab("math");
              if (!mathResults) runMathBenchmark();
            }}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "math"
                ? "bg-blue-600 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileCode2 size={16} />
            Test 2: 128-D Euclidean Vector Benchmark
          </button>
        </div>

        {/* TAB 1: STATIC IMAGE FACE SCANNING */}
        {activeTab === "image" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* IMAGE A: ENROLLED FACE */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    Slot A: Registered Student Face
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Baseline
                  </span>
                </div>

                <div className="flex min-h-[240px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                  {imgAUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={imgRefA}
                        src={imgAUrl}
                        alt="Slot A"
                        className="max-h-60 rounded-lg object-contain"
                      />
                      {resultA?.found && resultA.detectionBox && (
                        <div
                          className="absolute border-2 border-emerald-500 bg-emerald-500/20"
                          style={{
                            left: `${resultA.detectionBox.x}px`,
                            top: `${resultA.detectionBox.y}px`,
                            width: `${resultA.detectionBox.width}px`,
                            height: `${resultA.detectionBox.height}px`,
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        Upload a front-facing student photo
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                    Choose Image A
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "A")}
                      className="hidden"
                    />
                  </label>

                  {resultA && (
                    <span
                      className={`text-xs font-semibold ${
                        resultA.found ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {resultA.found
                        ? `Face Found (Score: ${Math.round((resultA.score ?? 0) * 100)}%)`
                        : "No Face Detected"}
                    </span>
                  )}
                </div>

                {resultA?.descriptor && (
                  <div className="mt-3 rounded-lg bg-slate-100 p-2.5 text-[11px] font-mono text-slate-600">
                    <p className="font-semibold text-slate-700">128-D Vector (Sample 6 floats):</p>
                    [{resultA.descriptor.slice(0, 6).map((n) => n.toFixed(3)).join(", ")}, ...]
                  </div>
                )}
              </div>

              {/* IMAGE B: VERIFICATION FACE */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">
                    Slot B: Attendance Check-in Face
                  </h3>
                  <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    Test Subject
                  </span>
                </div>

                <div className="flex min-h-[240px] flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-4">
                  {imgBUrl ? (
                    <div className="relative">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        ref={imgRefB}
                        src={imgBUrl}
                        alt="Slot B"
                        className="max-h-60 rounded-lg object-contain"
                      />
                      {resultB?.found && resultB.detectionBox && (
                        <div
                          className="absolute border-2 border-blue-500 bg-blue-500/20"
                          style={{
                            left: `${resultB.detectionBox.x}px`,
                            top: `${resultB.detectionBox.y}px`,
                            width: `${resultB.detectionBox.width}px`,
                            height: `${resultB.detectionBox.height}px`,
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload size={32} className="mx-auto mb-2 text-slate-400" />
                      <p className="text-xs text-slate-500">
                        Upload another photo to test match
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <label className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200">
                    Choose Image B
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e, "B")}
                      className="hidden"
                    />
                  </label>

                  {resultB && (
                    <span
                      className={`text-xs font-semibold ${
                        resultB.found ? "text-emerald-600" : "text-red-500"
                      }`}
                    >
                      {resultB.found
                        ? `Face Found (Score: ${Math.round((resultB.score ?? 0) * 100)}%)`
                        : "No Face Detected"}
                    </span>
                  )}
                </div>

                {resultB?.descriptor && (
                  <div className="mt-3 rounded-lg bg-slate-100 p-2.5 text-[11px] font-mono text-slate-600">
                    <p className="font-semibold text-slate-700">128-D Vector (Sample 6 floats):</p>
                    [{resultB.descriptor.slice(0, 6).map((n) => n.toFixed(3)).join(", ")}, ...]
                  </div>
                )}
              </div>
            </div>

            {/* ACTION BUTTON */}
            <div className="text-center">
              <button
                onClick={runComparison}
                disabled={!imgAUrl || !imgBUrl || analyzing || !modelsReady}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-md transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Extracting 128-D Descriptors & Comparing...
                  </>
                ) : (
                  <>
                    <ScanFace size={18} />
                    Compare Static Faces (Run 1-to-1 Match)
                  </>
                )}
              </button>
            </div>

            {/* MATCH RESULT CARD */}
            {matchResult && (
              <div
                className={`rounded-2xl border p-6 shadow-sm transition ${
                  matchResult.isMatch
                    ? "border-emerald-200 bg-emerald-50/70"
                    : "border-red-200 bg-red-50/70"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-2xl p-3 text-white ${
                      matchResult.isMatch ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  >
                    {matchResult.isMatch ? <UserCheck size={28} /> : <UserX size={28} />}
                  </div>

                  <div className="flex-1">
                    <h3
                      className={`text-xl font-bold ${
                        matchResult.isMatch ? "text-emerald-900" : "text-red-900"
                      }`}
                    >
                      {matchResult.isMatch
                        ? "VERIFIED: Same Student (Face Match Confirmed)"
                        : "REJECTED: Face Mismatch (Different Person)"}
                    </h3>

                    <p className="mt-1 text-sm text-slate-600">
                      {matchResult.isMatch
                        ? `The facial vector distance is within the accepted threshold (<= 0.45). This student would be marked Present.`
                        : `The facial vector distance exceeds the threshold. The system would reject this check-in.`}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-white p-3 shadow-xs">
                        <p className="text-xs text-slate-500">Euclidean Distance</p>
                        <p className="text-lg font-bold text-slate-900">
                          {matchResult.distance}
                        </p>
                        <p className="text-[10px] text-slate-400">Target: &le; 0.45</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 shadow-xs">
                        <p className="text-xs text-slate-500">Match Confidence</p>
                        <p className="text-lg font-bold text-slate-900">
                          {matchResult.confidencePercent}%
                        </p>
                        <p className="text-[10px] text-slate-400">Statistical similarity</p>
                      </div>

                      <div className="rounded-xl bg-white p-3 shadow-xs">
                        <p className="text-xs text-slate-500">Decision Status</p>
                        <p
                          className={`text-lg font-bold ${
                            matchResult.isMatch ? "text-emerald-600" : "text-red-600"
                          }`}
                        >
                          {matchResult.isMatch ? "AUTHENTICATED" : "REJECTED"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VECTOR BENCHMARK */}
        {activeTab === "math" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Static 128-D Vector Euclidean Metric Verification
                  </h3>
                  <p className="text-xs text-slate-500">
                    Verifies that the distance formula accurately differentiates identical faces, natural variations, and impostor vectors.
                  </p>
                </div>
                <button
                  onClick={runMathBenchmark}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
                >
                  <RefreshCw size={14} />
                  Rerun Tests
                </button>
              </div>

              <div className="mt-4 space-y-4">
                {mathResults?.map((test, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-2 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white ${
                            test.passed ? "bg-emerald-600" : "bg-red-600"
                          }`}
                        >
                          {test.passed ? "✓" : "✗"}
                        </span>
                        <h4 className="font-semibold text-slate-800">{test.name}</h4>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{test.description}</p>
                      <p className="text-[11px] font-mono text-slate-400">
                        {test.expected}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-slate-400">Calculated Distance</p>
                        <p className="font-mono font-bold text-slate-800">
                          {test.distance}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Confidence</p>
                        <p className="font-mono font-bold text-slate-800">
                          {test.confidence}%
                        </p>
                      </div>
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold ${
                          test.passed
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {test.passed ? "PASSED" : "FAILED"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
