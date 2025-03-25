import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import VerifyPhoneScreen from '../screens/auth/VerifyPhoneScreen';

// Chat Screens
import ChatListScreen from '../screens/chat/ChatListScreen';
import ChatScreen from '../screens/chat/ChatScreen';

// Dashboard Screens
import UserDashboard from '../screens/dashboard/UserDashboard';
import PoliceDashboard from '../screens/dashboard/PoliceDashboard';
import AmbulanceDashboard from '../screens/dashboard/AmbulanceDashboard';
import HospitalDashboard from '../screens/dashboard/HospitalDashboard';

const Stack = createStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerStyle: {
            backgroundColor: '#007AFF',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        {/* Auth Stack */}
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{ title: 'Create Account' }}
        />
        <Stack.Screen 
          name="VerifyPhone" 
          component={VerifyPhoneScreen}
          options={{ title: 'Verify Phone' }}
        />

        {/* Chat Stack */}
        <Stack.Screen
          name="ChatList"
          component={ChatListScreen}
          options={{ title: 'Messages' }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={({ route }) => ({
            title: route.params.otherUser.name,
            headerRight: () => (
              <TouchableOpacity
                style={{ marginRight: 15 }}
                onPress={() => {
                  // Handle profile view or additional actions
                }}
              >
                <Icon name="dots-vertical" size={24} color="#fff" />
              </TouchableOpacity>
            ),
          })}
        />

        {/* Dashboard Stacks */}
        <Stack.Screen
          name="UserDashboard"
          component={UserDashboard}
          options={{ 
            title: 'Home',
            headerLeft: null, // Prevent going back to login
          }}
        />
        <Stack.Screen
          name="PoliceDashboard"
          component={PoliceDashboard}
          options={{ 
            title: 'Police Dashboard',
            headerLeft: null,
          }}
        />
        <Stack.Screen
          name="AmbulanceDashboard"
          component={AmbulanceDashboard}
          options={{ 
            title: 'Ambulance Dashboard',
            headerLeft: null,
          }}
        />
        <Stack.Screen
          name="HospitalDashboard"
          component={HospitalDashboard}
          options={{ 
            title: 'Hospital Dashboard',
            headerLeft: null,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
