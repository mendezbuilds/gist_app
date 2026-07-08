/**
 * PhoneInput — Country code picker + number field.
 * Defaults to 🇳🇬 +234 (Nigeria).
 * Common African country codes pre-listed; full list available.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Modal,
  FlatList,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useTheme } from '../../theme';

type CountryCode = {
  name: string;
  flag: string;
  code: string;
  dialCode: string;
};

const COUNTRY_CODES: CountryCode[] = [
  { name: 'Nigeria', flag: '🇳🇬', code: 'NG', dialCode: '+234' },
  { name: 'Ghana', flag: '🇬🇭', code: 'GH', dialCode: '+233' },
  { name: 'Kenya', flag: '🇰🇪', code: 'KE', dialCode: '+254' },
  { name: 'South Africa', flag: '🇿🇦', code: 'ZA', dialCode: '+27' },
  { name: 'Ethiopia', flag: '🇪🇹', code: 'ET', dialCode: '+251' },
  { name: 'Tanzania', flag: '🇹🇿', code: 'TZ', dialCode: '+255' },
  { name: 'Uganda', flag: '🇺🇬', code: 'UG', dialCode: '+256' },
  { name: 'United Kingdom', flag: '🇬🇧', code: 'GB', dialCode: '+44' },
  { name: 'United States', flag: '🇺🇸', code: 'US', dialCode: '+1' },
];

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onChangeCountry?: (dialCode: string) => void;
  errorText?: string;
};

export function PhoneInput({ value, onChangeText, onChangeCountry, errorText }: Props) {
  const { colors, spacing, borderRadius, fontSize } = useTheme();
  const [selectedCountry, setSelectedCountry] = useState(COUNTRY_CODES[0]);
  const [pickerVisible, setPickerVisible] = useState(false);

  const handleSelectCountry = (country: CountryCode) => {
    setSelectedCountry(country);
    onChangeCountry?.(country.dialCode);
    setPickerVisible(false);
  };

  const borderColor = errorText ? colors.error : colors.border;

  return (
    <>
      <View
        style={{
          flexDirection: 'row',
          borderRadius: borderRadius.md,
          borderWidth: 1.5,
          borderColor,
          backgroundColor: colors.surface,
          overflow: 'hidden',
        }}
      >
        {/* Country picker trigger */}
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing[1.5],
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[3.5],
            borderRightWidth: 1,
            borderRightColor: colors.border,
          }}
          accessibilityLabel={`Country code: ${selectedCountry.dialCode}`}
        >
          <Text style={{ fontSize: 20 }}>{selectedCountry.flag}</Text>
          <Text
            style={{
              color: colors.textPrimary,
              fontFamily: 'Nunito_600SemiBold',
              fontSize: fontSize.base,
            }}
          >
            {selectedCountry.dialCode}
          </Text>
        </Pressable>

        {/* Phone number input */}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          keyboardType="phone-pad"
          placeholder="8012345678"
          placeholderTextColor={colors.textTertiary}
          style={{
            flex: 1,
            color: colors.textPrimary,
            fontFamily: 'Nunito_400Regular',
            fontSize: fontSize.base,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[3.5],
          }}
          returnKeyType="done"
          accessibilityLabel="Phone number"
        />
      </View>

      {errorText && (
        <Text
          style={{
            color: colors.error,
            fontFamily: 'Nunito_400Regular',
            fontSize: fontSize.xs,
            marginTop: spacing[1],
          }}
        >
          {errorText}
        </Text>
      )}

      {/* Country picker modal */}
      <Modal
        visible={pickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: spacing[4],
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text
              style={{
                flex: 1,
                color: colors.textPrimary,
                fontFamily: 'Nunito_700Bold',
                fontSize: fontSize.lg,
              }}
            >
              Select Country
            </Text>
            <Pressable onPress={() => setPickerVisible(false)}>
              <Text style={{ color: colors.accent, fontFamily: 'Nunito_600SemiBold', fontSize: fontSize.base }}>
                Cancel
              </Text>
            </Pressable>
          </View>
          <FlatList
            data={COUNTRY_CODES}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => handleSelectCountry(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: spacing[3],
                  paddingHorizontal: spacing[5],
                  paddingVertical: spacing[4],
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.divider,
                  backgroundColor:
                    item.code === selectedCountry.code
                      ? colors.accentSurface
                      : 'transparent',
                }}
              >
                <Text style={{ fontSize: 24 }}>{item.flag}</Text>
                <Text
                  style={{
                    flex: 1,
                    color: colors.textPrimary,
                    fontFamily: 'Nunito_500Medium',
                    fontSize: fontSize.base,
                  }}
                >
                  {item.name}
                </Text>
                <Text style={{ color: colors.textSecondary, fontFamily: 'Nunito_400Regular', fontSize: fontSize.base }}>
                  {item.dialCode}
                </Text>
              </Pressable>
            )}
          />
        </SafeAreaView>
      </Modal>
    </>
  );
}
