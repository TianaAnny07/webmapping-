// import { useState } from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import { StatusBar } from 'expo-status-bar';
// import { View, ActivityIndicator } from 'react-native';
// import { SafeAreaProvider } from 'react-native-safe-area-context';
// import AppNavigator from './src/navigation/AppNavigator';
// import LoginScreen from './src/screens/LoginScreen';
// import RegisterScreen from './src/screens/RegisterScreen';
// import { AlertProvider } from './src/context/AlertContext';
// import { AuthProvider, useAuth } from './src/context/AuthContext';

// function Root() {
//   const { user, loading } = useAuth();
//   const [showRegister, setShowRegister] = useState(false);

//   if (loading) {
//     return (
//       <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
//         <ActivityIndicator size="large" color="#00c9a7" />
//       </View>
//     );
//   }

//   // Comme sur le web : le login (ou l'inscription) s'affiche en premier,
//   // avant tout accès à la carte ou à toute autre partie de l'application.
//   if (!user) {
//     return showRegister ? (
//       <RegisterScreen onGoToLogin={() => setShowRegister(false)} />
//     ) : (
//       <LoginScreen onGoToRegister={() => setShowRegister(true)} />
//     );
//   }

//   return (
//     <NavigationContainer>
//       <AppNavigator />
//     </NavigationContainer>
//   );
// }

// export default function App() {
//   return (
//     <SafeAreaProvider>
//       <AuthProvider>
//         <AlertProvider>
//           <StatusBar style="dark" />
//           <Root />
//         </AlertProvider>
//       </AuthProvider>
//     </SafeAreaProvider>
//   );
// }
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider, useTheme } from './src/context/Themecontext';
import { AuthProvider } from './src/context/AuthContext';

function Root() {
  const { isDark } = useTheme();
  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <Root />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}