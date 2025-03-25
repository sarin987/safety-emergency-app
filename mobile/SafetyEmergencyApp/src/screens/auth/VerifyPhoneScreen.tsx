import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../../services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  VerifyPhone: { phone: string; userId: string };
  MainApp: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyPhone'>;

const VerifyPhoneScreen = ({ route, navigation }: Props) => {
  const { phone, userId } = route.params;
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const validateCode = () => {
    setError('');
    if (!code) {
      setError('Please enter the verification code');
      return false;
    }
    if (code.length !== 6) {
      setError('Verification code must be 6 digits');
      return false;
    }
    if (!/^\d+$/.test(code)) {
      setError('Verification code must contain only numbers');
      return false;
    }
    return true;
  };

  const handleVerify = async () => {
    if (!validateCode()) return;

    setLoading(true);
    try {
      const verified = await authService.verifyPhone(phone, code);
      if (verified) {
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainApp' }],
        });
      } else {
        setError('Invalid verification code');
      }
    } catch (error: any) {
      Alert.alert(
        'Verification Failed',
        error.message || 'Failed to verify phone number'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0) return;

    try {
      // Implement resend code logic here
      setTimer(60);
      Alert.alert(
        'Code Sent',
        'A new verification code has been sent to your phone number'
      );
    } catch (error: any) {
      Alert.alert(
        'Failed to Resend',
        error.message || 'Failed to resend verification code'
      );
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Verify Phone
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Enter the verification code sent to {phone}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Verification Code"
            value={code}
            onChangeText={(text) => {
              setCode(text);
              setError('');
            }}
            mode="outlined"
            keyboardType="number-pad"
            maxLength={6}
            error={!!error}
            style={styles.input}
          />
          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>

          <Button
            mode="contained"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || !code}
            style={styles.button}
          >
            Verify
          </Button>

          <Button
            mode="outlined"
            onPress={handleResendCode}
            disabled={timer > 0}
            style={styles.button}
          >
            {timer > 0
              ? `Resend code in ${formatTime(timer)}`
              : 'Resend verification code'}
          </Button>

          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.button}
          >
            Back to Login
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  title: {
    marginBottom: 8,
    color: '#1e88e5',
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginHorizontal: 32,
  },
  form: {
    marginTop: 16,
  },
  input: {
    marginBottom: 4,
    letterSpacing: 8,
    fontSize: 20,
  },
  button: {
    marginTop: 16,
  },
});

export default VerifyPhoneScreen;
