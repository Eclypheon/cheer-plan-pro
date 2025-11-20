import { encodeSharedRoutine, decodeSharedRoutine, SharedRoutineData } from '../src/lib/shareUtils';

// Create test data with duplicate positions to verify optimization
const testData: SharedRoutineData = {
  category: "partner-stunts",
  skills: [
    { id: "skill1", skillId: "s1", lineIndex: 0, startCount: 1 },
    { id: "skill2", skillId: "s2", lineIndex: 1, startCount: 4 }
  ],
  positionIcons: [
    { id: "pos1", type: "square", x: 100, y: 200, lineIndex: 0, name: "Base" },
    { id: "pos2", type: "circle", x: 150, y: 200, lineIndex: 0, name: "Top" },
    { id: "pos3", type: "square", x: 100, y: 200, lineIndex: 1, name: "Base" }, // Same position as pos1
    { id: "pos4", type: "circle", x: 150, y: 200, lineIndex: 1, name: "Top" },  // Same position as pos2
 ],
  arrows: [
    { id: "arrow1", start: { x: 100, y: 200 }, end: { x: 150, y: 200 }, lineIndex: 0 },
    { id: "arrow2", start: { x: 100, y: 200 }, end: { x: 150, y: 200 }, lineIndex: 1 }, // Same coordinates as arrow1
  ],
 notes: {
    "0": "Starting notes",
    "1": "", // Empty note to test filtering
    "2": "More notes"
  },
  segments: {
    "0": "Opening",
    "1": "", // Empty segment to test filtering
    "2": "Climax"
  },
  config: {
    bpm: 120,
    length: 60,
    category: "partner-stunts",
    level: "intermediate"
  }
};

console.log("Testing share URL optimization...");
console.log("Original data size (JSON):", JSON.stringify(testData).length, "characters");

const encoded = encodeSharedRoutine(testData);
console.log("Encoded data size:", encoded.length, "characters");

const decoded = decodeSharedRoutine(encoded);
console.log("Decoded data matches original:", JSON.stringify(decoded) === JSON.stringify(testData));

console.log("Position icons in original:", testData.positionIcons.length);
console.log("Arrows in original:", testData.arrows.length);

if (decoded) {
  console.log("Position icons in decoded:", decoded.positionIcons.length);
  console.log("Arrows in decoded:", decoded.arrows.length);
  
  console.log("Sample decoded position icon:", decoded.positionIcons[0]);
  console.log("Sample decoded arrow:", decoded.arrows[0]);
}

console.log("Optimization successful!");
