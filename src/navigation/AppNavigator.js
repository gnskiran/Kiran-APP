import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, Folder, Key, Link2, Search, Settings, Info, ClipboardList } from 'lucide-react-native';
import { ThemeContext } from '../context/ThemeContext';

// Import all screens
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import FolderScreen from '../screens/FolderScreen';
import FileScreen from '../screens/FileScreen';
import PasswordScreen from '../screens/PasswordScreen';
import LinkScreen from '../screens/LinkScreen';
import SearchScreen from '../screens/SearchScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AboutScreen from '../screens/AboutScreen';
import TrashScreen from '../screens/TrashScreen';
import TaskScreen from '../screens/TaskScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Bottom-Tab Navigation structure
function BottomTabNavigator() {
  const { colors } = useContext(ThemeContext);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
        }
      }}
    >
      {/* Home tab */}
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size - 2} color={color} />
        }}
      />

      {/* Folders tab */}
      <Tab.Screen
        name="FoldersTab"
        component={FolderScreen}
        options={{
          tabBarLabel: 'Folders',
          tabBarIcon: ({ color, size }) => <Folder size={size - 2} color={color} />
        }}
      />

      {/* Passwords tab */}
      <Tab.Screen
        name="PasswordsTab"
        component={PasswordScreen}
        options={{
          tabBarLabel: 'Vault',
          tabBarIcon: ({ color, size }) => <Key size={size - 2} color={color} />
        }}
      />

      {/* Links tab */}
      <Tab.Screen
        name="LinksTab"
        component={LinkScreen}
        options={{
          tabBarLabel: 'Bookmarks',
          tabBarIcon: ({ color, size }) => <Link2 size={size - 2} color={color} />
        }}
      />

      {/* Tasks tab */}
      <Tab.Screen
        name="TasksTab"
        component={TaskScreen}
        options={{
          tabBarLabel: 'Tasks',
          tabBarIcon: ({ color, size }) => <ClipboardList size={size - 2} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

// Master Stack router mapping splash, tabs, search, settings, details
export default function AppNavigator() {
  const { colors } = useContext(ThemeContext);

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: colors.background }
        }}
      >
        {/* Splash route */}
        <Stack.Screen name="Splash" component={SplashScreen} />

        {/* Core bottom-tab route */}
        <Stack.Screen name="AppHome" component={BottomTabNavigator} />

        {/* Unified Search route */}
        <Stack.Screen name="Search" component={SearchScreen} />

        {/* Global Settings route */}
        <Stack.Screen name="Settings" component={SettingsScreen} />

        {/* Global About route */}
        <Stack.Screen name="About" component={AboutScreen} />

        {/* File detail specs and previews route */}
        <Stack.Screen name="FileDetails" component={FileScreen} />

        {/* Recycle Bin Trash route */}
        <Stack.Screen name="Trash" component={TrashScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
