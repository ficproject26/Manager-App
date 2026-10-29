import { Easing } from 'react-native';

export const OTP_CONFIG = {
  // Geometry
  BOX_SIZE: 44,
  BOX_RADIUS: 12,
  BOX_GAP: 14,
  ORBIT_RADIUS: 45,
  CENTER_SQUARE_SIZE: 40,
  CARD_RADIUS: 28,
  CARET_WIDTH: 1.5,
  CARET_HEIGHT: 20,

  // Perimeter for rounded rect (44x44, rx=12):
  // 2*(w-2r) + 2*(h-2r) + 2*PI*r = 40 + 40 + 75.398 = 155.398
  BOX_PERIMETER: 155.398,
  get ARC_LENGTH() {
    return this.BOX_PERIMETER * 0.25; // 25% of perimeter
  },

  // Colors adapted to FIC Manager App design system
  COLORS: {
    bgPage: '#F8FAFC',
    bgCard: '#FFFFFF',
    bgBox: '#F1F5F9',
    borderNeutral: '#CBD5E1',
    borderActive: '#1D4ED8',
    textPrimary: '#0F172A',
    textMuted: '#64748B',
    textPhone: '#1D4ED8',
    accentEmerald: '#059669',
    accentGlow: '#10B981',
    accentFill: 'rgba(16, 185, 129, 0.12)',
    orbitTrack: 'rgba(29, 78, 216, 0.2)',
    centerDot: 'rgba(29, 78, 216, 0.6)',
    dragHandle: '#E2E8F0',
    errorRed: '#DC2626',
    errorGlow: 'rgba(220, 38, 38, 0.25)',
  },

  // Timings (ms)
  TIMINGS: {
    CARET_BLINK: 500,
    DIGIT_POP: 180,
    ARC_SWEEP: 380,
    GATHER: 500,
    ORBIT_SPIN: 900,
    COLOR_TRANSITION: 250,
    COLLAPSE_HOLD: 250,
    COLLAPSE: 500,
    SUCCESS_RINGS: 850,
    SUCCESS_CHECK: 350,
    SUCCESS_BURST: 750,
    SUCCESS_TEXT: 400,
    SHAKE: 380,
    VERIFY_PENDING_MIN: 300,
  },

  // Easings
  EASINGS: {
    gather: Easing.inOut(Easing.cubic),
    spin: Easing.out(Easing.cubic),
    collapse: Easing.inOut(Easing.cubic),
    success: Easing.out(Easing.cubic),
    pop: Easing.out(Easing.back(1.5)),
  },
} as const;
