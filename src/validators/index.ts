/**
 * Form & Input Validation Utilities
 * Aligned with FIC Validation Rules (docs/17_VALIDATION_RULES.md)
 */

export const INDIAN_PHONE_REGEX = /^[6-9]\d{9}$/;
export const INDIAN_PINCODE_REGEX = /^\d{6}$/;
export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
export const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates a standard 10-digit Indian mobile number
 */
export const isValidIndianPhone = (phone?: string): boolean => {
  if (!phone) return false;
  return INDIAN_PHONE_REGEX.test(phone.trim());
};

/**
 * Validates standard email address format
 */
export const isValidEmail = (email?: string): boolean => {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validates a 6-digit Indian postal PIN code
 */
export const isValidPincode = (pincode?: string): boolean => {
  if (!pincode) return false;
  return INDIAN_PINCODE_REGEX.test(pincode.trim());
};

/**
 * Validates a 10-character Indian PAN number
 */
export const isValidPAN = (pan?: string): boolean => {
  if (!pan) return false;
  return PAN_REGEX.test(pan.trim().toUpperCase());
};

/**
 * Validates a 15-character Indian GSTIN
 */
export const isValidGSTIN = (gstin?: string): boolean => {
  if (!gstin) return false;
  return GSTIN_REGEX.test(gstin.trim().toUpperCase());
};

/**
 * Validates required text minimum length
 */
export const isMinLength = (value?: string, minLength: number = 1): boolean => {
  if (!value) return false;
  return value.trim().length >= minLength;
};
