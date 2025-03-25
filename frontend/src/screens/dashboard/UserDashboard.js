import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Alert,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { API_URL } from '../../config';
import { io } from 'socket.io-client';

const UserDashboard = () => {
  const [location, setLocation] = useState(null);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [nearbyServices, setNearbyServices] = useState({
    police: [],
    ambulance: [],
    hospitals: []
  });
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    requestLocationPermission();
    initializeSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  const initializeSocket = () => {
    const newSocket = io(API_URL);
    newSocket.on('connect', () => {
      console.log('Connected to socket server');
    });
    newSocket.on('serviceLocationUpdate', (data) => {
      updateNearbyService(data);
    });
    setSocket(newSocket);
  };

  const requestLocationPermission = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          {
            title: 'Location Permission',
            message: 'This app needs access to your location',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        if (granted === PermissionsAndroid.RESULTS.GRANTED) {
          getCurrentLocation();
        }
      } else {
        getCurrentLocation();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const getCurrentLocation = () => {
    Geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setLocation({ latitude, longitude });
        fetchNearbyServices({ latitude, longitude });
      },
      (error) => Alert.alert('Error', error.message),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  const fetchNearbyServices = async (location) => {
    try {
      const response = await axios.get(`${API_URL}/services/nearby`, {
        params: {
          latitude: location.latitude,
          longitude: location.longitude,
          radius: 5000 // 5km radius
        }
      });
      setNearbyServices(response.data);
    } catch (error) {
      console.error('Error fetching nearby services:', error);
    }
  };

  const updateNearbyService = (data) => {
    setNearbyServices(prev => ({
      ...prev,
      [data.type]: prev[data.type].map(service => 
        service.id === data.id ? { ...service, ...data } : service
      )
    }));
  };

  const toggleTracking = async () => {
    try {
      if (!isTrackingEnabled) {
        // Start location tracking
        const response = await axios.post(`${API_URL}/tracking/start`, {
          userId: 'current-user-id', // Replace with actual user ID
          location
        });
        
        if (response.data.success) {
          setIsTrackingEnabled(true);
          Alert.alert('Success', 'Location tracking enabled');
        }
      } else {
        // Stop location tracking
        await axios.post(`${API_URL}/tracking/stop`, {
          userId: 'current-user-id' // Replace with actual user ID
        });
        setIsTrackingEnabled(false);
        Alert.alert('Success', 'Location tracking disabled');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle tracking');
    }
  };

  const sendSOS = async () => {
    try {
      const response = await axios.post(`${API_URL}/emergency/sos`, {
        userId: 'current-user-id', // Replace with actual user ID
        location,
        timestamp: new Date().toISOString()
      });

      if (response.data.success) {
        Alert.alert('SOS Sent', 'Emergency services have been notified');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send SOS');
    }
  };

  const openChat = (serviceId, serviceType) => {
    // Navigate to chat screen
    navigation.navigate('Chat', { serviceId, serviceType });
  };

  if (!location) {
    return (
      <View style={styles.center}>
        <Text>Loading map...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        region={{
          ...location,
          latitudeDelta: 0.015,
          longitudeDelta: 0.0121,
        }}
      >
        {/* User's location */}
        <Marker
          coordinate={location}
          title="You are here"
          pinColor="blue"
        />

        {/* Police markers */}
        {nearbyServices.police.map((police) => (
          <Marker
            key={police.id}
            coordinate={police.location}
            title={police.name}
            description="Police Station"
            pinColor="red"
          />
        ))}

        {/* Ambulance markers */}
        {nearbyServices.ambulance.map((ambulance) => (
          <Marker
            key={ambulance.id}
            coordinate={ambulance.location}
            title={ambulance.name}
            description="Ambulance"
            pinColor="green"
          />
        ))}

        {/* Hospital markers */}
        {nearbyServices.hospitals.map((hospital) => (
          <Marker
            key={hospital.id}
            coordinate={hospital.location}
            title={hospital.name}
            description="Hospital"
            pinColor="yellow"
          />
        ))}
      </MapView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.sosButton]}
          onPress={sendSOS}
        >
          <Icon name="alert" size={24} color="white" />
          <Text style={styles.buttonText}>SOS</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, isTrackingEnabled ? styles.activeButton : styles.inactiveButton]}
          onPress={toggleTracking}
        >
          <Icon name="map-marker" size={24} color="white" />
          <Text style={styles.buttonText}>
            {isTrackingEnabled ? 'Stop Tracking' : 'Start Tracking'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.searchButton]}
          onPress={() => navigation.navigate('Search')}
        >
          <Icon name="magnify" size={24} color="white" />
          <Text style={styles.buttonText}>Search</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 25,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  sosButton: {
    backgroundColor: '#FF0000',
    minWidth: 100,
  },
  activeButton: {
    backgroundColor: '#4CAF50',
    minWidth: 140,
  },
  inactiveButton: {
    backgroundColor: '#2196F3',
    minWidth: 140,
  },
  searchButton: {
    backgroundColor: '#FF9800',
    minWidth: 100,
  },
  buttonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: 'bold',
  },
});

export default UserDashboard;
