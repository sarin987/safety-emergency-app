import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import axios from 'axios';
import { API_URL } from '../../config';

const LoginScreen = ({ navigation }) => {
  const [userType, setUserType] = useState('normal');
  const [credentials, setCredentials] = useState({
    email: '',
    phoneNumber: '',
  });

  const handleLogin = async () => {
    try {
      if (userType === 'normal' && !credentials.email) {
        Alert.alert('Error', 'Please enter your email');
        return;
      }

      const response = await axios.post(`${API_URL}/auth/login`, {
        ...credentials,
        userType,
      });

      // Store the token in secure storage (you'll need to implement this)
      // await SecureStore.setItemAsync('userToken', response.data.token);

      // Navigate to appropriate dashboard based on user type
      switch (userType) {
        case 'normal':
          navigation.replace('UserDashboard');
          break;
        case 'police':
          navigation.replace('PoliceDashboard');
          break;
        case 'ambulance':
          navigation.replace('AmbulanceDashboard');
          break;
        case 'hospital':
          navigation.replace('HospitalDashboard');
          break;
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert(
        'Login Failed',
        error.response?.data?.message || 'An error occurred during login'
      );
    }
  };

  const UserTypeButton = ({ type, label }) => (
    <TouchableOpacity
      style={[
        styles.userTypeButton,
        userType === type && styles.userTypeButtonActive,
      ]}
      onPress={() => setUserType(type)}
    >
      <Text
        style={[
          styles.userTypeText,
          userType === type && styles.userTypeTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>

      <View style={styles.userTypeContainer}>
        <UserTypeButton type="normal" label="User" />
        <UserTypeButton type="police" label="Police" />
        <UserTypeButton type="ambulance" label="Ambulance" />
        <UserTypeButton type="hospital" label="Hospital" />
      </View>

      {userType === 'normal' ? (
        <TextInput
          style={styles.input}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={credentials.email}
          onChangeText={(text) =>
            setCredentials((prev) => ({ ...prev, email: text }))
          }
        />
      ) : (
        <TextInput
          style={styles.input}
          placeholder="ID Number"
          value={credentials.idNumber}
          onChangeText={(text) =>
            setCredentials((prev) => ({ ...prev, idNumber: text }))
          }
        />
      )}

      <TextInput
        style={styles.input}
        placeholder="Phone Number"
        keyboardType="phone-pad"
        value={credentials.phoneNumber}
        onChangeText={(text) =>
          setCredentials((prev) => ({ ...prev, phoneNumber: text }))
        }
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      {userType === 'normal' && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>Don't have an account? Register</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  userTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  userTypeButton: {
    width: '48%',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 10,
    alignItems: 'center',
  },
  userTypeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  userTypeText: {
    color: '#333',
  },
  userTypeTextActive: {
    color: '#fff',
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 15,
    padding: 10,
    alignItems: 'center',
  },
  linkText: {
    color: '#007AFF',
    fontSize: 14,
  },
});

export default LoginScreen;
