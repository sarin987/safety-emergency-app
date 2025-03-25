import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const EmergencyAlert = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [alertSent, setAlertSent] = useState(false);
  const [location, setLocation] = useState(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          setError('Unable to get your location. Please enable location services.');
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  }, []);

  const handleEmergencyAlert = async () => {
    if (!location) {
      setError('Location is required to send an emergency alert');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await axios.post('/api/emergency/alert', {
        userId: currentUser.id,
        location: location,
        timestamp: new Date().toISOString(),
      });

      setAlertSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send emergency alert');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Box sx={{ mt: 4 }}>
        <Paper
          elevation={3}
          sx={{
            p: 4,
            textAlign: 'center',
            bgcolor: alertSent ? 'success.light' : 'error.light',
            color: 'white',
          }}
        >
          {alertSent ? (
            <>
              <Typography variant="h4" gutterBottom>
                Alert Sent Successfully
              </Typography>
              <Typography variant="body1" paragraph>
                Emergency services and your contacts have been notified.
                Help is on the way.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setAlertSent(false)}
              >
                Send Another Alert
              </Button>
            </>
          ) : (
            <>
              <Typography variant="h4" gutterBottom>
                Emergency Alert
              </Typography>
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}
              <Typography variant="body1" paragraph>
                Press the button below to immediately alert emergency services
                and your emergency contacts.
              </Typography>
              <Button
                variant="contained"
                color="error"
                size="large"
                onClick={handleEmergencyAlert}
                disabled={loading || !location}
                sx={{
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  fontSize: '1.5rem',
                }}
              >
                {loading ? (
                  <CircularProgress color="inherit" />
                ) : (
                  'SEND EMERGENCY ALERT'
                )}
              </Button>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default EmergencyAlert;
