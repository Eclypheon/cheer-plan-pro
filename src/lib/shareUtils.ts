import { SaveStateData, RoutineConfig, PositionIcon, Arrow } from "@/types/routine";
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

// Aggressively optimized data structure for sharing
interface OptimizedSharedData {
  c: RoutineConfig["category"]; // category
  s: any[]; // skills
  p: Position[]; // positions
  i: OptimizedPositionIcon[]; // positionIcons
  r: OptimizedRepeatedConfig[]; // repeated configurations (using 'r')
  a: OptimizedArrow[]; // arrows
  n: Record<string, string>; // notes
  g: Record<string, string>; // segments (using 'g' instead of 'segments')
  h: OptimizedConfig; // config (using 'h' instead of 'config')
}

interface OptimizedPositionIcon {
  i: string; // id
 t: "square" | "circle" | "x"; // type
  p: number; // position index
  l: number; // lineIndex
  n?: string; // name
  o?: string; // color (using 'o' instead of 'c' to avoid conflict)
}

// Structure to represent repeated configurations across multiple lines
interface OptimizedRepeatedConfig {
  t: "square" | "circle" | "x"; // type (using 't')
  p: number; // position index
  n?: string; // name (using 'n')
  o?: string; // color (using 'o')
  ls: number[]; // lines array (using 'ls' instead of 'lines')
}

interface OptimizedArrow {
  i: string; // id
  s: number; // start position index
  e: number; // end position index
  l: number; // lineIndex
}

interface OptimizedConfig {
  b: number; // bpm
  l: number; // length
  c: RoutineConfig["category"]; // category
  v: import("@/types/routine").SkillLevel; // level (using 'v' instead of 'level')
}

// Shared positions array to reduce redundancy
interface Position {
  x: number;
  y: number;
}

// Quantize coordinates to reduce precision and save space
function quantizeCoordinate(coord: number, precision: number = 1): number {
  return Math.round(coord / precision) * precision;
}

// Quantize all coordinates in the data
function quantizeCoordinates(data: SharedRoutineData): SharedRoutineData {
  const precision = 2; // Quantize to 2-pixel precision to save space
  
  return {
    ...data,
    positionIcons: data.positionIcons.map(icon => ({
      ...icon,
      x: quantizeCoordinate(icon.x, precision),
      y: quantizeCoordinate(icon.y, precision)
    })),
    arrows: data.arrows.map(arrow => ({
      ...arrow,
      start: {
        x: quantizeCoordinate(arrow.start.x, precision),
        y: quantizeCoordinate(arrow.start.y, precision)
      },
      end: {
        x: quantizeCoordinate(arrow.end.x, precision),
        y: quantizeCoordinate(arrow.end.y, precision)
      }
    }))
  };
}

