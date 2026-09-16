// --- 1. 型定義 (Types/Interfaces) ---

export interface Hint {
  optionId: string;
  title: string;
  description: string;
  expectedImpact: string;
  riskFactor: string;
  estimatedCost?: string;
  staffBurden?: string;
}

export interface ShiftInfo {
  shiftDate: string;
  shiftType: string;
  wardId: string;
}

export interface HourlyIntensity {
  hour: string;
  intensity: number;
  taskCount?: number;
  riskFactor?: string;
}

export interface DayHeatmapData {
  day: string;
  hours: HourlyIntensity[];
}

 export interface OvercrowdedHeatmapProps {
  data?: DayHeatmapData[];
}
