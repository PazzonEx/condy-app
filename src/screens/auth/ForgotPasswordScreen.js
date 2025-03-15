// src/screens/auth/ForgotPasswordScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Animated,
  Dimensions
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  useTheme, 
  IconButton,
  Snackbar
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Utilidades
import { isValidEmail } from '../../utils/validation';

// Constantes
const { width, height } = Dimensions.get('window');

const ForgotPasswordScreen = ({ navigation }) => {
  const theme = useTheme();
  const { resetPassword } = useAuth();
  
  // Estados
  const [email, setEmail] = useState('');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState(null);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const successAnim = useRef();
  
  // Efeito para animar entrada
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Reproduzir animação de sucesso
  useEffect(() => {
    if (emailSent && successAnim.current) {
      successAnim.current.play();
    }
  }, [emailSent]);
  
  // Validar email
  const validateEmail = () => {
    if (!email.trim()) {
      setError('Informe seu email');
      setShowError(true);
      return false;
    }
    
    if (!isValidEmail(email)) {
      setError('Email inválido');
      setShowError(true);
      return false;
    }
    
    return true;
  };
  
// Enviar email de recuperação
const handleResetPassword = async () => {
  if (!validateEmail()) return;
  
  setLoading(true);
  setShowError(false);
  
  try {
    await resetPassword(email);
    setEmailSent(true);
    
    // Registrar atividade de recuperação de senha (opcional)
    try {
      await analytics.logEvent('password_reset_requested', {
        email_domain: email.split('@')[1]
      });
    } catch (analyticsError) {
      console.log('Erro ao registrar analytics:', analyticsError);
    }
  } catch (error) {
    let errorMsg = 'Erro ao enviar email de recuperação';
    
    if (error.code === 'auth/user-not-found') {
      errorMsg = 'Não há registro de usuário com este email';
    } else if (error.code === 'auth/too-many-requests') {
      errorMsg = 'Muitas tentativas. Tente novamente mais tarde.';
    } else if (error.code === 'auth/invalid-email') {
      errorMsg = 'Email inválido';
    }
    
    setError(errorMsg);
    setShowError(true);
  } finally {
    setLoading(false);
  }
};
  
  // Voltar para tela de login
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Tentar novamente
  const handleTryAgain = () => {
    setEmailSent(false);
    setEmail('');
  };
  
  // Renderizar formulário de recuperação
  const renderResetForm = () => (
    <Animated.View 
      style={[
        styles.formContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Surface style={styles.formSurface}>
        <Text style={styles.title}>Recuperar Senha</Text>
        <Text style={styles.subtitle}>
          Informe seu email para receber instruções de recuperação de senha
        </Text>
        
        <View style={styles.inputContainer}>
          <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="send"
            onSubmitEditing={handleResetPassword}
            style={styles.input}
            mode="outlined"
            outlineColor="#E0E0E0"
            activeOutlineColor={theme.colors.primary}
            error={showError && (!email.trim() || !isValidEmail(email))}
          />
        </View>
        
        <Button
          mode="contained"
          onPress={handleResetPassword}
          loading={loading}
          disabled={loading}
          style={styles.resetButton}
          labelStyle={styles.resetButtonLabel}
          contentStyle={styles.resetButtonContent}
        >
          Enviar Instruções
        </Button>
        
        <TouchableOpacity 
          onPress={handleGoBack}
          style={styles.backLink}
        >
          <Text style={[styles.backLinkText, { color: theme.colors.primary }]}>
            Voltar para Login
          </Text>
        </TouchableOpacity>
      </Surface>
    </Animated.View>
  );
  
  // Renderizar mensagem de sucesso
  const renderSuccessMessage = () => (
    <Animated.View 
      style={[
        styles.successContainer,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <Surface style={styles.successSurface}>
        <View style={styles.animationContainer}>
          <LottieView
            ref={successAnim}
            source={require('../../assets/animations/email-sent.json')}
            style={styles.successAnimation}
            autoPlay={false}
            loop={false}
          />
        </View>
        
        <Text style={styles.successTitle}>Email Enviado!</Text>
        <Text style={styles.successText}>
          Enviamos as instruções de recuperação de senha para:
        </Text>
        <Text style={styles.successEmail}>{email}</Text>
        <Text style={styles.instructionText}>
          Verifique sua caixa de entrada e siga as instruções para redefinir sua senha.
          Se não encontrar o email, verifique também sua pasta de spam.
        </Text>
        
        <Button
          mode="contained"
          onPress={handleGoBack}
          style={styles.loginButton}
          labelStyle={styles.loginButtonLabel}
        >
          Voltar para Login
        </Button>
        
        <TouchableOpacity 
          onPress={handleTryAgain}
          style={styles.tryAgainLink}
        >
          <Text style={[styles.tryAgainText, { color: theme.colors.primary }]}>
            Tentar com outro email
          </Text>
        </TouchableOpacity>
      </Surface>
    </Animated.View>
  );
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={styles.container}
    >
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          size={24}
          onPress={handleGoBack}
          style={styles.backButton}
        />
      </View>
      
      {emailSent ? renderSuccessMessage() : renderResetForm()}
      
      {/* Snackbar para Erros */}
      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
        style={styles.errorSnackbar}
      >
        {errorMessage}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    margin: 0,
  },
  formContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  formSurface: {
    padding: 24,
    borderRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  resetButton: {
    borderRadius: 8,
    marginBottom: 16,
  },
  resetButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  resetButtonContent: {
    height: 48,
  },
  backLink: {
    alignSelf: 'center',
  },
  backLinkText: {
    fontSize: 16,
    fontWeight: '500',
  },
  successContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  successSurface: {
    padding: 24,
    borderRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  animationContainer: {
    width: 150,
    height: 150,
    marginVertical: 16,
  },
  successAnimation: {
    width: '100%',
    height: '100%',
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#4CAF50',
  },
  successText: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 8,
    textAlign: 'center',
  },
  successEmail: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
    textAlign: 'center',
  },
  instructionText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  loginButton: {
    borderRadius: 8,
    width: '100%',
    marginBottom: 16,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  tryAgainLink: {
    alignSelf: 'center',
  },
  tryAgainText: {
    fontSize: 16,
    fontWeight: '500',
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
});

export default ForgotPasswordScreen;