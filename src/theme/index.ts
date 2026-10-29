/**
 * Central Theme System Export
 */
import { colors } from './colors';
import { typography } from './typography';
import { spacing } from './spacing';
import { radius } from './radius';
import { elevation } from './elevation';

export const theme = {
  colors,
  typography,
  spacing,
  radius,
  elevation,
};

export type Theme = typeof theme;
