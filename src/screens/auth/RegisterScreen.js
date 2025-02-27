import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

const RegisterScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const { register, error } = useAuth();
  
  // Pegar tipo de usuário da rota
  const { userType = 'resident' } = route.params || {};
  
  // Estados para formulário de registro
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Texto do cabeçalho com base no tipo de usuário
  const getUserTypeTitle = () => {
    switch (userType) {
      case 'resident':
        return 'Cadastro de Morador';
      case 'driver':
        return 'Cadastro de Motorista';
      case 'condo':
        return 'Cadastro de Condomínio';
      default:
        return 'Cadastro';
    }
  };

  // Validar o formulário
  const validateForm = () => {
    const errors = {};

    if (!name.trim()) {
      errors.name = 'Nome é obrigatório';
    }

    if (!email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = 'Email inválido';
    }

    if (!password) {
      errors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manipulador para o processo de registro
  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name, userType);
      // O redirecionamento será tratado pelo navegador de autenticação
    } catch (error) {
      console.error('Erro no registro:', error);
      setFormErrors(prev => ({ 
        ...prev, 
        general: 'Falha no registro. Por favor, tente novamente.' 
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>{getUserTypeTitle()}</Text>
          <Text style={styles.subtitle}>
            Preencha os dados para criar sua conta
          </Text>
        </View>

        {/* Formulário de registro */}
        <Card style={styles.card}>
          {formErrors.general ? (
            <Text style={styles.errorText}>{formErrors.general}</Text>
          ) : null}

          <Input
            label="Nome completo"
            value={name}
            onChangeText={setName}
            error={formErrors.name}
          />

          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            error={formErrors.password}
            secureTextEntry
          />

          <Input
            label="Confirmar senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={formErrors.confirmPassword}
            secureTextEntry
          />

          <Button
            mode="contained"
            onPress={handleRegister}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Cadastrar
          </Button>
        </Card>

        {/* Rodapé para navegação para o login */}
        <View style={styles.footer}>
          <Text>Já tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              Entrar
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
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#f13a59',
    textAlign: 'center',
    marginBottom: 10,
  },
});

export default RegisterScreen;