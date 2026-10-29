/**
 * Safe optional wrapper for react-native-haptic-feedback.
 * If installed, triggers subtle tactile feedback. If not installed, safely no-ops.
 */

let RNHapticFeedback: any = null;

try {
  // Optional require
  const hapticsModule = require('react-native-haptic-feedback');
  RNHapticFeedback = hapticsModule?.default || hapticsModule;
} catch {
  // Not installed; will safely no-op
}

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

export const triggerHaptic = (
  type: 'impactLight' | 'notificationSuccess' | 'notificationError'
) => {
  if (RNHapticFeedback && typeof RNHapticFeedback.trigger === 'function') {
    try {
      RNHapticFeedback.trigger(type, hapticOptions);
    } catch {
      // Ignore any platform-specific haptic errors
    }
  }
};
