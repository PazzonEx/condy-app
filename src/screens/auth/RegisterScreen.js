// src/screens/auth/RegisterScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Animated,
  Dimensions
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
import { ProgressBar } from 'react-native-paper';
// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Utilidades
import { isValidEmail, validatePassword } from '../../utils/validation';

// Constantes
const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const { register } = useAuth();
  
  // Obter o tipo de usuário da navegação
  const userType = route.params.userType ;
  
  // Estados
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showError, setShowError] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [step, setStep] = useState(1);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Refs para navegação entre inputs
  const emailInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const confirmPasswordInputRef = useRef(null);
  
  // Animações
  const progressValue = useRef(new Animated.Value(1)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslateY = useRef(new Animated.Value(50)).current;
  
  // Efeito para monitorar teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );
    
    // Animar entrada do formulário
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
  
  // Efeito para verificar a força da senha
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    
    // Verificar tamanho
    if (password.length >= 8) strength += 0.25;
    
    // Verificar presença de números
    if (/\d/.test(password)) strength += 0.25;
    
    // Verificar presença de caracteres especiais
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength += 0.25;
    
    // Verificar presença de letras maiúsculas e minúsculas
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 0.25;
    
    setPasswordStrength(strength);
  }, [password]);
  
  // Efeito para animar o progresso do cadastro
  const [progress, setProgress] = useState(0.33);

