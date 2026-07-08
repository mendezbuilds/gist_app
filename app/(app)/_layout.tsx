/**
 * App tab navigator layout
 * Placeholder tabs: Chats, Status, Calls, Profile
 * Styled with Adire color tokens.
 */

import { Tabs } from 'expo-router';
import { View, Pressable, Text } from 'react-native';
import { useTheme } from '../../src/theme';
import { useMessagingStore } from '../../src/store/messagingStore';
import { MessageSquare, CircleDot, Phone, User } from 'lucide-react-native';

function TabIcon({ Icon, focused, color }: { Icon: any; focused: boolean; color: any }) {
  return (
    <Icon
      size={22}
      color={color}
      strokeWidth={focused ? 2.4 : 1.8}
    />
  );
}

function CustomTabBar({ state, descriptors, navigation, colors }: any) {
  const unreadCounts = useMessagingStore(state => state.unreadCounts);
  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

  const currentRoute = state.routes[state.index];
  const currentOptions = descriptors[currentRoute.key].options;
  
  // Respect display: 'none' for hidden screens (like chat rooms)
  if (currentOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center' }}>
      <View style={{
        borderRadius: 38,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
      }}>
        <View
          style={{
            width: 280,
            height: 76,
            borderRadius: 38,
            overflow: 'hidden',
            backgroundColor: colors.surfaceOverlay,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          
          // Expo Router might obscure href: null, so we also check for missing title or explicit display: none
          if (options.href === null || !options.title || options.tabBarStyle?.display === 'none') {
            return null;
          }

          const isFocused = state.index === index;
          const color = isFocused ? colors.tabActive : colors.tabInactive;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              {options.tabBarIcon && options.tabBarIcon({ focused: isFocused, color })}
              {route.name === 'chats/index' && totalUnread > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 8,
                  right: '25%',
                  backgroundColor: colors.brandHighlight,
                  borderRadius: 10,
                  minWidth: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingHorizontal: 4,
                  borderWidth: 1.5,
                  borderColor: colors.surfaceOverlay,
                }}>
                  <Text style={{ color: '#FFF', fontSize: 9, fontFamily: 'Nunito_700Bold' }}>{totalUnread}</Text>
                </View>
              )}
              <Text style={{ fontFamily: 'Nunito_600SemiBold', fontSize: 10, marginTop: 4, color }}>
                {options.title}
              </Text>
            </Pressable>
          );
        })}
        </View>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} colors={colors} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="chats/index"
        options={{
          title: 'Chats',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={MessageSquare} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="status/index"
        options={{
          title: 'Status',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={CircleDot} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calls/index"
        options={{
          title: 'Calls',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={Phone} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile/index"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => (
            <TabIcon Icon={User} focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chats/new"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="chats/new-group"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="chats/group-info"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
      <Tabs.Screen
        name="chats/[chatId]"
        options={{
          href: null,
          tabBarStyle: { display: 'none' },
        }}
      />
    </Tabs>
  );
}
