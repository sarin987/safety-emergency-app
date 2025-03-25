import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';

interface LocationState {
  latitude: number;
  longitude: number;
}

const EmergencyScreen = () => {
  const [location, setLocation] = useState<LocationState | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required for emergency services.');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  const handleEmergency = async () => {
    setLoading(true);
    try {
      // TODO: Implement emergency alert logic
      Alert.alert(
        'Emergency Alert Sent',
        'Help is on the way. Stay calm and remain in your location.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send emergency alert. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Emergency Response</Text>
      </View>

      <View style={styles.mapContainer}>
        {location && (
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: location.latitude,
              longitude: location.longitude,
              latitudeDelta: 0.0922,
              longitudeDelta: 0.0421,
            }}
          >
            <Marker
              coordinate={{
                latitude: location.latitude,
                longitude: location.longitude,
              }}
              title="Your Location"
            />
          </MapView>
        )}
      </View>

      <View style={styles.actionContainer}>
        <Button
          mode="contained"
          style={[styles.button, styles.sosButton]}
          labelStyle={styles.buttonLabel}
          onPress={handleEmergency}
          loading={loading}
          disabled={loading}
        >
          <Ionicons name="warning" size={24} color="white" />
          {' SOS EMERGENCY'}
        </Button>

        <View style={styles.quickActions}>
          <Button
            mode="contained"
            style={[styles.button, styles.policeButton]}
            onPress={() => {/* Handle police */}}
          >
            Police
          </Button>
          <Button
            mode="contained"
            style={[styles.button, styles.ambulanceButton]}
            onPress={() => {/* Handle ambulance */}}
          >
            Ambulance
          </Button>
          <Button
            mode="contained"
            style={[styles.button, styles.fireButton]}
            onPress={() => {/* Handle fire */}}
          >
            Fire
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f6fa',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  actionContainer: {
    padding: 16,
    backgroundColor: '#fff',
  },
  button: {
    marginVertical: 8,
  },
  buttonLabel: {
    fontSize: 18,
  },
  sosButton: {
    backgroundColor: '#e74c3c',
    padding: 8,
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  policeButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#3498db',
  },
  ambulanceButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#2ecc71',
  },
  fireButton: {
    flex: 1,
    marginHorizontal: 4,
    backgroundColor: '#e67e22',
  },
});

export default EmergencyScreen;