// No useEffect para atualizar o progresso
useEffect(() => {
  const progressPercentage = step === 1 ? 0.33 : step === 2 ? 0.66 : 1;
  setProgress(progressPercentage);
  
  // Animar apenas para visual
  Animated.timing(progressValue, {
    toValue: progressPercentage,
    duration: 300,
    useNativeDriver: false,
  }).start();
}, [step]);

  
  // Obter a cor da barra de progresso de senha
  const getPasswordStrengthColor = () => {
    if (passwordStrength < 0.3) return '#F44336'; // Fraca
    if (passwordStrength < 0.6) return '#FFC107'; // Média
    return '#4CAF50'; // Forte
  };
  
  // Validar nome
  const validateName = () => {
    if (!name.trim()) {
      setErrorMessage('Informe seu nome completo');
      setShowError(true);
      return false;
    }
    
    if (name.trim().length < 3) {
      setErrorMessage('Nome muito curto');
      setShowError(true);
      return false;
    }
    
    return true;
  };
  
  // Validar email
  const validateEmail = () => {
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
    
    return true;
  };
  
  // Validar senha
  const validateUserPassword = () => {
    if (!password) {
      setErrorMessage('Informe uma senha');
      setShowError(true);
      return false;
    }
    
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setErrorMessage(passwordValidation.errors[0]);
      setShowError(true);
      return false;
    }
    
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      setShowError(true);
      return false;
    }
    
    return true;
  };
  
  // Avançar para o próximo passo
  const nextStep = () => {
    if (step === 1) {
      if (validateName() && validateEmail()) {
        setStep(2);
        setTimeout(() => passwordInputRef.current?.focus(), 100);
      }
    } else {
      handleRegister();
    }
  };
  
  // Voltar para o passo anterior
  const prevStep = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  };
  
  // Realizar o cadastro
  const handleRegister = async () => {
    if (!validateUserPassword()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    setShowError(false);
    
    try {
      console.log("Tentando registrar usuário do tipo:", userType)
      await register(email, password, name, userType);
      // A navegação é gerenciada pelo hook useAuth
      console.log("Registro bem-sucedido, usuário:", user.uid);
    } catch (error) {
      let errorMsg = 'Falha ao criar conta. Tente novamente.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = 'Este email já está sendo usado por outra conta';
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Senha muito fraca. Use uma senha mais forte.';
      }
      
      setErrorMessage(errorMsg);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };
  
  // Renderizar o formulário do passo 1 (nome e email)
  const renderStep1 = () => (
    <>
      {/* Campo de Nome */}
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
        <TextInput
          label="Nome completo"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailInputRef.current?.focus()}
          style={styles.input}
          mode="outlined"
          outlineColor="#E0E0E0"
          activeOutlineColor={theme.colors.primary}
          error={showError && !name.trim()}
        />
      </View>
      
      {/* Campo de Email */}
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
        <TextInput
          ref={emailInputRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={nextStep}
          style={styles.input}
          mode="outlined"
          outlineColor="#E0E0E0"
          activeOutlineColor={theme.colors.primary}
          error={showError && (!email.trim() || !isValidEmail(email))}
        />
      </View>
    </>
  );
  
  // Renderizar o formulário do passo 2 (senha)
  const renderStep2 = () => (
    <>
      {/* Campo de Senha */}
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="lock-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
        <TextInput
          ref={passwordInputRef}
          label="Senha"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
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
      
      {/* Indicador de Força da Senha */}
      <View style={styles.passwordStrengthContainer}>
        <ProgressBar 
          progress={passwordStrength} 
          color={getPasswordStrengthColor()} 
          style={styles.passwordStrengthBar}
        />
        <Text style={[styles.passwordStrengthText, { color: getPasswordStrengthColor() }]}>
          {passwordStrength === 0 ? '' : 
            passwordStrength < 0.3 ? 'Senha fraca' : 
            passwordStrength < 0.6 ? 'Senha média' : 'Senha forte'}
        </Text>
      </View>
      
      {/* Campo de Confirmar Senha */}
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="lock-check-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
        <TextInput
          ref={confirmPasswordInputRef}
          label="Confirmar senha"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirmPassword}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          style={styles.input}
          mode="outlined"
          outlineColor="#E0E0E0"
          activeOutlineColor={theme.colors.primary}
          error={showError && password !== confirmPassword}
          right={
            <TextInput.Icon 
              icon={showConfirmPassword ? "eye-off" : "eye"} 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              color="#757575"
            />
          }
        />
      </View>
      
      {/* Dicas para Senha Forte */}
      <View style={styles.passwordTipsContainer}>
        <Text style={styles.passwordTipsTitle}>Dicas para uma senha forte:</Text>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={password.length >= 8 ? "check-circle" : "information"} 
            size={16} 
            color={password.length >= 8 ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Pelo menos 8 caracteres</Text>
        </View>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={/\d/.test(password) ? "check-circle" : "information"} 
            size={16}
            color={/\d/.test(password) ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Inclua números</Text>
        </View>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "check-circle" : "information"} 
            size={16}
            color={/[!@#$%^&*(),.?":{}|<>]/.test(password) ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Inclua caracteres especiais (!@#$)</Text>
        </View>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "check-circle" : "information"} 
            size={16}
            color={/[a-z]/.test(password) && /[A-Z]/.test(password) ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Letras maiúsculas e minúsculas</Text>
        </View>
      </View>
    </>
  );
  
  // Renderizar botões de navegação
  const renderButtons = () => (
    <View style={styles.buttonsContainer}>
      <Button
        mode="outlined"
        onPress={prevStep}
        style={styles.backButton}
        labelStyle={styles.backButtonLabel}
        contentStyle={styles.backButtonContent}
        disabled={loading}
      >
        Voltar
      </Button>
      
      <Button
        mode="contained"
        onPress={nextStep}
        loading={loading}
        disabled={loading}
        style={styles.nextButton}
        labelStyle={styles.nextButtonLabel}
        contentStyle={styles.nextButtonContent}
      >
        {step === 1 ? 'Próximo' : 'Cadastrar'}
      </Button>
    </View>
  );
  
  // Obter o título do formulário com base no tipo de usuário
  const getFormTitle = () => {
    switch (userType) {
      case 'driver':
        return 'Cadastro de Motorista';
      case 'condo':
        return 'Cadastro de Condomínio';
      default:
        return 'Cadastro de Morador';
    }
  };
  
  // Renderizar ícone do tipo de usuário
  const renderUserTypeIcon = () => {
    let iconName = 'account';
    let iconColor = theme.colors.primary;
    
    switch (userType) {
      case 'driver':
        iconName = 'car';
        iconColor = '#FF9800';
        break;
      case 'condo':
        iconName = 'office-building';
        iconColor = '#4CAF50';
        break;
      default:
        iconName = 'home-account';
        iconColor = '#2196F3';
    }
    
    return (
      <View style={[styles.userTypeIconContainer, { backgroundColor: iconColor + '20' }]}>
        <MaterialCommunityIcons name={iconName} size={32} color={iconColor} />
      </View>
    );
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
        {/* Cabeçalho */}
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={prevStep}
            style={styles.backIcon}
          />
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={progress}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <View style={styles.stepsTextContainer}>
              <Text style={styles.stepText}>
                Passo {step} de 2
              </Text>
              <Text style={styles.stepsCount}>
                {step === 1 ? 'Informações básicas' : 'Criando sua senha'}
              </Text>
            </View>
          </View>
        </View>
        
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
            <View style={styles.formTitleContainer}>
              {renderUserTypeIcon()}
              <Text style={styles.formTitle}>{getFormTitle()}</Text>
            </View>
            
            {step === 1 ? renderStep1() : renderStep2()}
            
            {renderButtons()}
          </Surface>
          
          {/* Link para Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Já tem uma conta?</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginLink, { color: theme.colors.primary }]}>
                Entrar
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  backIcon: {
    marginRight: 16,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    marginBottom: 8,
  },
  stepsTextContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  stepsCount: {
    fontSize: 14,
    color: '#757575',
  },
  formContainer: {
    paddingHorizontal: 24,
  },
  formSurface: {
    padding: 24,
    borderRadius: 12,
    elevation: 4,
  },
  formTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  userTypeIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
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
  passwordStrengthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 36,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  passwordStrengthText: {
    marginLeft: 8,
    fontSize: 12,
    fontWeight: '500',
  },
  passwordTipsContainer: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
    marginLeft: 36,
  },
  passwordTipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  passwordTipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  passwordTipText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 8,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  backButton: {
    flex: 0.48,
    borderRadius: 8,
  },
  backButtonLabel: {
    fontSize: 16,
  },
  backButtonContent: {
    height: 48,
  },
  nextButton: {
    flex: 0.48,
    borderRadius: 8,
  },
  nextButtonLabel: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  nextButtonContent: {
    height: 48,
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  loginText: {
    color: '#757575',
    marginRight: 4,
  },
  loginLink: {
    fontWeight: 'bold',
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  },
});

export default RegisterScreen;