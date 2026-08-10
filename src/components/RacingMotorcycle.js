import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient as SvgLinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';

export function RacingMotorcycle({ color, size = 64, accentColor = '#F5FAFF' }) {
  const ride = useRef(new Animated.Value(0)).current;
  const streak = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const rideAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(ride, { toValue: 1, duration: 620, useNativeDriver: true }),
        Animated.timing(ride, { toValue: 0, duration: 620, useNativeDriver: true }),
      ]),
    );
    const streakAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(streak, { toValue: 1, duration: 420, useNativeDriver: true }),
        Animated.timing(streak, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]),
    );

    rideAnimation.start();
    streakAnimation.start();
    return () => {
      rideAnimation.stop();
      streakAnimation.stop();
    };
  }, [ride, streak]);

  const height = size * 0.64;

  return (
    <View style={[styles.wrapper, { width: size, height }]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.speedLines,
          {
            opacity: streak.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.7] }),
            transform: [{ translateX: streak.interpolate({ inputRange: [0, 1], outputRange: [2, -4] }) }],
          },
        ]}
      >
        <View style={[styles.speedLine, styles.speedLineLong, { backgroundColor: color }]} />
        <View style={[styles.speedLine, styles.speedLineShort, { backgroundColor: accentColor }]} />
      </Animated.View>

      <Animated.View
        style={{
          width: size,
          height,
          transform: [
            { translateX: ride.interpolate({ inputRange: [0, 1], outputRange: [-1.5, 2.5] }) },
            { translateY: ride.interpolate({ inputRange: [0, 1], outputRange: [1.2, -1.7] }) },
            { rotate: ride.interpolate({ inputRange: [0, 1], outputRange: ['-1.2deg', '1.8deg'] }) },
          ],
        }}
      >
        <Svg width={size} height={height} viewBox="0 0 132 84">
          <Defs>
            <SvgLinearGradient id="bodyPaint" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={accentColor} stopOpacity="0.98" />
              <Stop offset="0.28" stopColor={color} stopOpacity="1" />
              <Stop offset="1" stopColor={color} stopOpacity="0.62" />
            </SvgLinearGradient>
            <SvgLinearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#DFF8FF" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#6BCBFF" stopOpacity="0.16" />
            </SvgLinearGradient>
          </Defs>

          <Path d="M12 71 C34 76 96 76 120 70" stroke="#000000" strokeOpacity="0.24" strokeWidth="5" strokeLinecap="round" />

          <G>
            <Circle cx="27" cy="61" r="16" fill="#07111D" stroke="#D7E8F5" strokeWidth="2.4" />
            <Circle cx="27" cy="61" r="10.2" fill="#101E2B" stroke={color} strokeWidth="2.2" />
            <Circle cx="27" cy="61" r="3.4" fill={accentColor} />
            <Path d="M27 50.8 V71.2 M16.8 61 H37.2 M20 54 L34 68 M34 54 L20 68" stroke={accentColor} strokeOpacity="0.52" strokeWidth="1.4" />
          </G>

          <G>
            <Circle cx="102" cy="61" r="16" fill="#07111D" stroke="#D7E8F5" strokeWidth="2.4" />
            <Circle cx="102" cy="61" r="10.2" fill="#101E2B" stroke={color} strokeWidth="2.2" />
            <Circle cx="102" cy="61" r="3.4" fill={accentColor} />
            <Path d="M102 50.8 V71.2 M91.8 61 H112.2 M95 54 L109 68 M109 54 L95 68" stroke={accentColor} strokeOpacity="0.52" strokeWidth="1.4" />
          </G>

          <Path d="M31 58 L47 42 L74 49 L96 59" fill="none" stroke="#B8C7D2" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M42 58 L59 36 L79 52 L62 58 Z" fill="#0B1722" stroke={color} strokeWidth="2.2" />
          <Path d="M88 57 L100 33" stroke="#C6D8E5" strokeWidth="4" strokeLinecap="round" />
          <Path d="M93 58 L104 35" stroke={color} strokeWidth="2.1" strokeLinecap="round" />

          <Path d="M39 46 C47 32 59 23 77 24 C87 25 94 31 99 40 L91 49 L68 50 L53 57 L38 55 Z" fill="url(#bodyPaint)" stroke={accentColor} strokeOpacity="0.72" strokeWidth="1.7" strokeLinejoin="round" />
          <Path d="M56 28 C63 18 76 17 87 22 L83 32 L63 34 Z" fill={color} stroke={accentColor} strokeOpacity="0.7" strokeWidth="1.6" />
          <Path d="M75 22 C84 13 95 15 100 25 L88 27 Z" fill="url(#glass)" stroke={accentColor} strokeOpacity="0.7" strokeWidth="1.4" />
          <Path d="M83 31 L99 32 L107 39 L97 42 L89 39 Z" fill={color} stroke={accentColor} strokeOpacity="0.72" strokeWidth="1.5" />
          <Path d="M35 42 L17 37 L12 42 L38 50 Z" fill={color} stroke={accentColor} strokeOpacity="0.62" strokeWidth="1.5" />
          <Path d="M19 39 L37 42" stroke={accentColor} strokeWidth="2" strokeLinecap="round" />
          <Path d="M54 55 C65 50 78 49 91 51 L85 59 L58 61 Z" fill="#0A1520" stroke={accentColor} strokeOpacity="0.44" strokeWidth="1.3" />

          <Path d="M48 34 L69 35 L61 43 L43 44 Z" fill="#111D28" opacity="0.94" />
          <Path d="M52 31 L69 30" stroke={accentColor} strokeOpacity="0.7" strokeWidth="2.2" strokeLinecap="round" />
          <Path d="M45 48 L70 43" stroke={accentColor} strokeOpacity="0.9" strokeWidth="2.2" strokeLinecap="round" />
          <Path d="M50 51 L79 46" stroke="#0A1520" strokeOpacity="0.75" strokeWidth="3.2" strokeLinecap="round" />
          <Path d="M68 28 L78 40 L90 38" fill="none" stroke={accentColor} strokeWidth="2.2" strokeLinecap="round" />

          <Path d="M43 58 L29 63" stroke="#AFC2CF" strokeWidth="3.5" strokeLinecap="round" />
          <Path d="M67 59 L48 68" stroke="#AFC2CF" strokeWidth="3.3" strokeLinecap="round" />
          <Path d="M46 67 L62 67" stroke={color} strokeWidth="4.2" strokeLinecap="round" />
          <Rect x="40" y="64" width="17" height="5" rx="2.5" fill="#101D28" stroke={accentColor} strokeOpacity="0.5" />

          <Path d="M99 38 L112 36" stroke={accentColor} strokeWidth="2.3" strokeLinecap="round" />
          <Circle cx="98" cy="36" r="2.2" fill={accentColor} />
          <Path d="M93 35 L101 29" stroke="#BFD7E5" strokeWidth="2.4" strokeLinecap="round" />
          <Path d="M99 41 L106 41" stroke="#FFF4B8" strokeWidth="3.2" strokeLinecap="round" />
          <Path d="M28 42 L20 45" stroke="#FF6A7D" strokeWidth="2.8" strokeLinecap="round" />

          <Path d="M84 52 L97 55" stroke="#CFDAE2" strokeWidth="2.8" strokeLinecap="round" />
          <Path d="M83 55 L95 60" stroke="#6E8190" strokeWidth="2.6" strokeLinecap="round" />
          <Circle cx="65" cy="50" r="6.2" fill="#142737" stroke={accentColor} strokeOpacity="0.58" strokeWidth="1.5" />
          <Circle cx="65" cy="50" r="2.4" fill={color} />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  speedLines: { position: 'absolute', left: -5, top: '36%', width: '34%', gap: 5 },
  speedLine: { height: 2, borderRadius: 2 },
  speedLineLong: { width: '100%' },
  speedLineShort: { width: '62%', marginLeft: 6, opacity: 0.7 },
});
