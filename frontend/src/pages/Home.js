import React from 'react';
import { Container, Typography, Button, Box } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Home = () => {
  const { currentUser } = useAuth();

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          mt: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
        }}
      >
        <Typography variant="h2" component="h1" gutterBottom>
          Welcome to Safety Emergency App
        </Typography>
        <Typography variant="h5" color="textSecondary" paragraph>
          Your personal safety companion that helps you stay connected and protected
          24/7.
        </Typography>
        <Box sx={{ mt: 4 }}>
          {!currentUser ? (
            <Box>
              <Button
                variant="contained"
                color="primary"
                size="large"
                component={RouterLink}
                to="/register"
                sx={{ mr: 2 }}
              >
                Get Started
              </Button>
              <Button
                variant="outlined"
                color="primary"
                size="large"
                component={RouterLink}
                to="/login"
              >
                Sign In
              </Button>
            </Box>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="large"
              component={RouterLink}
              to="/dashboard"
            >
              Go to Dashboard
            </Button>
          )}
        </Box>
      </Box>
    </Container>
  );
};

export default Home;
