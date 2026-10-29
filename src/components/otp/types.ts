export type OtpPhase =
  | 'typing'
  | 'verifying'
  | 'gather'
  | 'orbit'
  | 'collapse'
  | 'success'
  | 'error';

export interface OtpVerificationProps {
  /** Length of the OTP code (default 4) */
  length?: number;
  /** Invoked immediately when all digits are filled */
  onComplete?: (code: string) => void;
  /** Optional verification promise. Returns true if valid, false if invalid */
  verify?: (code: string) => Promise<boolean>;
  /** Invoked only after the full success animation has completed */
  onVerified?: () => void;
  /** Target phone number displayed in subtitle */
  phoneNumber?: string;
  /** Custom title (default: "Verify your number") */
  title?: string;
  /** Custom subtitle (default: "Enter the 4-digit code we sent to...") */
  subtitle?: string;
}

export interface OtpVerificationRef {
  /** Clears code and returns state to typing */
  reset: () => void;
  /** Re-triggers verification and animation for current code */
  replay: () => void;
  /** Focuses the hidden text input */
  focus: () => void;
  /** Sets a code imperatively (e.g. for testing) */
  setCode: (code: string) => void;
}

export interface BoxPosition {
  x: number;
  y: number;
}

export interface ParticleConfig {
  id: number;
  angle: number;
  distance: number;
  size: number;
  color: string;
  delay: number;
}
