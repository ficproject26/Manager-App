import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Image } from 'react-native';
import { theme } from '../../theme';
import { FICIconButton } from './FICIconButton';
import { ASSETS } from '../../assets/logo';

export interface FICHeaderProps {
  title: string;
  subtitle?: string;
  leftActionIcon?: React.ReactNode;
  onLeftAction?: () => void;
  rightActionIcon?: React.ReactNode;
  onRightAction?: () => void;
  style?: ViewStyle;
  showLogo?: boolean;
}

export const FICHeader: React.FC<FICHeaderProps> = ({
  title,
  subtitle,
  leftActionIcon,
  onLeftAction,
  rightActionIcon,
  onRightAction,
  style,
  showLogo = false,
}) => {
  return (
    <View style={[styles.header, style]}>
      {leftActionIcon ? (
        <FICIconButton icon={leftActionIcon} onPress={onLeftAction} size={40} />
      ) : (
        <View style={styles.placeholder} />
      )}
      <View style={styles.titleContainer}>
        <View style={styles.titleTextCol}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {rightActionIcon ? (
        <FICIconButton icon={rightActionIcon} onPress={onRightAction} size={40} />
      ) : (
        <View style={styles.placeholder} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    height: theme.spacing.headerHeight,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.sm,
    ...theme.elevation.card,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  headerLogo: {
    width: 32,
    height: 32,
  },
  titleTextCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    ...theme.typography.title,
    color: theme.colors.surface,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 1,
    textAlign: 'center',
  },
  placeholder: {
    width: 40,
  },
});