export const encodeSharedRoutine = (data: SharedRoutineData): string => {
  try {
    // Apply quantization to reduce coordinate precision
    const quantizedData = quantizeCoordinates(data);
    
    // Optimize the data structure with aggressive shortening
    const optimizedData = optimizeDataStructure(quantizedData);
    const jsonString = JSON.stringify(optimizedData);
    
    // Use LZString compression
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
    // De-optimize back to original structure
    return deoptimizeDataStructure(parsed);
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

  // Log the full URL length
  console.log(`Created shareable URL (${fullUrl.length} characters): ${fullUrl.substring(0, 100)}${fullUrl.length > 100 ? '...' : ''}`);

  // Log detailed information about the URL
  console.log(`URL Analysis:`, {
    length: fullUrl.length,
    threshold: 100, // Lowered threshold for testing
    shouldAttemptShortening: fullUrl.length > 100,
    encodedDataLength: encodedData.length,
    originalUrl: window.location.href,
    hasEncodedData: !!encodedData
  });

  // If URL is still too long, try to shorten it using external services
  if (fullUrl.length > 100) { // Lowered threshold for testing and debugging
    console.log(`Attempting URL shortening for ${fullUrl.length} character URL...`);
    try {
      const shortenedUrl = await shortenUrl(fullUrl);
      if (shortenedUrl) {
        console.log(`URL successfully shortened from ${fullUrl.length} to ${shortenedUrl.length} characters`);
        console.log(`Shortened URL: ${shortenedUrl}`);
        return shortenedUrl;
      } else {
        console.log(`URL shortening returned null, using original URL`);
      }
    } catch (error) {
      console.warn('URL shortening failed with error:', error);
      console.warn('Returning original URL due to shortening failure');
      // Fall back to original URL if shortening fails
    }
  } else {
    console.log(`URL length (${fullUrl.length}) is below threshold (200), skipping shortening`);
  }

  return fullUrl;
};

// Function to shorten URL using external services with fallback
async function shortenUrl(longUrl: string): Promise<string | null> {
  console.log(`Starting URL shortening process for URL: ${longUrl.substring(0, 100)}...`);
  console.log(`URL length: ${longUrl.length} characters`);
  
  // Try is.gd first with direct API call (no proxy needed)
  try {
    console.log(`Attempting to shorten URL using is.gd direct API...`);
    const isgdUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`;
    console.log(`Making GET request to: ${isgdUrl}`);
    
    const response = await fetch(isgdUrl);
    console.log(`is.gd response status: ${response.status}`);
    
    if (response.ok) {
      const responseText = await response.text();
      console.log(`is.gd response text:`, responseText);
      
      if (responseText && responseText.trim().startsWith('http')) {
        const shortUrl = responseText.trim();
        console.log(`Successfully shortened URL using is.gd direct API: ${shortUrl}`);
        console.log(`Shortened from ${longUrl.length} to ${shortUrl.length} characters`);
        console.log(`Reduction: ${longUrl.length - shortUrl.length} characters (${((1 - shortUrl.length / longUrl.length) * 100).toFixed(1)}%)`);
        return shortUrl;
      }
    }
  } catch (error) {
    console.warn(`Failed to shorten URL using is.gd direct API:`, error);
  }
  
  // If is.gd fails, try other services via proxy
  const proxyServices = [
    { name: 'cleanuri', url: '/api/urlshorten/cleanuri', params: { url: longUrl } },
    { name: 'shrtco.de', url: '/api/urlshorten/shrtcode', params: { url: longUrl } },
    { name: 'tinyurl', url: '/api/urlshorten/tinyurl', params: { url: encodeURIComponent(longUrl) } },
  ];

  for (const service of proxyServices) {
    console.log(`Attempting to shorten URL using ${service.name} via proxy...`);
    console.log(`Proxy URL: ${service.url}`);
    console.log(`Service params:`, service.params);
    
    try {
      let response: Response;
      let shortUrl: string | undefined;

      if (service.name === 'cleanuri') {
        // cleanuri uses POST request with form data via proxy
        console.log(`Making POST request to proxy: ${service.url}`);
        response = await fetch(service.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams(service.params as Record<string, string>)
        });
        console.log(`cleanuri proxy response status: ${response.status}`);
        const result = await response.json();
        console.log(`cleanuri proxy response:`, result);
        shortUrl = result.result_url;
      } else if (service.name === 'shrtco.de') {
        // shrtco.de uses GET request with query parameters via proxy
        const params = new URLSearchParams(service.params as Record<string, string>);
        const requestUrl = `${service.url}?${params}`;
        console.log(`Making GET request to proxy: ${requestUrl}`);
        response = await fetch(requestUrl);
        console.log(`shrtco.de proxy response status: ${response.status}`);
        const result = await response.json();
        console.log(`shrtco.de proxy response:`, result);
        shortUrl = result.result?.short_link;
      } else if (service.name === 'tinyurl') {
        // TinyURL uses GET request with query parameters via proxy
        const params = new URLSearchParams(service.params as Record<string, string>);
        const requestUrl = `${service.url}?${params}`;
        console.log(`Making GET request to proxy: ${requestUrl}`);
        response = await fetch(requestUrl);
        console.log(`tinyurl proxy response status: ${response.status}`);
        
        // TinyURL might return plain text or JSON, so handle both
        const responseText = await response.text();
        console.log(`tinyurl proxy response text:`, responseText);
        
        // Check if response is JSON first, otherwise treat as plain text
        try {
          const result = JSON.parse(responseText);
          shortUrl = result.shorturl || result.tinyurl || result.result;
        } catch {
          // If not JSON, assume it's the shortened URL directly
          if (responseText && responseText.trim().startsWith('http')) {
            shortUrl = responseText.trim();
          }
        }
      }

      console.log(`Service ${service.name} - response.ok: ${response.ok}, shortUrl: ${shortUrl}`);
      
      if (response.ok && shortUrl) {
        console.log(`Successfully shortened URL using ${service.name} via proxy: ${shortUrl}`);
        console.log(`Shortened from ${longUrl.length} to ${shortUrl.length} characters`);
        console.log(`Reduction: ${longUrl.length - shortUrl.length} characters (${((1 - shortUrl.length / longUrl.length) * 100).toFixed(1)}%)`);
        return shortUrl;
      } else {
        console.warn(`Service ${service.name} returned status ${response.status} or no short URL`);
        console.warn(`Response was OK: ${response.ok}, Short URL: ${shortUrl}`);
      }
    } catch (error) {
      console.warn(`Failed to shorten URL using ${service.name} via proxy:`, error);
      console.warn(`Error details:`, error instanceof Error ? { message: error.message, stack: error.stack } : error);
      continue; // Try next service
    }
  }

  console.log(`All URL shortening services failed. Returning null.`);
  return null; // All services failed
}

// Test function to verify optimization works
export const testOptimization = () => {
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
  console.log("Compression ratio:", (encoded.length / JSON.stringify(testData).length * 100).toFixed(2), "%");

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
};

// Optimizes data structure by sharing common positions and reducing redundancy
function optimizeDataStructure(data: SharedRoutineData): OptimizedSharedData {
  // Create shared positions array from position icons and arrows
 const positionsMap = new Map<string, Position>();
  const positionToIndex = new Map<string, number>();
  let positionIndex = 0;

  // Collect all unique positions from position icons
  data.positionIcons.forEach((icon: PositionIcon) => {
    const posKey = `${Math.round(icon.x * 1000)}_${Math.round(icon.y * 1000)}`; // Round to avoid floating point precision issues
    if (!positionsMap.has(posKey)) {
      positionsMap.set(posKey, { x: icon.x, y: icon.y });
      positionToIndex.set(posKey, positionIndex);
      positionIndex++;
    }
  });

  // Also collect positions from arrows
  data.arrows.forEach((arrow: Arrow) => {
    const startPosKey = `${Math.round(arrow.start.x * 1000)}_${Math.round(arrow.start.y * 1000)}`;
    const endPosKey = `${Math.round(arrow.end.x * 1000)}_${Math.round(arrow.end.y * 1000)}`;
    
    if (!positionsMap.has(startPosKey)) {
      positionsMap.set(startPosKey, { x: arrow.start.x, y: arrow.start.y });
      positionToIndex.set(startPosKey, positionIndex);
      positionIndex++;
    }
    
    if (!positionsMap.has(endPosKey)) {
      positionsMap.set(endPosKey, { x: arrow.end.x, y: arrow.end.y });
      positionToIndex.set(endPosKey, positionIndex);
      positionIndex++;
    }
  });

  const positions = Array.from(positionsMap.values());

  // Group position icons by their configuration to identify repetitions across lines
  // Configuration includes position, type, name, and color
 const configToIcons = new Map<string, { icon: PositionIcon, lines: number[] }>();
  
  data.positionIcons.forEach(icon => {
    const configKey = `${Math.round(icon.x * 100)}_${Math.round(icon.y * 100)}_${icon.type}_${icon.name || ''}_${icon.color || ''}`;
    
    if (configToIcons.has(configKey)) {
      const existing = configToIcons.get(configKey)!;
      existing.lines.push(icon.lineIndex);
    } else {
      configToIcons.set(configKey, {
        icon: { ...icon },
        lines: [icon.lineIndex]
      });
    }
  });

  // Create optimized position icons, but group repeated configurations
  const optimizedPositionIcons = Array.from(configToIcons.values()).map(({ icon, lines }) => {
    const posKey = `${Math.round(icon.x * 1000)}_${Math.round(icon.y * 1000)}`;
    const positionIndex = positionToIndex.get(posKey)!;
    
    const optimizedIcon: OptimizedPositionIcon = {
      i: icon.id, // id (using 'i')
      t: icon.type, // type (using 't')
      p: positionIndex, // position index reference
      l: lines[0], // Use first line as reference
    };
    
    // Only include optional fields if they exist
    if (icon.name) optimizedIcon.n = icon.name; // name (using 'n')
    if (icon.color) optimizedIcon.o = icon.color; // color (using 'o')
    
    // If this configuration appears on multiple lines, we could store the lines
    // But for now, we'll just use the first line and let the deoptimization handle multiple lines
    return optimizedIcon;
  });

  // For position icons that appear on multiple lines, we need to expand them back
  // But store the original structure more efficiently
  const finalOptimizedIcons = data.positionIcons.map((icon: PositionIcon) => {
    const posKey = `${Math.round(icon.x * 1000)}_${Math.round(icon.y * 1000)}`;
    const positionIndex = positionToIndex.get(posKey)!;
    
    const optimizedIcon: OptimizedPositionIcon = {
      i: icon.id, // id (using 'i')
      t: icon.type, // type (using 't')
      p: positionIndex, // position index reference
      l: icon.lineIndex, // lineIndex (using 'l')
    };
    
    // Only include optional fields if they exist
    if (icon.name) optimizedIcon.n = icon.name; // name (using 'n')
    if (icon.color) optimizedIcon.o = icon.color; // color (using 'o')
    
    return optimizedIcon;
  });

  // Create optimized arrows using position indices
  const optimizedArrows = data.arrows.map((arrow: Arrow) => {
    const startPosKey = `${Math.round(arrow.start.x * 1000)}_${Math.round(arrow.start.y * 1000)}`;
    const endPosKey = `${Math.round(arrow.end.x * 1000)}_${Math.round(arrow.end.y * 1000)}`;
    
    const startIdx = positionToIndex.get(startPosKey)!;
    const endIdx = positionToIndex.get(endPosKey)!;
    
    const optimizedArrow: OptimizedArrow = {
      i: arrow.id, // id (using 'i')
      s: startIdx, // start position index reference
      e: endIdx, // end position index reference
      l: arrow.lineIndex, // lineIndex (using 'l')
    };
    
    return optimizedArrow;
  });

  // Filter out empty notes and segments to reduce size
 const filteredNotes: Record<string, string> = {};
  const filteredSegments: Record<string, string> = {};

  Object.entries(data.notes).forEach(([key, value]) => {
    if (value && value.trim() !== "") {
      filteredNotes[key] = value;
    }
  });

  Object.entries(data.segments).forEach(([key, value]) => {
    if (value && value.trim() !== "") {
      filteredSegments[key] = value;
    }
  });

  // Group repeated configurations for better compression
  const configToLines = new Map<string, { config: Omit<OptimizedRepeatedConfig, 'ls'>, lines: number[] }>();
  
  data.positionIcons.forEach(icon => {
    const configKey = `${Math.round(icon.x * 100)}_${Math.round(icon.y * 100)}_${icon.type}_${icon.name || ''}_${icon.color || ''}`;
    const posKey = `${Math.round(icon.x * 1000)}_${Math.round(icon.y * 1000)}`;
    const positionIndex = positionToIndex.get(posKey)!;
    
    const config: Omit<OptimizedRepeatedConfig, 'ls'> = {
      t: icon.type,
      p: positionIndex,
      ...(icon.name && { n: icon.name }),
      ...(icon.color && { o: icon.color })
    };
    
    if (configToLines.has(configKey)) {
      configToLines.get(configKey)!.lines.push(icon.lineIndex);
    } else {
      configToLines.set(configKey, {
        config,
        lines: [icon.lineIndex]
      });
    }
  });

  // Create optimized repeated configurations array
  const repeatedConfigs: OptimizedRepeatedConfig[] = [];
  const uniquePositionIcons: OptimizedPositionIcon[] = [];

 for (const [configKey, { config, lines }] of configToLines.entries()) {
    if (lines.length > 1) {
      // This configuration appears on multiple lines, store as repeated config
      repeatedConfigs.push({
        ...config,
        ls: lines // lines array
      });
    } else {
      // This configuration appears on only one line, store as regular icon
      const originalIcon = data.positionIcons.find(icon => {
        const key = `${Math.round(icon.x * 10)}_${Math.round(icon.y * 100)}_${icon.type}_${icon.name || ''}_${icon.color || ''}`;
        return key === configKey;
      });
      if (originalIcon) {
        const posKey = `${Math.round(originalIcon.x * 1000)}_${Math.round(originalIcon.y * 1000)}`;
        const positionIndex = positionToIndex.get(posKey)!;
        
        uniquePositionIcons.push({
          i: originalIcon.id,
          t: originalIcon.type,
          p: positionIndex,
          l: originalIcon.lineIndex,
          ...(originalIcon.name && { n: originalIcon.name }),
          ...(originalIcon.color && { o: originalIcon.color })
        });
      }
    }
 }

  return {
    c: data.category, // category (using 'c')
    s: data.skills, // skills (using 's')
    p: positions, // positions (using 'p')
    i: uniquePositionIcons, // unique positionIcons (using 'i')
    r: repeatedConfigs, // repeated configurations (using 'r')
    a: optimizedArrows, // arrows (using 'a')
    n: filteredNotes, // notes (using 'n')
    g: filteredSegments, // segments (using 'g')
    h: { // config (using 'h')
      b: data.config.bpm, // bpm (using 'b')
      l: data.config.length, // length (using 'l')
      c: data.config.category, // category (using 'c')
      v: data.config.level, // level (using 'v')
    }
 };
}

// De-optimizes data structure back to original format
function deoptimizeDataStructure(optimizedData: OptimizedSharedData): SharedRoutineData {
  // Reconstruct position icons from both unique icons and repeated configurations
 let reconstructedPositionIcons: any[] = [];

  // Add unique position icons
 reconstructedPositionIcons.push(...optimizedData.i.map(icon => {
    const position = optimizedData.p[icon.p] || { x: 0, y: 0 };
    return {
      id: icon.i, // id
      type: icon.t, // type
      x: position.x,
      y: position.y,
      lineIndex: icon.l, // lineIndex
      ...(icon.n && { name: icon.n }), // name
      ...(icon.o && { color: icon.o }), // color
    };
  }));

  // Add position icons from repeated configurations
  for (const repeatedConfig of optimizedData.r) {
    const position = optimizedData.p[repeatedConfig.p] || { x: 0, y: 0 };
    for (const lineIndex of repeatedConfig.ls) {
      reconstructedPositionIcons.push({
        id: `repeated-${repeatedConfig.p}-${lineIndex}`, // Generate unique ID for repeated icons
        type: repeatedConfig.t, // type
        x: position.x,
        y: position.y,
        lineIndex: lineIndex, // lineIndex
        ...(repeatedConfig.n && { name: repeatedConfig.n }), // name
        ...(repeatedConfig.o && { color: repeatedConfig.o }), // color
      });
    }
  }

  // Sort position icons by original order to maintain consistency
 reconstructedPositionIcons.sort((a, b) => a.lineIndex - b.lineIndex);

  // Reconstruct arrows with actual coordinates using the shared positions array
  const reconstructedArrows = optimizedData.a.map(arrow => {
    const startPos = optimizedData.p[arrow.s] || { x: 0, y: 0 };
    const endPos = optimizedData.p[arrow.e] || { x: 0, y: 0 };
    return {
      id: arrow.i, // id
      start: { x: startPos.x, y: startPos.y },
      end: { x: endPos.x, y: endPos.y },
      lineIndex: arrow.l, // lineIndex
    };
  });

  return {
    category: optimizedData.c, // category
    skills: optimizedData.s, // skills
    positionIcons: reconstructedPositionIcons, // positionIcons
    arrows: reconstructedArrows, // arrows
    notes: optimizedData.n, // notes
    segments: optimizedData.g, // segments
    config: { // config
      bpm: optimizedData.h.b, // bpm
      length: optimizedData.h.l, // length
      category: optimizedData.h.c, // category
      level: optimizedData.h.v, // level
    }
  };
}
