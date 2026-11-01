import { AppRegistry, LogBox } from 'react-native';
import App from './src/app/App';
import { name as appName } from './app.json';

// Suppress LogBox warnings and development error popups on standalone device
LogBox.ignoreAllLogs(true);

AppRegistry.registerComponent(appName, () => App);

try {
  const messaging = require('@react-native-firebase/messaging').default;
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    console.log('[FCM Background Message Manager]', remoteMessage);
  });
} catch (e) {
  // Gracefully handled if native module is absent
}
