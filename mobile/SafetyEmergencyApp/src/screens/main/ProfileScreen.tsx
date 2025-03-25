import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Avatar, List, Switch } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [locationTracking, setLocationTracking] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' as never }],
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Avatar.Image
            size={80}
            source={{ uri: 'https://i.pravatar.cc/300' }}
          />
          <Text style={styles.name}>John Doe</Text>
          <Text style={styles.email}>john.doe@example.com</Text>
        </View>

        <List.Section>
          <List.Subheader>Safety Settings</List.Subheader>
          
          <List.Item
            title="Location Tracking"
            description="Allow continuous location tracking"
            left={(props) => <List.Icon {...props} icon="map-marker" />}
            right={() => (
              <Switch
                value={locationTracking}
                onValueChange={setLocationTracking}
              />
            )}
          />

          <List.Item
            title="Emergency Contacts"
            description="Notify contacts during emergencies"
            left={(props) => <List.Icon {...props} icon="contacts" />}
            right={() => (
              <Switch
                value={emergencyContacts}
                onValueChange={setEmergencyContacts}
              />
            )}
          />

          <List.Item
            title="Biometric Authentication"
            description="Use fingerprint or face ID"
            left={(props) => <List.Icon {...props} icon="fingerprint" />}
            right={() => (
              <Switch
                value={biometricAuth}
                onValueChange={setBiometricAuth}
              />
            )}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          
          <List.Item
            title="Edit Profile"
            left={(props) => <List.Icon {...props} icon="account-edit" />}
            onPress={() => {/* Handle edit profile */}}
          />

          <List.Item
            title="Emergency Contacts"
            left={(props) => <List.Icon {...props} icon="phone" />}
            onPress={() => {/* Handle emergency contacts */}}
          />

          <List.Item
            title="Privacy Settings"
            left={(props) => <List.Icon {...props} icon="shield-account" />}
            onPress={() => {/* Handle privacy settings */}}
          />

          <List.Item
            title="Help & Support"
            left={(props) => <List.Icon {...props} icon="help-circle" />}
            onPress={() => {/* Handle help & support */}}
          />
        </List.Section>

        <View style={styles.logoutContainer}>
          <Button
            mode="contained"
            onPress={handleLogout}
            style={styles.logoutButton}
            buttonColor="#e74c3c"
          >
            Logout
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  logoutContainer: {
    padding: 16,
  },
  logoutButton: {
    marginTop: 8,
  },
});

export default ProfileScreen;
