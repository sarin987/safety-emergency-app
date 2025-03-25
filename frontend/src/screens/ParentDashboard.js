import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert,
} from 'react-native';
import MapView, { Marker, Circle } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LineChart } from 'react-native-chart-kit';
import { io } from 'socket.io-client';
import { API_URL } from '../config';

const ParentDashboard = ({ navigation }) => {
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [vitalsHistory, setVitalsHistory] = useState([]);
  const [safeZones, setSafeZones] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const socket = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    initializeSocket();
    fetchChildrenData();
    return () => {
      if (socket.current) {
        socket.current.disconnect();
      }
    };
  }, []);

  const initializeSocket = () => {
    socket.current = io(API_URL);
    
    socket.current.on('locationUpdate', handleLocationUpdate);
    socket.current.on('vitalsUpdate', handleVitalsUpdate);
    socket.current.on('activityUpdate', handleActivityUpdate);
    socket.current.on('safetyAlert', handleSafetyAlert);
    socket.current.on('healthAlert', handleHealthAlert);
    socket.current.on('emergency', handleEmergency);
  };

  const fetchChildrenData = async () => {
    try {
      const response = await fetch(`${API_URL}/parent/children`);
      const data = await response.json();
      setChildren(data);
      if (data.length > 0) {
        setSelectedChild(data[0]);
        fetchChildDetails(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching children data:', error);
      Alert.alert('Error', 'Failed to fetch children data');
    }
  };

  const fetchChildDetails = async (childId) => {
    try {
      const [vitalsRes, zonesRes, alertsRes] = await Promise.all([
        fetch(`${API_URL}/parent/children/${childId}/vitals`),
        fetch(`${API_URL}/parent/children/${childId}/zones`),
        fetch(`${API_URL}/parent/children/${childId}/alerts`)
      ]);

      const [vitals, zones, alertsData] = await Promise.all([
        vitalsRes.json(),
        zonesRes.json(),
        alertsRes.json()
      ]);

      setVitalsHistory(vitals);
      setSafeZones(zones);
      setAlerts(alertsData);
    } catch (error) {
      console.error('Error fetching child details:', error);
      Alert.alert('Error', 'Failed to fetch child details');
    }
  };

  const handleLocationUpdate = (update) => {
    const child = children.find(c => c.deviceId === update.deviceId);
    if (child) {
      setChildren(prev => prev.map(c => 
        c.deviceId === update.deviceId 
          ? { ...c, location: update.location }
          : c
      ));

      if (selectedChild?.deviceId === update.deviceId) {
        mapRef.current?.animateToRegion({
          ...update.location,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01
        });
      }
    }
  };

  const handleVitalsUpdate = (update) => {
    if (selectedChild?.deviceId === update.deviceId) {
      setVitalsHistory(prev => [...prev, update.vitals].slice(-24));
    }
  };

  const handleActivityUpdate = (update) => {
    // Update activity indicators
  };

  const handleSafetyAlert = (alert) => {
    setAlerts(prev => [alert, ...prev]);
    Alert.alert(
      'Safety Alert',
      `${selectedChild.name} has left the safe zone at ${alert.location.address}`,
      [
        { text: 'View', onPress: () => navigation.navigate('AlertDetails', { alert }) },
        { text: 'OK' }
      ]
    );
  };

  const handleHealthAlert = (alert) => {
    setAlerts(prev => [alert, ...prev]);
    Alert.alert(
      'Health Alert',
      `Unusual vital signs detected for ${selectedChild.name}`,
      [
        { text: 'View', onPress: () => navigation.navigate('AlertDetails', { alert }) },
        { text: 'OK' }
      ]
    );
  };

  const handleEmergency = (emergency) => {
    setAlerts(prev => [emergency, ...prev]);
    Alert.alert(
      'Emergency Alert',
      `Emergency detected for ${selectedChild.name}!`,
      [
        { 
          text: 'View',
          onPress: () => navigation.navigate('EmergencyResponse', { emergency }),
          style: 'destructive'
        },
        { text: 'Call Now', onPress: () => callEmergencyContact() }
      ]
    );
  };

  const renderVitalsChart = () => {
    if (!vitalsHistory.length) return null;

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Vital Signs</Text>
        <LineChart
          data={{
            labels: vitalsHistory.map(v => v.time),
            datasets: [{
              data: vitalsHistory.map(v => v.heartRate)
            }]
          }}
          width={Dimensions.get('window').width - 40}
          height={200}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
            style: {
              borderRadius: 16
            }
          }}
          style={styles.chart}
        />
      </View>
    );
  };

  const renderMap = () => {
    if (!selectedChild?.location) return null;

    return (
      <View style={styles.mapContainer}>
        <MapView
          ref={mapRef}
          style={styles.map}
          initialRegion={{
            ...selectedChild.location,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01
          }}
        >
          <Marker
            coordinate={selectedChild.location}
            title={selectedChild.name}
            description={selectedChild.status}
          >
            <Icon name="account" size={30} color="#007AFF" />
          </Marker>

          {safeZones.map(zone => (
            <Circle
              key={zone.id}
              center={zone.center}
              radius={zone.radius}
              fillColor="rgba(0, 122, 255, 0.1)"
              strokeColor="rgba(0, 122, 255, 0.3)"
              strokeWidth={2}
            />
          ))}
        </MapView>
      </View>
    );
  };

  const renderAlerts = () => {
    return (
      <View style={styles.alertsContainer}>
        <Text style={styles.sectionTitle}>Recent Alerts</Text>
        {alerts.map(alert => (
          <TouchableOpacity
            key={alert.id}
            style={styles.alertItem}
            onPress={() => navigation.navigate('AlertDetails', { alert })}
          >
            <Icon
              name={getAlertIcon(alert.type)}
              size={24}
              color={getAlertColor(alert.type)}
            />
            <View style={styles.alertContent}>
              <Text style={styles.alertTitle}>{getAlertTitle(alert)}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color="#999" />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Child Monitor</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
        >
          <Icon name="cog" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.childList} horizontal>
        {children.map(child => (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.childItem,
              selectedChild?.id === child.id && styles.selectedChild
            ]}
            onPress={() => {
              setSelectedChild(child);
              fetchChildDetails(child.id);
            }}
          >
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.childStatus}>{child.status}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content}>
        {renderMap()}
        {renderVitalsChart()}
        {renderAlerts()}
      </ScrollView>

      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={() => navigation.navigate('Emergency')}
      >
        <Icon name="alert" size={24} color="#fff" />
        <Text style={styles.emergencyButtonText}>Emergency</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  childList: {
    backgroundColor: '#fff',
    paddingVertical: 10,
  },
  childItem: {
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    minWidth: 100,
    alignItems: 'center',
  },
  selectedChild: {
    backgroundColor: '#007AFF',
  },
  childName: {
    fontWeight: '600',
    marginBottom: 5,
  },
  childStatus: {
    fontSize: 12,
    color: '#666',
  },
  content: {
    flex: 1,
  },
  mapContainer: {
    height: 300,
    margin: 15,
    borderRadius: 15,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
  chartContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 15,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
  },
  chart: {
    borderRadius: 15,
  },
  alertsContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 15,
  },
  alertItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  alertContent: {
    flex: 1,
    marginLeft: 10,
  },
  alertTitle: {
    fontWeight: '500',
    marginBottom: 2,
  },
  alertTime: {
    fontSize: 12,
    color: '#666',
  },
  emergencyButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#FF3B30',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emergencyButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    marginLeft: 5,
  },
});

export default ParentDashboard;
