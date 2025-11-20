import { SaveStateData, RoutineConfig } from "@/types/routine";
import * as LZString from "lz-string";

export interface SharedRoutineData {
  category: RoutineConfig["category"];
  skills: any[]; // placedSkills for this category
  positionIcons: any[]; // position icons for the formation
  arrows: any[]; // arrows for the formation
  notes: Record<string, string>; // notes for this category
  segments: Record<string, string>; // segmentNames for this category
  config: {
    bpm: number;
    length: number;
    category: RoutineConfig["category"];
    level: import("@/types/routine").SkillLevel;
  };
}

export const encodeSharedRoutine = (data: SharedRoutineData): string => {
  try {
    const jsonString = JSON.stringify(data);
    // Use LZString but with simpler data structure to keep URL shorter
    const compressed = LZString.compressToEncodedURIComponent(jsonString);
    return compressed;
  } catch (error) {
    console.error("Error encoding shared routine data:", error);
    return "";
  }
};

export const decodeSharedRoutine = (encodedData: string): SharedRoutineData | null => {
  try {
    if (!encodedData) return null;

    const decompressed = LZString.decompressFromEncodedURIComponent(encodedData);
    if (!decompressed) return null;

    const parsed = JSON.parse(decompressed);
    return parsed;
  } catch (error) {
    console.error("Error decoding shared routine data:", error);
    return null;
  }
};

export const getSharedRoutineFromUrl = (): SharedRoutineData | null => {
  const hash = window.location.hash.substring(1);

  if (!hash) return null;

  if (hash.startsWith('routine=')) {
    const encodedData = hash.substring(8); // Remove "routine=" prefix
    return decodeSharedRoutine(decodeURIComponent(encodedData));
  }

  return null;
};

export const createShareableUrl = async (data: SharedRoutineData): Promise<string> => {
  // First encode the routine data
  const encodedData = encodeSharedRoutine(data);
  if (!encodedData) return "";

  // Create the full URL with the encoded data
  const currentUrl = new URL(window.location.href);
  currentUrl.hash = `routine=${encodeURIComponent(encodedData)}`;
  const fullUrl = currentUrl.toString();

  // Note: URLs with ~30k+ characters exceed all URL shortening service limits
  // The sharing functionality still works perfectly with the full URL
  console.log(`Created shareable URL (${fullUrl.length} characters): ${fullUrl.substring(0, 100)}${fullUrl.length > 100 ? '...' : ''}`);

  return fullUrl;
};
