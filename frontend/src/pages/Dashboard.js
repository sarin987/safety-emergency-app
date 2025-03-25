import React from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Box,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const handleEmergencyAlert = () => {
    navigate('/emergency');
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Welcome, {currentUser?.name}
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
                bgcolor: 'error.main',
                color: 'white',
              }}
            >
              <Typography variant="h5" gutterBottom>
                Emergency Alert
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Press the button below in case of emergency to alert your emergency contacts
                and nearby authorities.
              </Typography>
              <Button
                variant="contained"
                color="error"
                size="large"
                onClick={handleEmergencyAlert}
                sx={{
                  mt: 'auto',
                  bgcolor: 'white',
                  color: 'error.main',
                  '&:hover': {
                    bgcolor: 'grey.100',
                  },
                }}
              >
                Activate Emergency Alert
              </Button>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper
              sx={{
                p: 3,
                display: 'flex',
                flexDirection: 'column',
                height: 240,
              }}
            >
              <Typography variant="h5" gutterBottom>
                Quick Actions
              </Typography>
              <Button
                variant="outlined"
                color="primary"
                sx={{ mb: 2 }}
                onClick={() => navigate('/profile')}
              >
                Update Profile
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={() => navigate('/contacts')}
              >
                Manage Emergency Contacts
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;
