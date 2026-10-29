/**
 * Application Business Rules & Constants
 */
import { DivisionName, Priority } from '../types';

export const HIERARCHY_CONSTANTS = {
  DIVISIONS_PER_STATE: 4,
  MANAGERS_PER_DIVISION: 2,
  TOTAL_DIVISION_MANAGERS_PER_STATE: 8,
  DIVISION_NAMES: [
    DivisionName.NORTH,
    DivisionName.SOUTH,
    DivisionName.EAST,
    DivisionName.WEST,
  ],
};

export const WORKFLOW_RULES = {
  HIGH_PRIORITY_MUST_RESOLVE: true,
  ALLOW_HIGH_PRIORITY_REJECT: false,
  MANDATORY_REPORT_ON_NOT_INTERESTED: true,
  MIN_REPORT_TEXT_LENGTH: 10,
  MAX_AUDIO_RECORDING_SECONDS: 180,
};

export const PRIORITY_COLORS: Record<Priority, string> = {
  [Priority.CRITICAL]: '#991B1B',
  [Priority.HIGH]: '#DC2626',
  [Priority.MEDIUM]: '#D97706',
  [Priority.LOW]: '#2563EB',
};
