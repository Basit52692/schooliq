// Static vector mathematical verification test
function verifyFaceMatch(storedDescriptor, liveDescriptor, threshold = 0.45) {
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

  let sum = 0;
  for (let i = 0; i < 128; i++) {
    const diff = storedDescriptor[i] - liveDescriptor[i];
    sum += diff * diff;
  }
  const distance = Math.sqrt(sum);

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

console.log("=== RUNNING STATIC VECTOR VERIFICATION TEST ===");

// 1. Identical Vector Test (Exact Same Face)
const registeredStudentVector = Array.from({ length: 128 }, (_, i) => Math.sin(i * 0.1));
const liveCheckinSameStudent = [...registeredStudentVector];

const test1 = verifyFaceMatch(registeredStudentVector, liveCheckinSameStudent);
console.log("\n[Test 1] Exact Same Face (Self-Match):");
console.log("-> Distance:", test1.distance, "(Expected: 0)");
console.log("-> Confidence:", test1.confidencePercent + "%", "(Expected: 100%)");
console.log("-> Match Result:", test1.isMatch ? "PASS (True)" : "FAIL");

// 2. Minor Lighting / Angle Variation (Same Person with slight noise)
const liveCheckinWithNoise = registeredStudentVector.map(val => val + (Math.random() * 0.04 - 0.02));
const test2 = verifyFaceMatch(registeredStudentVector, liveCheckinWithNoise);
console.log("\n[Test 2] Same Person with Natural Variation (Noise):");
console.log("-> Distance:", test2.distance, "(Expected: < 0.25)");
console.log("-> Confidence:", test2.confidencePercent + "%", "(Expected: > 70%)");
console.log("-> Match Result:", test2.isMatch ? "PASS (True)" : "FAIL");

// 3. Different Person (Completely different vector)
const differentPersonVector = Array.from({ length: 128 }, (_, i) => Math.cos(i * 0.3));
const test3 = verifyFaceMatch(registeredStudentVector, differentPersonVector);
console.log("\n[Test 3] Different Person (Impostor):");
console.log("-> Distance:", test3.distance, "(Expected: > 0.60)");
console.log("-> Confidence:", test3.confidencePercent + "%", "(Expected: low/0%)");
console.log("-> Match Result:", !test3.isMatch ? "PASS (False - Correctly Rejected)" : "FAIL");

if (test1.isMatch && test2.isMatch && !test3.isMatch) {
  console.log("\n>>> ALL 3 STATIC MATHEMATICAL TESTS PASSED PERFECTLY! <<<");
} else {
  console.error("\n>>> TESTS FAILED! <<<");
  process.exit(1);
}
