/**
 * AdirePattern Component
 * Draws traditional Yoruba adire resist-dye motifs (Cowry, concentric circles, hatching, diamond grid).
 * Renders programmatically as an SVG grid tile or full screen overlay.
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Dimensions, StyleProp } from 'react-native';
import Svg, { Path, Circle, Rect, G, Pattern, Defs } from 'react-native-svg';
import { useTheme } from '../../theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

type Props = {
  width?: number | string;
  height?: number | string;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
  strokeColor?: string;
};

export function AdirePattern({
  width = screenWidth,
  height = screenHeight,
  opacity = 0.05,
  style,
  strokeColor: customStrokeColor,
}: Props) {
  const { isDark } = useTheme();
  
  // White resist-dye lines on indigo base (or vice-versa in dark mode)
  const strokeColor = customStrokeColor || (isDark ? '#FFFFFF' : '#1B2A6B');

  return (
    <View style={[styles.container, { width, height }, style]} pointerEvents="none">
      <Svg width="100%" height="100%">
        <Defs>
          {/* An 80x80 pattern tile containing a dense, interlocking Adire textile print */}
          <Pattern
            id="adireGrid"
            width={80}
            height={80}
            patternUnits="userSpaceOnUse"
            viewBox="0 0 80 80"
          >
            {/* 1. Diamond Grid Lines (Traditional stitch/resist lines) */}
            <Path
              d="M 40 0 L 80 40 L 40 80 L 0 40 Z"
              fill="none"
              stroke={strokeColor}
              strokeWidth={0.75}
              opacity={0.4}
            />
            <Path
              d="M 0 0 L 80 80 M 80 0 L 0 80"
              fill="none"
              stroke={strokeColor}
              strokeWidth={0.5}
              strokeDasharray="2 2"
              opacity={0.25}
            />

            {/* 2. Center Motif: Concentric Tie-Dye Resist Rings (Osupa / Moon) */}
            <G transform="translate(40, 40)">
              <Circle cx={0} cy={0} r={6} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.6} />
              {/* Outer ring of resist dots */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r = 12;
                const cx = r * Math.cos(rad);
                const cy = r * Math.sin(rad);
                return (
                  <Circle
                    key={deg}
                    cx={cx}
                    cy={cy}
                    r={1.2}
                    fill={strokeColor}
                    opacity={0.7}
                  />
                );
              })}
            </G>

            {/* 3. Corner Motifs: Concentric Tie-Dye Resist Rings (when tiled, these form the second ring) */}
            <G transform="translate(0, 0)">
              <Circle cx={0} cy={0} r={6} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.6} />
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r = 12;
                const cx = r * Math.cos(rad);
                const cy = r * Math.sin(rad);
                return (
                  <Circle
                    key={`corner-0-${deg}`}
                    cx={cx}
                    cy={cy}
                    r={1.2}
                    fill={strokeColor}
                    opacity={0.7}
                  />
                );
              })}
            </G>
            <G transform="translate(80, 0)">
              <Circle cx={0} cy={0} r={6} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.6} />
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r = 12;
                const cx = r * Math.cos(rad);
                const cy = r * Math.sin(rad);
                return (
                  <Circle
                    key={`corner-80-${deg}`}
                    cx={cx}
                    cy={cy}
                    r={1.2}
                    fill={strokeColor}
                    opacity={0.7}
                  />
                );
              })}
            </G>
            <G transform="translate(0, 80)">
              <Circle cx={0} cy={0} r={6} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.6} />
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r = 12;
                const cx = r * Math.cos(rad);
                const cy = r * Math.sin(rad);
                return (
                  <Circle
                    key={`corner-0-80-${deg}`}
                    cx={cx}
                    cy={cy}
                    r={1.2}
                    fill={strokeColor}
                    opacity={0.7}
                  />
                );
              })}
            </G>
            <G transform="translate(80, 80)">
              <Circle cx={0} cy={0} r={6} fill="none" stroke={strokeColor} strokeWidth={1} opacity={0.6} />
              {[0, 90, 180, 270].map((deg) => {
                const rad = (deg * Math.PI) / 180;
                const r = 12;
                const cx = r * Math.cos(rad);
                const cy = r * Math.sin(rad);
                return (
                  <Circle
                    key={`corner-80-80-${deg}`}
                    cx={cx}
                    cy={cy}
                    r={1.2}
                    fill={strokeColor}
                    opacity={0.7}
                  />
                );
              })}
            </G>

            {/* 4. Left and Right Diamonds: Woven Hatching lines (Weave texture) */}
            <G transform="translate(0, 40)">
              {/* Parallel resist lines */}
              <Path
                d="M 5 -10 L 25 10 M 10 -15 L 30 5 M 15 -20 L 35 0"
                stroke={strokeColor}
                strokeWidth={0.75}
                opacity={0.3}
              />
              {/* Sanyan seed dots */}
              <Circle cx={15} cy={-5} r={1.5} fill={strokeColor} opacity={0.6} />
              <Circle cx={25} cy={5} r={1.5} fill={strokeColor} opacity={0.6} />
            </G>
            <G transform="translate(80, 40)">
              <Path
                d="M -5 -10 L -25 10 M -10 -15 L -30 5 M -15 -20 L -35 0"
                stroke={strokeColor}
                strokeWidth={0.75}
                opacity={0.3}
              />
              <Circle cx={-15} cy={-5} r={1.5} fill={strokeColor} opacity={0.6} />
              <Circle cx={-25} cy={5} r={1.5} fill={strokeColor} opacity={0.6} />
            </G>

            {/* 5. Top and Bottom Diamonds: Cassava Leaf (Ewé Ẹgẹ́) Lattice */}
            <G transform="translate(40, 0)">
              <Path
                d="M -15 20 C -5 25, 5 25, 15 20 M -10 15 C -3 18, 3 18, 10 15 M -5 10 C -1 12, 1 12, 5 10"
                fill="none"
                stroke={strokeColor}
                strokeWidth={0.75}
                opacity={0.35}
              />
              <Circle cx={0} cy={23} r={1.5} fill={strokeColor} opacity={0.5} />
            </G>
            <G transform="translate(40, 80)">
              <Path
                d="M -15 -20 C -5 -25, 5 -25, 15 -20 M -10 -15 C -3 -18, 3 -18, 10 -15 M -5 -10 C -1 -12, 1 -12, 5 -10"
                fill="none"
                stroke={strokeColor}
                strokeWidth={0.75}
                opacity={0.35}
              />
              <Circle cx={0} cy={-23} r={1.5} fill={strokeColor} opacity={0.5} />
            </G>
          </Pattern>
        </Defs>

        {/* Fill the bounds with our interlocking Adire tile pattern */}
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#adireGrid)" opacity={opacity} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1, // Strictly behind all UI layers
  },
});
