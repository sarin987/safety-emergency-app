import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { API_URL } from '../../config';

const PoliceDashboard = ({ navigation }) => {
  const [emergencies, setEmergencies] = useState([]);
  const [selectedEmergency, setSelectedEmergency] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [location, setLocation] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });

  useEffect(() => {
    fetchEmergencies();
    const interval = setInterval(fetchEmergencies, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchEmergencies = async () => {
    try {
      const response = await axios.get(`${API_URL}/emergencies/police`);
      setEmergencies(response.data);
    } catch (error) {
      console.error('Error fetching emergencies:', error);
      Alert.alert('Error', 'Failed to fetch emergencies');
    }
  };

  const handleEmergencyResponse = async (emergencyId, action) => {
    try {
      await axios.post(`${API_URL}/emergencies/${emergencyId}/respond`, {
        action,
        responderType: 'police',
      });
      fetchEmergencies();
      setModalVisible(false);
    } catch (error) {
      console.error('Error responding to emergency:', error);
      Alert.alert('Error', 'Failed to respond to emergency');
    }
  };

  const renderEmergencyItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.emergencyItem,
        { borderLeftColor: getEmergencyColor(item.status) }
      ]}
      onPress={() => {
        setSelectedEmergency(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.emergencyHeader}>
        <Text style={styles.emergencyType}>{item.type}</Text>
        <Text style={styles.emergencyTime}>
          {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
      </View>
      <Text style={styles.emergencyLocation}>{item.location.address}</Text>
      <Text style={styles.emergencyStatus}>Status: {item.status}</Text>
    </TouchableOpacity>
  );

  const getEmergencyColor = (status) => {
    switch (status) {
      case 'pending':
        return '#FF3B30';
      case 'responding':
        return '#FF9500';
      case 'resolved':
        return '#34C759';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={location}
      >
        {emergencies.map((emergency) => (
          <Marker
            key={emergency.id}
            coordinate={emergency.location.coordinates}
            title={emergency.type}
            description={emergency.location.address}
            pinColor={getEmergencyColor(emergency.status)}
          />
        ))}
      </MapView>

      <View style={styles.bottomSheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Active Emergencies</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
            <Icon name="message" size={24} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={emergencies}
          renderItem={renderEmergencyItem}
          keyExtractor={(item) => item.id.toString()}
          style={styles.list}
        />
      </View>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedEmergency && (
                <>
                  <Text style={styles.modalTitle}>{selectedEmergency.type}</Text>
                  <Text style={styles.modalText}>
                    Location: {selectedEmergency.location.address}
                  </Text>
                  <Text style={styles.modalText}>
                    Reported by: {selectedEmergency.reporter.name}
                  </Text>
                  <Text style={styles.modalText}>
                    Description: {selectedEmergency.description}
                  </Text>
                  <Text style={styles.modalText}>
                    Status: {selectedEmergency.status}
                  </Text>

                  {selectedEmergency.status === 'pending' && (
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.button, styles.acceptButton]}
                        onPress={() => handleEmergencyResponse(selectedEmergency.id, 'accept')}
                      >
                        <Text style={styles.buttonText}>Accept</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.declineButton]}
                        onPress={() => handleEmergencyResponse(selectedEmergency.id, 'decline')}
                      >
                        <Text style={styles.buttonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedEmergency.status === 'responding' && (
                    <TouchableOpacity
                      style={[styles.button, styles.resolveButton]}
                      onPress={() => handleEmergencyResponse(selectedEmergency.id, 'resolve')}
                    >
                      <Text style={styles.buttonText}>Mark as Resolved</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}

              <TouchableOpacity
                style={[styles.button, styles.closeButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.buttonText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    height: '40%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  list: {
    flex: 1,
  },
  emergencyItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginVertical: 5,
    borderRadius: 10,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  emergencyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  emergencyType: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emergencyTime: {
    color: '#666',
  },
  emergencyLocation: {
    color: '#666',
    marginBottom: 5,
  },
  emergencyStatus: {
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginVertical: 5,
  },
  acceptButton: {
    backgroundColor: '#34C759',
    flex: 1,
    marginRight: 5,
  },
  declineButton: {
    backgroundColor: '#FF3B30',
    flex: 1,
    marginLeft: 5,
  },
  resolveButton: {
    backgroundColor: '#007AFF',
  },
  closeButton: {
    backgroundColor: '#8E8E93',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PoliceDashboard;
