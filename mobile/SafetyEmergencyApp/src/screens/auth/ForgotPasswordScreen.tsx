import React, { useState } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '../../services/auth';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [error, setError] = useState('');
  const [resetToken, setResetToken] = useState('');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    return password.length >= 8;
  };

  const handleRequestReset = async () => {
    setError('');
    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      await authService.requestPasswordReset(email);
      setStep('code');
      Alert.alert(
        'Reset Code Sent',
        'Please check your email for the password reset code'
      );
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    setError('');
    if (!code) {
      setError('Please enter the reset code');
      return;
    }

    setLoading(true);
    try {
      const token = await authService.verifyResetCode(email, code);
      setResetToken(token);
      setStep('password');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setError('');
    if (!validatePassword(newPassword)) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authService.resetPassword(resetToken, newPassword);
      Alert.alert(
        'Password Reset Successful',
        'Your password has been reset. Please login with your new password.',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <View style={styles.form}>
      <TextInput
        label="Email"
        value={email}
        onChangeText={(text) => {
          setEmail(text);
          setError('');
        }}
        mode="outlined"
        keyboardType="email-address"
        autoCapitalize="none"
        error={!!error}
        style={styles.input}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleRequestReset}
        loading={loading}
        disabled={loading || !email}
        style={styles.button}
      >
        Send Reset Code
      </Button>
    </View>
  );

  const renderCodeStep = () => (
    <View style={styles.form}>
      <TextInput
        label="Reset Code"
        value={code}
        onChangeText={(text) => {
          setCode(text);
          setError('');
        }}
        mode="outlined"
        keyboardType="number-pad"
        error={!!error}
        style={styles.input}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleVerifyCode}
        loading={loading}
        disabled={loading || !code}
        style={styles.button}
      >
        Verify Code
      </Button>
    </View>
  );

  const renderPasswordStep = () => (
    <View style={styles.form}>
      <TextInput
        label="New Password"
        value={newPassword}
        onChangeText={(text) => {
          setNewPassword(text);
          setError('');
        }}
        mode="outlined"
        secureTextEntry
        error={!!error}
        style={styles.input}
      />
      <TextInput
        label="Confirm Password"
        value={confirmPassword}
        onChangeText={(text) => {
          setConfirmPassword(text);
          setError('');
        }}
        mode="outlined"
        secureTextEntry
        error={!!error}
        style={styles.input}
      />
      <HelperText type="error" visible={!!error}>
        {error}
      </HelperText>

      <Button
        mode="contained"
        onPress={handleResetPassword}
        loading={loading}
        disabled={loading || !newPassword || !confirmPassword}
        style={styles.button}
      >
        Reset Password
      </Button>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text variant="headlineMedium" style={styles.title}>
            Reset Password
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            {step === 'email' && 'Enter your email to receive a reset code'}
            {step === 'code' && 'Enter the reset code sent to your email'}
            {step === 'password' && 'Enter your new password'}
          </Text>
        </View>

        {step === 'email' && renderEmailStep()}
        {step === 'code' && renderCodeStep()}
        {step === 'password' && renderPasswordStep()}

        <Button
          mode="text"
          onPress={() => navigation.navigate('Login')}
          style={styles.button}
        >
          Back to Login
        </Button>
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
  },
  button: {
    marginTop: 16,
  },
});

export default ForgotPasswordScreen;
