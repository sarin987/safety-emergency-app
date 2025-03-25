import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import locationService from '../../services/location';

interface EmergencyLocation {
  id: string;
  type: string;
  latitude: number;
  longitude: number;
}

const MapScreen = () => {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [emergencyLocations, setEmergencyLocations] = useState<EmergencyLocation[]>([]);

  useEffect(() => {
    const initializeLocation = async () => {
      try {
        const location = await locationService.getCurrentLocation();
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    initializeLocation();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Emergency Map</Text>
      </View>

      {userLocation && (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: userLocation.latitude,
            longitude: userLocation.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
          showsUserLocation
          showsMyLocationButton
        >
          {/* User's safe zone */}
          <Circle
            center={userLocation}
            radius={1000} // 1km radius
            fillColor="rgba(0, 150, 255, 0.2)"
            strokeColor="rgba(0, 150, 255, 0.5)"
          />

          {/* Emergency locations */}
          {emergencyLocations.map((emergency) => (
            <Marker
              key={emergency.id}
              coordinate={{
                latitude: emergency.latitude,
                longitude: emergency.longitude,
              }}
              title={`Emergency: ${emergency.type}`}
              pinColor="red"
            />
          ))}
        </MapView>
      )}
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
  map: {
    flex: 1,
  },
});

export default MapScreen;
