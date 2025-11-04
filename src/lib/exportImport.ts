import type { SaveStateData } from "@/types/routine";

export interface ExportedData {
  version: string;
  exportedAt: string;
  slotName: string;
  categories: {
    [category: string]: {
      placedSkills: any[];
      positionIcons: any[];
      notes: Record<number, string>;
      segmentNames: Record<number, string>;
    };
  };
}

export const exportCurrentSlot = (
  slotNumber: 1 | 2 | 3,
  slotName: string,
  placedSkills: any[],
  positionIcons: any[],
  config: any,
  notes: Record<number, string>,
  segmentNames: Record<number, string>
): void => {
  // Collect all category data for this save slot
  const categories: ExportedData['categories'] = {};
  const categoryTypes = ['partner-stunts', 'group-stunts', 'team-16', 'team-24'];

  categoryTypes.forEach(category => {
    const categoryKey = `category-${slotNumber}-${category}`;
    const categoryData = localStorage.getItem(categoryKey);

    if (categoryData) {
      try {
        const parsed = JSON.parse(categoryData);
        categories[category] = {
          placedSkills: parsed.placedSkills || [],
          positionIcons: parsed.positionIcons || [],
          notes: parsed.notes || {},
          segmentNames: parsed.segmentNames || {},
        };
      } catch (e) {
        console.warn(`Failed to parse category data for ${category}:`, e);
      }
    }
  });

  const exportData: ExportedData = {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    slotName,
    categories,
  };

  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });

  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `cheer-routine-${slotName.replace(/\s+/g, "-").toLowerCase()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const importSlotData = (file: File): Promise<ExportedData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const data: ExportedData = JSON.parse(content);

        // Validate structure
        if (!data.version || !data.slotName || !data.categories) {
          throw new Error("Invalid file format: Missing required fields");
        }

        resolve(data);
      } catch (error) {
        reject(new Error(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`));
      }
    };

    reader.onerror = () => {
      reject(new Error("Failed to read file"));
    };

    reader.readAsText(file);
  });
};

export const validateImportedData = (data: ExportedData): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check version compatibility
  if (data.version !== "1.0") {
    errors.push(`Unsupported version: ${data.version}. Expected: 1.0`);
  }

  // Check that categories object exists
  if (!data.categories || typeof data.categories !== "object") {
    errors.push("categories must be an object");
    return { isValid: false, errors };
  }

  // Check that at least one category exists
  const categoryKeys = Object.keys(data.categories);
  if (categoryKeys.length === 0) {
    errors.push("at least one category must be present");
  }

  // Validate each category structure
  categoryKeys.forEach(categoryName => {
    const category = data.categories[categoryName];
    if (!category || typeof category !== "object") {
      errors.push(`category '${categoryName}' must be an object`);
      return;
    }

    if (!Array.isArray(category.placedSkills)) {
      errors.push(`category '${categoryName}': placedSkills must be an array`);
    }

    if (!Array.isArray(category.positionIcons)) {
      errors.push(`category '${categoryName}': positionIcons must be an array`);
    }

    if (category.notes && typeof category.notes !== "object") {
      errors.push(`category '${categoryName}': notes must be an object`);
    }

    if (category.segmentNames && typeof category.segmentNames !== "object") {
      errors.push(`category '${categoryName}': segmentNames must be an object`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};
