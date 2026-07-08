/**
 * Welcome Screen
 * Hero screen with Adire-pattern wordmark, tagline, and Get Started CTA.
 * Staggered entrance animation on first mount.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Defs, RadialGradient, Stop, Ellipse } from 'react-native-svg';
import { router } from 'expo-router';
import { useTheme } from '../../src/theme';
import { Button } from '../../src/components/ui/Button';
import { AdirePattern } from '../../src/components/ui/AdirePattern';

const { width, height } = Dimensions.get('window');

// Adire-inspired decorative SVG motif
function AdireHero({ isDark }: { isDark: boolean }) {
  const c1 = isDark ? '#3548A3' : '#1B2A6B';
  const c2 = isDark ? '#293260' : '#212848';
  const accent = '#E8552F';
  const size = Math.min(width * 0.65, height * 0.26);

  return (
    <Svg width={size} height={size} viewBox="0 0 340 340">
      <Defs>
        <RadialGradient id="bg" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={isDark ? '#1B1F38' : '#FFFFFF'} />
          <Stop offset="100%" stopColor={isDark ? '#0E1224' : '#F7F1E3'} />
        </RadialGradient>
      </Defs>

      {/* Background circle */}
      <Circle cx="170" cy="170" r="165" fill="url(#bg)" />

      {/* Outer adire ring pattern */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const r = 130;
        const cx = 170 + r * Math.cos(rad);
        const cy = 170 + r * Math.sin(rad);
        return (
          <Circle
            key={i}
            cx={cx}
            cy={cy}
            r={10}
            fill="none"
            stroke={i % 2 === 0 ? c1 : c2}
            strokeWidth={2}
          />
        );
      })}

      {/* Inner cross motif */}
      <Path
        d="M170 60 L170 280 M60 170 L280 170"
        stroke={c1}
        strokeWidth={1.5}
        strokeDasharray="4 8"
        opacity={0.4}
      />

      {/* Center diamond */}
      <Path
        d="M170 120 L210 170 L170 220 L130 170 Z"
        fill="none"
        stroke={c1}
        strokeWidth={2.5}
      />

      {/* Inner small circles (adire dot motif) */}
      {[
        [150, 150], [190, 150], [150, 190], [190, 190],
      ].map(([cx, cy], i) => (
        <Circle
          key={`dot-${i}`}
          cx={cx}
          cy={cy}
          r={5}
          fill={c2}
          opacity={0.6}
        />
      ))}

      {/* Center circle with chat bubble icon (restored visual branding) */}
      <Circle
        cx={170}
        cy={170}
        r={14}
        fill={accent}
      />
      <Path
        d="M 166 166 H 174 A 2 2 0 0 1 176 168 V 171 A 2 2 0 0 1 174 173 H 169.5 L 166.5 176 V 173 A 2 2 0 0 1 164 171 V 168 A 2 2 0 0 1 166 166 Z"
        fill="#FFFFFF"
      />

      {/* Outer decorative dots */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        const r = 150;
        const cx = 170 + r * Math.cos(rad);
        const cy = 170 + r * Math.sin(rad);
        return (
          <Circle key={`outer-${i}`} cx={cx} cy={cy} r={3} fill={accent} opacity={0.5} />
        );
      })}
    </Svg>
  );
}

export default function WelcomeScreen() {
  const { colors, spacing, fontSize, springs, isDark } = useTheme();

  // Staggered entrance animations
  const logoOpacity = useSharedValue(0);
  const logoY = useSharedValue(20);
  const heroOpacity = useSharedValue(0);
  const heroScale = useSharedValue(0.88);
  const taglineOpacity = useSharedValue(0);
  const ctaOpacity = useSharedValue(0);
  const ctaY = useSharedValue(16);

  useEffect(() => {
    logoOpacity.value = withDelay(100, withTiming(1, { duration: 400 }));
    logoY.value = withDelay(100, withSpring(0, springs.gentle));
    heroOpacity.value = withDelay(300, withTiming(1, { duration: 500 }));
    heroScale.value = withDelay(300, withSpring(1, springs.modal));
    taglineOpacity.value = withDelay(600, withTiming(1, { duration: 400 }));
    ctaOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    ctaY.value = withDelay(900, withSpring(0, springs.gentle));
  }, []);

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ translateY: logoY.value }],
  }));
  const heroStyle = useAnimatedStyle(() => ({
    opacity: heroOpacity.value,
    transform: [{ scale: heroScale.value }],
  }));
  const taglineStyle = useAnimatedStyle(() => ({ opacity: taglineOpacity.value }));
  const ctaStyle = useAnimatedStyle(() => ({
    opacity: ctaOpacity.value,
    transform: [{ translateY: ctaY.value }],
  }));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={colors.background}
      />
      
      {/* Authentic Adire resist-dye texture motif */}
      <AdirePattern opacity={isDark ? 0.04 : 0.05} />

      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        {/* Wordmark */}
        <Animated.View style={[styles.logoRow, logoStyle]}>
          <Text
            style={{
              fontFamily: 'Fraunces_700Bold',
              fontSize: 42,
              color: colors.textPrimary,
              letterSpacing: -1.5,
              paddingRight: 10, // Prevent custom font glyph right-edge clipping
            }}
          >
            Gist
          </Text>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: colors.brandHighlight, // Coral highlight dot
              marginLeft: -2,
              marginTop: 26,
            }}
          />
        </Animated.View>

        {/* Adire Hero Illustration */}
        <Animated.View style={[styles.heroContainer, heroStyle]}>
          <AdireHero isDark={isDark} />
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={[styles.taglineContainer, taglineStyle]}>
          <Text
            style={{
              fontFamily: 'Nunito_700Bold',
              fontSize: fontSize.xl,
              color: colors.textPrimary,
              textAlign: 'center',
              letterSpacing: -0.3,
              paddingRight: 6, // Prevent horizontal letter clipping
            }}
          >
            Talk your own gist.
          </Text>
          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.base,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing[2],
              lineHeight: fontSize.base * 1.55,
            }}
          >
            Messaging built for how Nigerians{'\n'}actually communicate.
          </Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View style={[styles.ctaContainer, ctaStyle]}>
          <Button
            label="Get Started"
            onPress={() => router.push('/(auth)/phone')}
            size="lg"
            fullWidth
          />
          <Text
            style={{
              fontFamily: 'Nunito_400Regular',
              fontSize: fontSize.xs,
              color: colors.textSecondary,
              textAlign: 'center',
              marginTop: spacing[3],
              lineHeight: fontSize.xs * 1.6,
            }}
          >
            By continuing, you agree to our Terms of Service{'\n'}and Privacy Policy.
          </Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 32,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    alignSelf: 'flex-start',
  },
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taglineContainer: {
    alignItems: 'center',
    paddingBottom: 8,
  },
  ctaContainer: {
    width: '100%',
    paddingTop: 8,
  },
});
