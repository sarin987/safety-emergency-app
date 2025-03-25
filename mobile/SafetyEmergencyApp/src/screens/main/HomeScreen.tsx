import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <Text style={styles.headerText}>Safety Emergency</Text>
        </View>

        <View style={styles.quickActions}>
          <Button
            mode="contained"
            style={[styles.actionButton, { backgroundColor: '#e74c3c' }]}
            onPress={() => {/* Handle emergency */}}
          >
            <Ionicons name="warning" size={24} color="white" />
            Emergency SOS
          </Button>
        </View>

        <View style={styles.cardsContainer}>
          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Health Status</Text>
              <View style={styles.healthStats}>
                <Text>Heart Rate: 75 BPM</Text>
                <Text>Steps Today: 5,234</Text>
                <Text>Last Check: 5 min ago</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Safety Score</Text>
              <View style={styles.safetyStats}>
                <Text>Current Location: Safe</Text>
                <Text>Nearby Help: Available</Text>
                <Text>Last Update: Just now</Text>
              </View>
            </Card.Content>
          </Card>

          <Card style={styles.card}>
            <Card.Content>
              <Text style={styles.cardTitle}>Recent Alerts</Text>
              <View style={styles.alertsList}>
                <Text>No recent alerts</Text>
              </View>
            </Card.Content>
          </Card>
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
    padding: 16,
    backgroundColor: '#fff',
  },
  headerText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  quickActions: {
    padding: 16,
  },
  actionButton: {
    marginVertical: 8,
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  healthStats: {
    gap: 8,
  },
  safetyStats: {
    gap: 8,
  },
  alertsList: {
    gap: 8,
  },
});

export default HomeScreen;
