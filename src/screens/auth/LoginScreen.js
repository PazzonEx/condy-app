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
  Dimensions,
  Alert
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  useTheme, 
  Snackbar,
  IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logo from '../../assets/images/condy-logo-final.svg';

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
  const [rememberMe, setRememberMe] = useState(false);
  
  // Animações
  const logoScale = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;

  // Refs
  const passwordInputRef = useRef(null);
  
  // Verificar se há email salvo
  useEffect(() => {
    const checkSavedEmail = async () => {
      try {
        const savedEmail = await AsyncStorage.getItem('@auth_email');
        if (savedEmail) {
          setEmail(savedEmail);
          setRememberMe(true);
        }
      } catch (error) {
        console.error('Erro ao recuperar email salvo:', error);
      }
    };
    
    checkSavedEmail();
  }, []);
  
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
    // Limpar erros anteriores
    setErrorMessage('');
    setShowError(false);
    
    // Verificar email
    if (!email.trim()) {
      setErrorMessage('Informe seu email');
      setShowError(true);
      return false;
    }
    
    // Para o email do admin, pule a validação de formato
    if (email !== 'admin@condy.com' && !isValidEmail(email)) {
      setErrorMessage('Email inválido');
      setShowError(true);
      return false;
    }
    
    // Verificar senha
    if (!password) {
      setErrorMessage('Informe sua senha');
      setShowError(true);
      return false;
    }
    
    return true;
  };
  
  // Função de login
  const handleLogin = async () => {
    console.log("Tentando fazer login...");
    
    if (!validateForm) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setShowError(false);
    
    try {
      console.log("Email:", email, "Password:", "****");
      
      // Salvar email se "lembrar-me" estiver ativado
      if (rememberMe) {
        await AsyncStorage.setItem('@auth_email', email);
      } else {
        await AsyncStorage.removeItem('@auth_email');
      }
      
      await login(email, password);
      console.log("Login bem-sucedido!");
      // A navegação é gerenciada pelo hook useAuth
    } catch (error) {
      console.error("Erro de login:", error.code, error.message);
      
      let errorMsg = 'Falha ao fazer login. Tente novamente.';
      
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMsg = 'Email ou senha incorretos';
      } else if (error.code === 'auth/too-many-requests') {
        errorMsg = 'Muitas tentativas. Tente novamente mais tarde.';
      } else if (error.code === 'auth/network-request-failed') {
        errorMsg = 'Erro de conexão. Verifique sua internet.';
      }
      
      setErrorMessage(errorMsg);
      setShowError(true);
      
      // Mostrar alerta para erros críticos
      if (error.code === 'auth/network-request-failed') {
        Alert.alert(
          "Erro de Conexão",
          "Não foi possível conectar ao servidor. Verifique sua conexão com a internet e tente novamente.",
          [{ text: "OK" }]
        );
      }
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
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
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
                error={showError && (!email.trim() || (!isValidEmail(email) && email !== 'admin@condy.com'))}
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
            
            {/* Opção Lembrar-me */}
            <View style={styles.rememberContainer}>
              <TouchableOpacity 
                style={styles.rememberMe}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <MaterialCommunityIcons 
                  name={rememberMe ? "checkbox-marked" : "checkbox-blank-outline"} 
                  size={20} 
                  color={rememberMe ? theme.colors.primary : "#757575"} 
                />
                <Text style={styles.rememberText}>Lembrar-me</Text>
              </TouchableOpacity>
              
              {/* Link Esqueci a Senha */}
              <TouchableOpacity 
                onPress={handleForgotPassword}
                style={styles.forgotPasswordLink}
              >
                <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                  Esqueci minha senha
                </Text>
              </TouchableOpacity>
            </View>
            
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
        action={{
          label: 'OK',
          onPress: () => setShowError(false),
        }}
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
  rememberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  rememberMe: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rememberText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  forgotPasswordLink: {
    alignSelf: 'flex-end',
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