// src/screens/auth/LoginScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  ScrollView, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Animated,
  Dimensions
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  useTheme, 
  Snackbar
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import Logo from'../../assets/images/condy-logo-final.svg'
// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Utilidades
import { isValidEmail } from '../../utils/validation';

// Constantes
const { width, height } = Dimensions.get('window');

const LoginScreen = ({ navigation }) => {
  const theme = useTheme();
  const { login } = useAuth();
  
  // Estados
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Animações
  const logoScale = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  // Refs
  const passwordInputRef = useRef(null);
  
  // Efeito para monitorar teclado e animar componentes
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        Animated.parallel([
          Animated.timing(logoScale, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      }
    );

    // Animar aparecimento do formulário
    Animated.parallel([
      Animated.timing(formOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(formTranslateY, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Validar formulário
  const validateForm = () => {
    if (!email.trim()) {
      setErrorMessage('Informe seu email');
      setShowError(true);
      return false;
    }
    
    if (!isValidEmail(email)) {
      setErrorMessage('Email inválido');
      setShowError(true);
      return false;
    }
    
    if (!password) {
      setErrorMessage('Informe sua senha');
      setShowError(true);
      return false;
    }
    
    return true;
  };
  
  // Fazer login
  const handleLogin = async () => {
    if (!validateForm()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setShowError(false);
    
    try {
      await login(email, password);
      // Navegação é gerenciada pelo hook useAuth através do sistema de navegação baseado no tipo de usuário
    } catch (error) {
      let errorMsg = 'Falha ao fazer login. Tente novamente.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'Email ou senha incorretos';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas. Tente novamente mais tarde.';
      }
      
      setErrorMessage(errorMsg);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Recuperar senha
  const handleForgotPassword = () => {
    navigation.navigate('ForgotPassword');
  };
  
  // Ir para tela de cadastro
  const handleRegister = () => {
    navigation.navigate('UserType');
  };
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={styles.container}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo e Cabeçalho */}
        <Animated.View 
          style={[
            styles.logoContainer,
            { transform: [{ scale: logoScale }] }
          ]}
        >
          <Logo style={styles.logo} resizeMode="contain" />
          <Text style={styles.appName}>Condy</Text>
          <Text style={styles.appTagline}>Acesso inteligente para condomínios</Text>
        </Animated.View>
        
        {/* Formulário */}
        <Animated.View 
          style={[
            styles.formContainer,
            { 
              opacity: formOpacity,
              transform: [{ translateY: formTranslateY }]
            }
          ]}
        >
          <Surface style={styles.formSurface}>
            <Text style={styles.formTitle}>Entrar</Text>

            {/* Campo de Email */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
              <TextInput
                label="Email"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                style={styles.input}
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor={theme.colors.primary}
                error={showError && (!email.trim() || !isValidEmail(email))}
              />
            </View>
            
            {/* Campo de Senha */}
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="lock-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
              <TextInput
                ref={passwordInputRef}
                label="Senha"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                style={styles.input}
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor={theme.colors.primary}
                error={showError && !password}
                right={
                  <TextInput.Icon 
                    icon={showPassword ? "eye-off" : "eye"} 
                    onPress={() => setShowPassword(!showPassword)}
                    color="#757575"
                  />
                }
              />
            </View>
            
            {/* Link Esqueci a Senha */}
            <TouchableOpacity 
              onPress={handleForgotPassword}
              style={styles.forgotPasswordLink}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                Esqueci minha senha
              </Text>
            </TouchableOpacity>
            
            {/* Botão de Login */}
            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.loginButton}
              labelStyle={styles.loginButtonLabel}
              contentStyle={styles.loginButtonContent}
            >
              Entrar
            </Button>
            
            {/* Separador */}
            <View style={styles.separator}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>ou</Text>
              <View style={styles.separatorLine} />
            </View>
            
            {/* Botões de Login Social */}
            <View style={styles.socialButtonsContainer}>
              <TouchableOpacity style={[styles.socialButton, styles.googleButton]}>
                <MaterialCommunityIcons name="google" size={24} color="#DB4437" />
                <Text style={styles.socialButtonText}>Google</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.socialButton, styles.facebookButton]}>
                <MaterialCommunityIcons name="facebook" size={24} color="#4267B2" />
                <Text style={styles.socialButtonText}>Facebook</Text>
              </TouchableOpacity>
            </View>
          </Surface>
          
          {/* Link para Cadastro */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Ainda não tem uma conta?</Text>
            <TouchableOpacity onPress={handleRegister}>
              <Text style={[styles.registerLink, { color: theme.colors.primary }]}>
                Cadastre-se
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
      
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
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
    
  },
  logoContainer: {
    alignItems: 'center',
    paddingTop: height * 0.08,
    paddingBottom: height * 0.03,
  },
  logo: {
    width: 200,
    height: 100,
    marginBottom: 1,
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2196F3',
    marginBottom: 4,
  },
  appTagline: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  formSurface: {
    padding: 24,
    borderRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loginButton: {
    borderRadius: 8,
    marginBottom: 20,
  },
  loginButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    paddingVertical: 4,
  },
  loginButtonContent: {
    height: 48,
  },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  separatorText: {
    paddingHorizontal: 16,
    color: '#757575',
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 0.48,
    borderWidth: 1,
  },
  googleButton: {
    borderColor: '#DB4437',
  },
  facebookButton: {
    borderColor: '#4267B2',
  },
  socialButtonText: {
    marginLeft: 8,
    fontWeight: '500',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  registerText: {
    color: '#757575',
    marginRight: 4,
  },
  registerLink: {
    fontWeight: 'bold',
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
});

export default LoginScreen;