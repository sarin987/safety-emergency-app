import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authAPI } from '../../services/api';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Login: undefined;
  VerifyPhone: { phone: string };
  MainApp: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyPhone'>;

const VerifyPhoneScreen = ({ route, navigation }: Props) => {
  const { phone } = route.params;
  const [code, setCode] = useState('');
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleVerify = async () => {
    if (code.length !== 6) {
      alert('Please enter a valid verification code');
      return;
    }

    setLoading(true);
    try {
      await authAPI.verifyPhone(phone, code);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainApp' }],
      });
    } catch (error) {
      console.error(error);
      alert('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    if (timer > 0) return;

    try {
      // TODO: Implement resend code logic
      setTimer(60);
    } catch (error) {
      console.error(error);
      alert('Failed to resend code. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Verify Phone</Text>
          <Text style={styles.subtitle}>
            Enter the verification code sent to {phone}
          </Text>
        </View>

        <View style={styles.form}>
          <TextInput
            label="Verification Code"
            value={code}
            onChangeText={setCode}
            mode="outlined"
            keyboardType="number-pad"
            maxLength={6}
            style={styles.input}
          />

          <Button
            mode="contained"
            onPress={handleVerify}
            loading={loading}
            disabled={loading || code.length !== 6}
            style={styles.button}
          >
            Verify
          </Button>

          <Button
            mode="text"
            onPress={handleResendCode}
            disabled={timer > 0}
            style={styles.button}
          >
            {timer > 0
              ? `Resend code in ${timer}s`
              : 'Resend code'}
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
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginVertical: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#fff',
  },
  button: {
    marginTop: 8,
  },
});

export default VerifyPhoneScreen;
