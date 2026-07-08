import React from 'react';
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../../src/theme';

export default function StatusScreen() {
  const { colors, spacing, fontSize } = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing[3] }}>
        <Text style={{ fontSize: 48 }}>⭕</Text>
        <Text style={{ fontFamily: 'Nunito_700Bold', fontSize: fontSize.lg, color: colors.textPrimary }}>
          Status
        </Text>
        <Text style={{ fontFamily: 'Nunito_400Regular', fontSize: fontSize.base, color: colors.textSecondary }}>
          Coming in Phase 6.
        </Text>
      </View>
    </SafeAreaView>
  );
}
