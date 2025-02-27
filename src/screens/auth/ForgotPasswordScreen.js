import React, { useState } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

const ForgotPasswordScreen = ({ navigation }) => {
  const theme = useTheme();
  const { resetPassword } = useAuth();
  
  // Estados
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  // Validar o formulário
  const validateForm = () => {
    const errors = {};

    if (!email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email inválido';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manipulador para o processo de redefinição de senha
  const handleResetPassword = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSuccessMessage('');
    setFormErrors({});

    try {
      await resetPassword(email);
      setSuccessMessage(
        'Um link para redefinição de senha foi enviado para o seu email.'
      );
      setEmail('');
    } catch (error) {
      console.error('Erro ao enviar email de redefinição:', error);
      setFormErrors({
        general: 'Falha ao enviar email. Verifique se o endereço está correto.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>Recuperar Senha</Text>
          <Text style={styles.subtitle}>
            Informe seu email para receber instruções de recuperação de senha
          </Text>
        </View>

        {/* Formulário de recuperação de senha */}
        <Card style={styles.card}>
          {formErrors.general ? (
            <Text style={styles.errorText}>{formErrors.general}</Text>
          ) : null}

          {successMessage ? (
            <Text style={styles.successText}>{successMessage}</Text>
          ) : null}

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Button
            mode="contained"
            onPress={handleResetPassword}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Enviar instruções
          </Button>
        </Card>

        {/* Rodapé para navegação para o login */}
        <View style={styles.footer}>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              Voltar para o login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    padding: 10,
  },
  button: {
    marginTop: 10,
  },
  footer: {
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#f13a59',
    textAlign: 'center',
    marginBottom: 10,
  },
  successText: {
    color: '#4CAF50',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
