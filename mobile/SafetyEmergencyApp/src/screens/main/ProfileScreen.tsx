import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Button, Avatar, List, Switch, Divider, Portal, Dialog, TextInput } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { authService } from '../../services/auth';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const [locationTracking, setLocationTracking] = useState(true);
  const [emergencyContacts, setEmergencyContacts] = useState(true);
  const [biometricAuth, setBiometricAuth] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [deleteDialogVisible, setDeleteDialogVisible] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    const userData = await authService.getUser();
    setUser(userData);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await authService.logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' as never }],
              });
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      setError('Please enter your password');
      return;
    }

    setLoading(true);
    try {
      await authService.deleteAccount(deletePassword);
      setDeleteDialogVisible(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' as never }],
      });
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
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
          <Text style={styles.name}>{user ? `${user.first_name} ${user.last_name}` : 'Loading...'}</Text>
          <Text style={styles.email}>{user?.email || 'Loading...'}</Text>
        </View>

        <List.Section>
          <List.Subheader>Safety Settings</List.Subheader>
          
          <List.Item
            title="Location Tracking"
            description="Allow continuous location tracking"
            left={(props) => <List.Icon {...props} icon="map-marker" color="#1e88e5" />}
            right={() => (
              <Switch
                value={locationTracking}
                onValueChange={setLocationTracking}
                color="#1e88e5"
              />
            )}
          />

          <List.Item
            title="Emergency Contacts"
            description="Notify contacts during emergencies"
            left={(props) => <List.Icon {...props} icon="contacts" color="#1e88e5" />}
            right={() => (
              <Switch
                value={emergencyContacts}
                onValueChange={setEmergencyContacts}
                color="#1e88e5"
              />
            )}
          />

          <List.Item
            title="Biometric Authentication"
            description="Use fingerprint or face ID"
            left={(props) => <List.Icon {...props} icon="fingerprint" color="#1e88e5" />}
            right={() => (
              <Switch
                value={biometricAuth}
                onValueChange={setBiometricAuth}
                color="#1e88e5"
              />
            )}
          />
        </List.Section>

        <Divider />

        <List.Section>
          <List.Subheader>Account</List.Subheader>
          
          <List.Item
            title="Edit Profile"
            description="Update your personal information"
            left={(props) => <List.Icon {...props} icon="account-edit" color="#1e88e5" />}
            onPress={() => {/* Handle edit profile */}}
          />

          <List.Item
            title="Emergency Contacts"
            description="Manage your emergency contacts"
            left={(props) => <List.Icon {...props} icon="phone" color="#1e88e5" />}
            onPress={() => {/* Handle emergency contacts */}}
          />

          <List.Item
            title="Privacy Settings"
            description="Control your privacy preferences"
            left={(props) => <List.Icon {...props} icon="shield-account" color="#1e88e5" />}
            onPress={() => {/* Handle privacy settings */}}
          />

          <List.Item
            title="Help & Support"
            description="Get help and contact support"
            left={(props) => <List.Icon {...props} icon="help-circle" color="#1e88e5" />}
            onPress={() => {/* Handle help and support */}}
          />
        </List.Section>

        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            icon="logout"
            onPress={handleLogout}
            style={styles.logoutButton}
            textColor="#dc3545"
          >
            Logout
          </Button>

          <Button
            mode="outlined"
            icon="delete"
            onPress={() => setDeleteDialogVisible(true)}
            style={styles.deleteButton}
            textColor="#dc3545"
          >
            Delete Account
          </Button>
        </View>
      </ScrollView>

      <Portal>
        <Dialog visible={deleteDialogVisible} onDismiss={() => setDeleteDialogVisible(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              This action cannot be undone. All your data will be permanently deleted.
              Please enter your password to confirm.
            </Text>
            <TextInput
              label="Password"
              value={deletePassword}
              onChangeText={(text) => {
                setDeletePassword(text);
                setError('');
              }}
              secureTextEntry
              mode="outlined"
              error={!!error}
              style={styles.input}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteDialogVisible(false)}>Cancel</Button>
            <Button
              mode="contained"
              onPress={handleDeleteAccount}
              loading={loading}
              disabled={loading || !deletePassword}
              buttonColor="#dc3545"
            >
              Delete Account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#e1e8ed',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#1e88e5',
  },
  email: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  buttonContainer: {
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  logoutButton: {
    borderColor: '#dc3545',
  },
  deleteButton: {
    borderColor: '#dc3545',
  },
  dialogText: {
    marginBottom: 16,
    color: '#666',
  },
  input: {
    marginBottom: 8,
  },
  errorText: {
    color: '#dc3545',
    fontSize: 12,
  },
});

export default ProfileScreen;
