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
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import axios from 'axios';
import { API_URL } from '../../config';

const HospitalDashboard = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bedCapacity, setBedCapacity] = useState({
    total: 100,
    occupied: 75,
    emergency: 10,
    available: 15,
  });
  const [stats, setStats] = useState({
    incomingPatients: 0,
    criticalCases: 0,
    ambulancesEnRoute: 0,
  });

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [patientsRes, statsRes, capacityRes] = await Promise.all([
        axios.get(`${API_URL}/hospital/patients`),
        axios.get(`${API_URL}/hospital/stats`),
        axios.get(`${API_URL}/hospital/capacity`),
      ]);

      setPatients(patientsRes.data);
      setStats(statsRes.data);
      setBedCapacity(capacityRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      Alert.alert('Error', 'Failed to fetch dashboard data');
    }
  };

  const handlePatientAction = async (patientId, action) => {
    try {
      await axios.post(`${API_URL}/hospital/patients/${patientId}/${action}`);
      fetchDashboardData();
      setModalVisible(false);
    } catch (error) {
      console.error('Error updating patient:', error);
      Alert.alert('Error', 'Failed to update patient status');
    }
  };

  const renderStatCard = ({ title, value, icon, color }) => (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <Icon name={icon} size={24} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );

  const renderBedCapacity = () => (
    <View style={styles.capacityContainer}>
      <Text style={styles.sectionTitle}>Bed Capacity</Text>
      <View style={styles.capacityBar}>
        <View 
          style={[
            styles.capacitySegment, 
            { 
              flex: bedCapacity.occupied,
              backgroundColor: '#FF3B30'
            }
          ]} 
        />
        <View 
          style={[
            styles.capacitySegment, 
            { 
              flex: bedCapacity.emergency,
              backgroundColor: '#FF9500'
            }
          ]} 
        />
        <View 
          style={[
            styles.capacitySegment, 
            { 
              flex: bedCapacity.available,
              backgroundColor: '#34C759'
            }
          ]} 
        />
      </View>
      <View style={styles.capacityLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF3B30' }]} />
          <Text>Occupied ({bedCapacity.occupied})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#FF9500' }]} />
          <Text>Emergency ({bedCapacity.emergency})</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendColor, { backgroundColor: '#34C759' }]} />
          <Text>Available ({bedCapacity.available})</Text>
        </View>
      </View>
    </View>
  );

  const renderPatientItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.patientItem,
        { borderLeftColor: getPatientStatusColor(item.status) }
      ]}
      onPress={() => {
        setSelectedPatient(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.patientHeader}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={[
          styles.patientStatus,
          { color: getPatientStatusColor(item.status) }
        ]}>
          {item.status}
        </Text>
      </View>
      <Text style={styles.patientInfo}>Age: {item.age}</Text>
      <Text style={styles.patientInfo}>
        Admitted: {new Date(item.admittedAt).toLocaleDateString()}
      </Text>
      {item.ambulanceEta && (
        <View style={styles.etaBadge}>
          <Icon name="ambulance" size={16} color="#fff" />
          <Text style={styles.etaText}>ETA: {item.ambulanceEta} min</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const getPatientStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return '#FF3B30';
      case 'stable':
        return '#34C759';
      case 'incoming':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView>
        <View style={styles.statsContainer}>
          {renderStatCard({
            title: 'Incoming',
            value: stats.incomingPatients,
            icon: 'ambulance',
            color: '#FF9500',
          })}
          {renderStatCard({
            title: 'Critical',
            value: stats.criticalCases,
            icon: 'hospital-box',
            color: '#FF3B30',
          })}
          {renderStatCard({
            title: 'En Route',
            value: stats.ambulancesEnRoute,
            icon: 'map-marker',
            color: '#5856D6',
          })}
        </View>

        {renderBedCapacity()}

        <View style={styles.patientsList}>
          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Patients</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ChatList')}>
              <Icon name="message" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={patients}
            renderItem={renderPatientItem}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <ScrollView>
              {selectedPatient && (
                <>
                  <Text style={styles.modalTitle}>{selectedPatient.name}</Text>
                  <View style={styles.patientDetails}>
                    <Text style={styles.modalText}>Age: {selectedPatient.age}</Text>
                    <Text style={styles.modalText}>
                      Blood Type: {selectedPatient.bloodType}
                    </Text>
                    <Text style={styles.modalText}>
                      Status: {selectedPatient.status}
                    </Text>
                    <Text style={styles.modalText}>
                      Room: {selectedPatient.room || 'Not assigned'}
                    </Text>
                  </View>

                  <View style={styles.medicalInfo}>
                    <Text style={styles.sectionTitle}>Medical Information</Text>
                    <Text style={styles.modalText}>
                      Condition: {selectedPatient.condition}
                    </Text>
                    <Text style={styles.modalText}>
                      Allergies: {selectedPatient.allergies || 'None'}
                    </Text>
                    <Text style={styles.modalText}>
                      Medications: {selectedPatient.medications || 'None'}
                    </Text>
                  </View>

                  {selectedPatient.status === 'incoming' && (
                    <View style={styles.buttonContainer}>
                      <TouchableOpacity
                        style={[styles.button, styles.acceptButton]}
                        onPress={() => handlePatientAction(selectedPatient.id, 'accept')}
                      >
                        <Text style={styles.buttonText}>Accept Patient</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.button, styles.declineButton]}
                        onPress={() => handlePatientAction(selectedPatient.id, 'decline')}
                      >
                        <Text style={styles.buttonText}>Decline</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {selectedPatient.status === 'admitted' && (
                    <TouchableOpacity
                      style={[styles.button, styles.dischargeButton]}
                      onPress={() => handlePatientAction(selectedPatient.id, 'discharge')}
                    >
                      <Text style={styles.buttonText}>Discharge Patient</Text>
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
    backgroundColor: '#f5f5f5',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 5,
  },
  statTitle: {
    fontSize: 12,
    color: '#666',
  },
  capacityContainer: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  capacityBar: {
    flexDirection: 'row',
    height: 20,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  capacitySegment: {
    height: '100%',
  },
  capacityLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 5,
  },
  patientsList: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  patientItem: {
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
  patientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  patientName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  patientStatus: {
    fontWeight: '500',
  },
  patientInfo: {
    color: '#666',
    marginBottom: 2,
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5856D6',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: 5,
  },
  etaText: {
    color: '#fff',
    marginLeft: 5,
    fontSize: 12,
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
  patientDetails: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  medicalInfo: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    marginVertical: 15,
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
  dischargeButton: {
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

export default HospitalDashboard;
