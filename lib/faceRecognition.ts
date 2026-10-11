"use client";

// Dynamic import holder for face-api
let faceapiInstance: typeof import("@vladmandic/face-api") | null = null;
let modelsLoadedPromise: Promise<boolean> | null = null;

/**
 * Dynamically loads @vladmandic/face-api and initializes the neural network weights from /models
 */
export async function getFaceApi() {
  if (typeof window === "undefined") {
    throw new Error("face-api can only run in the browser client.");
  }

  if (!faceapiInstance) {
    faceapiInstance = await import("@vladmandic/face-api");
  }

  return faceapiInstance;
}

/**
 * Loads models from /models directory (cached)
 */
export async function loadFaceModels(): Promise<boolean> {
  if (modelsLoadedPromise) {
    return modelsLoadedPromise;
  }

  modelsLoadedPromise = (async () => {
    const faceapi = await getFaceApi();
    const MODEL_URL = "/models";

    try {
      // Load SSD MobileNet (accurate single face detector) + 68 landmarks + 128-d recognition net
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      return true;
    } catch (err) {
      console.error("Failed to load face-api models from /models:", err);
      modelsLoadedPromise = null;
      throw err;
    }
  })();

  return modelsLoadedPromise;
}

export type FaceScanResult = {
  found: boolean;
  descriptor?: number[];
  detectionBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score?: number;
};

/**
 * Scans an HTML image, canvas, or video element and extracts the 128-d descriptor vector for a single face
 */
export async function extractFaceDescriptor(
  input: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
): Promise<FaceScanResult> {
  const faceapi = await getFaceApi();
  await loadFaceModels();

  // Detect single face with landmarks & 128-d descriptor
  const detection = await faceapi
    .detectSingleFace(
      input,
      new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
    )
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) {
    return { found: false };
  }

  const box = detection.detection.box;

  return {
    found: true,
    descriptor: Array.from(detection.descriptor),
    detectionBox: {
      x: Math.round(box.x),
      y: Math.round(box.y),
      width: Math.round(box.width),
      height: Math.round(box.height),
    },
    score: Math.round(detection.detection.score * 100) / 100,
  };
}

/**
 * Calculates Euclidean distance between two 128-d face vectors.
 * Lower distance = closer match.
 * Standard benchmark threshold:
 * - distance <= 0.45: SAME PERSON (Match)
 * - distance > 0.45: DIFFERENT PERSON (Mismatch)
 */
export function verifyFaceMatch(
  storedDescriptor: number[],
  liveDescriptor: number[],
  threshold = 0.45
): {
  isMatch: boolean;
  distance: number;
  confidencePercent: number;
} {
  if (
    !storedDescriptor ||
    !liveDescriptor ||
    storedDescriptor.length !== 128 ||
    liveDescriptor.length !== 128
  ) {
    return {
      isMatch: false,
      distance: 1.0,
      confidencePercent: 0,
    };
  }

  // Calculate Euclidean Distance: sqrt(sum((a_i - b_i)^2))
  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = storedDescriptor[i] - liveDescriptor[i];
    sum += diff * diff;
  }
  const distance = Math.sqrt(sum);

  // Confidence calculation percentage
  const confidencePercent = Math.max(
    0,
    Math.min(
      100,
      Math.round((1 - distance / (threshold * 1.8)) * 100)
    )
  );

  return {
    isMatch: distance <= threshold,
    distance: Math.round(distance * 1000) / 1000,
    confidencePercent,
  };
}
