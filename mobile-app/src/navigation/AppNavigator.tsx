import React from 'react';
import { View, ActivityIndicator, Image, TouchableOpacity, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import MapScreen from '../screens/MapScreen';
import SearchScreen from '../screens/SearchScreen';
import MeasureScreen from '../screens/MeasureScreen';
import ProfileScreen from '../screens/ProfileScreen';
import FacilityDetailScreen from '../screens/FacilityDetailScreen';
import RouteScreen from '../screens/RouteScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import { RootStackParamList, TabParamList } from '../types';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/Themecontext';
import { useNavigation } from '@react-navigation/native';
import { emergencyBus } from '../services/emergencyBus';

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();

// [icône pleine (actif), icône contour (inactif)]
const TAB_ICONS: Record<string, [string, string]> = {
  Map: ['map', 'map-outline'],
  Search: ['search', 'search-outline'],
  Measure: ['resize', 'resize-outline'],
  Profile: ['person-circle', 'person-circle-outline'],
};

const TAB_TITLES: Record<keyof TabParamList, string> = {
  Map: 'Carte',
  Search: 'Rechercher',
  Measure: 'Distance',
  Profile: 'Profil',
};

// Bouton URGENCE : même style neutre que les autres onglets,
// icône type « pharmacie / trousse de soins » (croix médicale).
function EmergencyTabButton() {
  const navigation = useNavigation<any>();
  return (
    <TouchableOpacity
      accessibilityLabel="Urgence"
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 6 }}
      onPress={() => {
        navigation.navigate('Map');
        setTimeout(() => emergencyBus.trigger(), 150);
      }}
    >
      <Ionicons name="medkit-outline" size={24} color="#94a3b8" />
      <Text style={{ color: '#94a3b8', fontSize: 10.5, fontWeight: '600', marginTop: 2 }}>Urgence</Text>
    </TouchableOpacity>
  );
}

// Ordre des onglets : Carte, Recherche, Distance, Profil.
function Tabs() {
  const { colors } = useTheme();
  
  const { user } = useAuth();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: '#94a3b8',
        tabBarStyle: { backgroundColor: colors.card },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Profile' && user?.avatar) {
            return (
              <Image
                source={{ uri: user.avatar }}
                style={{
                  width: size, height: size, borderRadius: size / 2,
                  borderWidth: focused ? 2 : 0, borderColor: colors.accent,
                }}
              />
            );
          }
          const pair = TAB_ICONS[route.name] || ['map', 'map-outline'];
          return <Ionicons name={(focused ? pair[0] : pair[1]) as any} size={size} color={color} />;
        },
        tabBarLabel: TAB_TITLES[route.name as keyof TabParamList],
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      {/* Bouton SOS au milieu de la barre */}
      <Tab.Screen
        name={'Urgence' as any}
        component={MapScreen}
        options={{ tabBarButton: () => <EmergencyTabButton /> }}
      />
      <Tab.Screen name="Measure" component={MeasureScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthFlow() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, bootstrapping } = useAuth();
  const { colors } = useTheme();

  if (bootstrapping) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!user) {
    return <AuthFlow />;
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={Tabs} />
      <Stack.Screen name="FacilityDetail" component={FacilityDetailScreen} />
      <Stack.Screen name="Route" component={RouteScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}