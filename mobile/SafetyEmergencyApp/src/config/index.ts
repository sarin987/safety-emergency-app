const ENV = {
  dev: {
    API_URL: 'http://localhost:5000/api',
    SOCKET_URL: 'http://localhost:5000',
  },
  prod: {
    API_URL: 'https://api.safetyemergencyapp.com/api',
    SOCKET_URL: 'https://api.safetyemergencyapp.com',
  },
};

const getEnvVars = () => {
  if (__DEV__) return ENV.dev;
  return ENV.prod;
};

export const config = getEnvVars();
