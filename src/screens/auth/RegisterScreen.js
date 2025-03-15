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
  Dimensions,
  StatusBar,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  BackHandler
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  useTheme, 
  Snackbar,
  ProgressBar,
  IconButton,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import { useNavigation, CommonActions } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Utilitários
import { isValidEmail, validatePassword } from '../../utils/validation';

// Constantes
const { width, height } = Dimensions.get('window');

const RegisterScreen = ({ route }) => {
  const theme = useTheme();
  const { register } = useAuth();
  const navigation = useNavigation();
  
  // Obter o tipo de usuário da navegação
  const userType = route.params?.userType;
  
  // Estados
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
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
  
  // Função para atualizar dados
  const updateRegisterData = (field, value) => {
    setRegisterData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro específico para este campo
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };
  
  // Efeito para lidar com o botão de voltar do hardware
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleCancel();
      return true; // Previne o comportamento padrão
    });
    
    return () => backHandler.remove();
  }, []);
  
  // Efeito para monitorar teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
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
    
    // Verificar se temos um tipo de usuário
    if (!userType) {
      // Tentar recuperar do AsyncStorage como backup
      const checkUserType = async () => {
        try {
          const storedType = await AsyncStorage.getItem('@user_type');
          if (!storedType) {
            // Se não houver tipo armazenado, voltar para a tela de seleção
            Alert.alert(
              "Tipo de usuário não definido",
              "Por favor, selecione o tipo de usuário primeiro.",
              [
                {
                  text: "OK",
                  onPress: () => navigation.navigate('UserType')
                }
              ]
            );
          }
        } catch (error) {
          console.error("Erro ao recuperar tipo de usuário:", error);
        }
      };
      
      checkUserType();
    }
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Efeito para verificar a força da senha
  useEffect(() => {
    if (!registerData.password) {
      setPasswordStrength(0);
      return;
    }
    
    let strength = 0;
    
    // Verificar tamanho
    if (registerData.password.length >= 8) strength += 0.25;
    
    // Verificar presença de números
    if (/\d/.test(registerData.password)) strength += 0.25;
    
    // Verificar presença de caracteres especiais
    if (/[!@#$%^&*(),.?":{}|<>]/.test(registerData.password)) strength += 0.25;
    
    // Verificar presença de letras maiúsculas e minúsculas
    if (/[a-z]/.test(registerData.password) && /[A-Z]/.test(registerData.password)) strength += 0.25;
    
    setPasswordStrength(strength);
  }, [registerData.password]);
  
  // Efeito para animar o progresso do cadastro
  useEffect(() => {
    const progressPercentage = step === 1 ? 0.33 : step === 2 ? 0.66 : 1;
    
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
  
  // Validar formulário completo
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    if (step === 1) {
      // Validar nome
      if (!registerData.name.trim()) {
        newErrors.name = 'Nome é obrigatório';
        isValid = false;
      } else if (registerData.name.trim().length < 3) {
        newErrors.name = 'Nome deve ter pelo menos 3 caracteres';
        isValid = false;
      }
      
      // Validar email
      if (!registerData.email.trim()) {
        newErrors.email = 'Email é obrigatório';
        isValid = false;
      } else if (!isValidEmail(registerData.email)) {
        newErrors.email = 'Email inválido';
        isValid = false;
      }
    } else if (step === 2) {
      // Validar senha
      if (!registerData.password) {
        newErrors.password = 'Senha é obrigatória';
        isValid = false;
      } else if (registerData.password.length < 6) {
        newErrors.password = 'Senha deve ter pelo menos 6 caracteres';
        isValid = false;
      }
      
      // Validar confirmação de senha
      if (registerData.password !== registerData.confirmPassword) {
        newErrors.confirmPassword = 'As senhas não coincidem';
        isValid = false;
      }
      
      // Validar aceite dos termos
      if (!registerData.termsAccepted) {
        newErrors.termsAccepted = 'Você precisa aceitar os termos de uso';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Avançar para o próximo passo
  const nextStep = () => {
    if (step === 1) {
      if (validateForm()) {
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
      handleCancel();
    }
  };
  
  // Função para cancelar o registro e voltar à tela inicial
  const handleCancel = () => {
    // Perguntar ao usuário se deseja realmente cancelar
    Alert.alert(
      "Cancelar cadastro",
      "Tem certeza que deseja cancelar o cadastro? Todos os dados informados serão perdidos.",
      [
        {
          text: "Não",
          style: "cancel"
        },
        {
          text: "Sim, cancelar",
          onPress: () => {
            // Navegar para a tela inicial
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              })
            );
          }
        }
      ]
    );
  };
  
  // Registrar usuário
  const handleRegister = async () => {
    try {
      if (!validateForm()) return;
      
      Keyboard.dismiss();
      setLoading(true);
      setShowError(false);
      
      // Log para debugging
      console.log("Tentando registrar com tipo:", userType);
      
      // Garantir que userType seja válido
      const actualUserType = userType || await AsyncStorage.getItem('@user_type');
      
      if (!actualUserType || !['resident', 'driver', 'condo', 'admin'].includes(actualUserType)) {
        console.error("Tipo de usuário inválido ou não especificado:", actualUserType);
        setError("Tipo de usuário inválido. Por favor, volte e selecione novamente.");
        setShowError(true);
        setLoading(false);
        return;
      }
      
      // Enviar ao Firebase
      console.log(`Registrando ${registerData.name} como ${actualUserType}`);
      await register(registerData.email, registerData.password, registerData.name, actualUserType);
      console.log("Registro bem-sucedido! Redirecionando...");
      
      // Redirecionar para a tela apropriada após o registro
      // Isso acontecerá automaticamente pelo RootNavigator
    } catch (error) {
      console.error("Erro no registro:", error);
      
      // Exibir mensagem específica para email já em uso
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          "Email já cadastrado",
          "Este email já está sendo usado por outra conta. Por favor, use um email diferente ou tente fazer login.",
          [
            { 
              text: "Ir para login", 
              onPress: () => navigation.navigate('Login', { email: registerData.email })
            },
            {
              text: "Tentar novamente",
              style: "cancel"
            }
          ]
        );
      } else if (error.code === 'auth/weak-password') {
        setErrors({
          ...errors,
          password: 'A senha é muito fraca. Use pelo menos 6 caracteres.'
        });
      } else if (error.code === 'auth/invalid-email') {
        setErrors({
          ...errors,
          email: 'Email inválido. Verifique o formato.'
        });
      } else {
        // Para outros erros, exibir mensagem padrão
        setError(error.message || 'Erro ao criar conta. Tente novamente.');
        setShowError(true);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Obter tipo de usuário formatado
  const getUserTypeText = () => {
    switch (userType) {
      case 'resident': return 'Morador';
      case 'driver': return 'Motorista';
      case 'condo': return 'Condomínio';
      case 'admin': return 'Administrador';
      default: return 'Usuário';
    }
  };
  
  // Renderizar o formulário do passo 1 (nome e email)
  const renderStep1 = () => (
    <>
      {/* Identificação do tipo de usuário */}
      <View style={styles.userTypeContainer}>
        <View style={[styles.userTypeIndicator, { backgroundColor: getUserTypeColor() }]}>
          <MaterialCommunityIcons name={getUserTypeIcon()} size={20} color="#FFFFFF" />
        </View>
        <Text style={styles.userTypeText}>Cadastro de {getUserTypeText()}</Text>
      </View>
      
      {/* Campo de Nome */}
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="account-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
        <TextInput
          label="Nome completo"
          value={registerData.name}
          onChangeText={(text) => updateRegisterData('name', text)}
          autoCapitalize="words"
          returnKeyType="next"
          onSubmitEditing={() => emailInputRef.current?.focus()}
          style={styles.input}
          mode="outlined"
          outlineColor="#E0E0E0"
          activeOutlineColor={theme.colors.primary}
          error={!!errors.name}
        />
      </View>
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      
      {/* Campo de Email */}
      <View style={styles.inputContainer}>
        <MaterialCommunityIcons name="email-outline" size={24} color={theme.colors.primary} style={styles.inputIcon} />
        <TextInput
          ref={emailInputRef}
          label="Email"
          value={registerData.email}
          onChangeText={(text) => updateRegisterData('email', text)}
          autoCapitalize="none"
          keyboardType="email-address"
          returnKeyType="next"
          onSubmitEditing={nextStep}
          style={styles.input}
          mode="outlined"
          outlineColor="#E0E0E0"
          activeOutlineColor={theme.colors.primary}
          error={!!errors.email}
        />
      </View>
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
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
          value={registerData.password}
          onChangeText={(text) => updateRegisterData('password', text)}
          secureTextEntry={!showPassword}
          returnKeyType="next"
          onSubmitEditing={() => confirmPasswordInputRef.current?.focus()}
          style={styles.input}
          mode="outlined"
          outlineColor="#E0E0E0"
          activeOutlineColor={theme.colors.primary}
          error={!!errors.password}
          right={
            <TextInput.Icon 
              icon={showPassword ? "eye-off" : "eye"} 
              onPress={() => setShowPassword(!showPassword)}
              color="#757575"
            />
          }
        />
      </View>
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
      
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
          value={registerData.confirmPassword}
          onChangeText={(text) => updateRegisterData('confirmPassword', text)}
          secureTextEntry={!showConfirmPassword}
          returnKeyType="done"
          onSubmitEditing={handleRegister}
          style={styles.input}
          mode="outlined"
          outlineColor="#E0E0E0"
          activeOutlineColor={theme.colors.primary}
          error={!!errors.confirmPassword}
          right={
            <TextInput.Icon 
              icon={showConfirmPassword ? "eye-off" : "eye"} 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              color="#757575"
            />
          }
        />
      </View>
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
      
      {/* Dicas para Senha Forte */}
      <View style={styles.passwordTipsContainer}>
        <Text style={styles.passwordTipsTitle}>Dicas para uma senha forte:</Text>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={registerData.password.length >= 8 ? "check-circle" : "information"} 
            size={16} 
            color={registerData.password.length >= 8 ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Pelo menos 8 caracteres</Text>
        </View>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={/\d/.test(registerData.password) ? "check-circle" : "information"} 
            size={16}
            color={/\d/.test(registerData.password) ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Inclua números</Text>
        </View>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={/[!@#$%^&*(),.?":{}|<>]/.test(registerData.password) ? "check-circle" : "information"} 
            size={16}
            color={/[!@#$%^&*(),.?":{}|<>]/.test(registerData.password) ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Inclua caracteres especiais (!@#$)</Text>
        </View>
        <View style={styles.passwordTipItem}>
          <MaterialCommunityIcons 
            name={/[a-z]/.test(registerData.password) && /[A-Z]/.test(registerData.password) ? "check-circle" : "information"} 
            size={16}
            color={/[a-z]/.test(registerData.password) && /[A-Z]/.test(registerData.password) ? "#4CAF50" : "#757575"} 
          />
          <Text style={styles.passwordTipText}>Letras maiúsculas e minúsculas</Text>
        </View>
      </View>
      
      {/* Termos de uso */}
      <View style={styles.termsContainer}>
        <TouchableOpacity 
          style={styles.checkboxContainer}
          onPress={() => updateRegisterData('termsAccepted', !registerData.termsAccepted)}
        >
          <MaterialCommunityIcons 
            name={registerData.termsAccepted ? "checkbox-marked" : "checkbox-blank-outline"} 
            size={20} 
            color={registerData.termsAccepted ? theme.colors.primary : "#757575"} 
          />
          <Text style={styles.termsText}>
            Li e aceito os <Text 
              style={styles.termsLink}
              onPress={() => navigation.navigate('TermsOfUse')}
            >
              termos de uso
            </Text> e <Text 
              style={styles.termsLink}
              onPress={() => navigation.navigate('PrivacyPolicy')}
            >
              política de privacidade
            </Text>
          </Text>
        </TouchableOpacity>
      </View>
      {errors.termsAccepted && <Text style={styles.errorText}>{errors.termsAccepted}</Text>}
    </>
  );
  
  // Obter ícone baseado no tipo de usuário
  const getUserTypeIcon = () => {
    switch (userType) {
      case 'driver':
        return 'car';
      case 'condo':
        return 'office-building';
      case 'admin':
        return 'shield-account';
      default:
        return 'home-account';
    }
  };
  
  // Obter cor baseada no tipo de usuário
  const getUserTypeColor = () => {
    switch (userType) {
      case 'driver':
        return '#FF9800';
      case 'condo':
        return '#4CAF50';
      case 'admin':
        return '#9C27B0';
      default:
        return '#2196F3';
    }
  };
  
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
        {step === 1 ? 'Cancelar' : 'Voltar'}
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
  
  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <SafeAreaView>
          <View style={styles.header}>
            <IconButton
              icon="arrow-left"
              size={24}
              onPress={handleCancel}
              style={styles.backIcon}
            />
            <View style={styles.progressContainer}>
              <ProgressBar
                progress={step / 2}
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
        </SafeAreaView>
        
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
        action={{
          label: 'OK',
          onPress: () => setShowError(false),
        }}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
    paddingBottom: 16,
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
    elevation: 2,
  },
  userTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  userTypeIndicator: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 8,
  },
  input: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginLeft: 36,
    marginBottom: 8,
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
    marginBottom: 16,
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
  termsContainer: {
    marginVertical: 16,
    marginLeft: 36,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  termsText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
    flex: 1,
  },
  termsLink: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
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