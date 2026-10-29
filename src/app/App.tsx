import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { AppProviders } from './providers/AppProviders';
import { AuthGuard } from '../navigation/guards/AuthGuard';
import { theme } from '../theme';

const App: React.FC = () => {
  return (
    <AppProviders>
      <View style={styles.container}>
        <StatusBar
          backgroundColor={theme.colors.primaryDark}
          barStyle="light-content"
        />
        <AuthGuard />
      </View>
    </AppProviders>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});

export default App;
