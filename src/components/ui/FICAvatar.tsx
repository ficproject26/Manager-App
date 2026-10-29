import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle, ImageStyle } from 'react-native';
import { theme } from '../../theme';

export interface FICAvatarProps {
  name: string;
  sourceUrl?: string;
  size?: number;
  style?: ViewStyle;
}

export const FICAvatar: React.FC<FICAvatarProps> = ({
  name,
  sourceUrl,
  size = 40,
  style,
}) => {
  const getInitials = (str: string) => {
    const parts = str.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  if (sourceUrl) {
    const imageStyle: ImageStyle = {
      width: size,
      height: size,
      borderRadius: size / 2,
    };
    return (
      <Image
        source={{ uri: sourceUrl }}
        style={[styles.avatar, imageStyle]}
      />
    );
  }

  return (
    <View
      style={[
        styles.initialsContainer,
        { width: size, height: size, borderRadius: size / 2 },
        style,
      ]}
    >
      <Text style={[styles.initialsText, { fontSize: size * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: theme.colors.divider,
  },
  initialsContainer: {
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    color: theme.colors.accent,
    fontWeight: '700',
  },
});
