import { View, ActivityIndicator, Image } from 'react-native';
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

const Stack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ICONS: Record<keyof TabParamList, any> = {
  Map: 'map',
  Search: 'search',
  Measure: 'resize-outline',
  Profile: 'person-circle-outline',
};

const TAB_TITLES: Record<keyof TabParamList, string> = {
  Map: 'Carte',
  Search: 'Rechercher',
  Measure: 'Distance',
  Profile: 'Profil',
};

// Ordre des onglets : Carte, Recherche, Distance, Profil.
function Tabs() {
  const { colors } = useTheme();
  // On lit `user` ici (pas seulement dans ProfileScreen) pour que l'icône
  // de l'onglet se mette à jour dès que l'avatar change, où que ce soit
  // dans l'app — updateUser() dans AuthContext déclenche ce re-render.
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
          return <Ionicons name={TAB_ICONS[route.name as keyof TabParamList]} size={size} color={color} />;
        },
        tabBarLabel: TAB_TITLES[route.name as keyof TabParamList],
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
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