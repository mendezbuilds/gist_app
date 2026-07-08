/**
 * Avatar — circular user avatar with initials fallback.
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../theme';

type Props = {
  uri?: string | null;
  name?: string;
  size?: number;
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

// Deterministic indigo-to-coral gradient simulation via background color
const AVATAR_COLORS = [
  '#1B2A6B', '#3548A3', '#293260', '#E8552F',
  '#2E7D5E', '#C49A00', '#B83E1E', '#212848',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function Avatar({ uri, name = '', size = 44 }: Props) {
  const { borderRadius } = useTheme();
  const initials = getInitials(name);
  const bgColor = getAvatarColor(name || 'U');
  const fontSize = Math.round(size * 0.36);

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={`${name} avatar`}
      />
    );
  }

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bgColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
      accessibilityLabel={`${name} avatar`}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontFamily: 'Nunito_700Bold',
          fontSize,
          letterSpacing: 0.5,
        }}
      >
        {initials || '?'}
      </Text>
    </View>
  );
}
