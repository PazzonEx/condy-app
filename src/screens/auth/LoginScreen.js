import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const { login, error } = useAuth();
  
  // Estados para formulário de login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  // Validar o formulário
  const validateForm = () => {
    const errors = {};

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

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manipulador para o processo de login
  const handleLogin = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      await login(email, password);
      // O redirecionamento será tratado pelo navegador de autenticação
    } catch (error) {
      console.error('Erro no login:', error);
      setFormErrors(prev => ({ 
        ...prev, 
        general: 'Falha no login. Por favor, verifique suas credenciais.' 
      }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Logo e cabeçalho */}
        <View style={styles.header}>
          {/* Substitua pelo caminho real do seu logo */}
          <Image 
            source={require('../../assets/logo-placeholder.png')} 
            style={styles.logo} 
            resizeMode="contain"
          />
          <Text style={styles.title}>Condy</Text>
          <Text style={styles.subtitle}>Controle de acesso para condomínios</Text>
        </View>

        {/* Formulário de login */}
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.colors.primary }]}>
            Entrar
          </Text>

          {formErrors.general ? (
            <Text style={styles.errorText}>{formErrors.general}</Text>
          ) : null}

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

          <Button
            mode="contained"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.button}
          >
            Entrar
          </Button>

          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPassword}
          >
            <Text style={{ color: theme.colors.primary }}>Esqueci minha senha</Text>
          </TouchableOpacity>
        </Card>

        {/* Rodapé para navegação para o registro */}
        <View style={styles.footer}>
          <Text>Não tem uma conta? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('UserType')}>
            <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
              Cadastre-se
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
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
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
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
  },
  forgotPassword: {
    alignSelf: 'center',
    marginTop: 15,
    marginBottom: 5,
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

export default LoginScreen;