// src/screens/driver/DriverRegisterScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  StatusBar,
  Platform,
  SafeAreaView
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  useTheme, 
  Snackbar,
  ProgressBar,
  Surface,
  IconButton,
  Divider,
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Animatable from 'react-native-animatable';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Componentes
import AddressAutocomplete from '../../components/AddressAutocomplete';
import DocumentUpload from '../../components/DocumentUpload';
import LoadingOverlay from '../../components/LoadingOverlay';

// Serviços
import FirestoreService from '../../services/firestore.service';

// Utilitários
import { maskCPF, maskPhone, maskCNH, maskLicensePlate } from '../../utils/masks';
import { isValidEmail } from '../../utils/validation';

const { width, height } = Dimensions.get('window');

const DriverRegisterScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, userProfile, updateProfile, setUserProfile, logout } = useAuth();
  
  // Refs
  const scrollViewRef = useRef(null);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  
  // Estados
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  
  // Dados do formulário
  const [driverData, setDriverData] = useState({
    // Dados pessoais
    name: userProfile?.displayName || '',
    cpf: '',
    phone: '',
    
    // Dados de habilitação
    cnh: '',
    cnhType: '',
    
    // Dados de veículo
    vehicleMake: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    vehiclePlate: '',
    
    // Dados de endereço
    address: '',
    addressDetails: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      postalCode: '',
      latitude: null,
      longitude: null
    },
    
    // Dados de trabalho
    appServices: [],
    workSchedule: [],
    
    // Documentos
    documents: {
      cnh: [],
      vehicleDocument: [],
      profilePhoto: [],
      vehiclePhoto: []
    }
  });
  
  // Erros de validação
  const [errors, setErrors] = useState({});
  
  // ... outras constantes para apps, tipos de CNH, etc. ...
  
  // Função para cancelar o cadastro e sair
 // Atualizar apenas a função handleCancel em src/screens/driver/DriverRegisterScreen.js

// Função simplificada para cancelar o cadastro e sair
const handleCancel = () => {
  Alert.alert(
    "Cancelar Cadastro",
    "Tem certeza que deseja cancelar o cadastro? Esta ação não pode ser desfeita.",
    [
      {
        text: "Não",
        style: "cancel"
      },
      {
        text: "Sim, cancelar",
        onPress: async () => {
          setLoading(true);
          try {
            // Alternativa mais simples que não depende de autenticação recente
            if (currentUser) {
              // 1. Tentar excluir documentos do Firestore
              const userType = 'driver'; // ou 'driver' ou 'condo' dependendo da tela
              
              // Excluir documento específico do tipo
              try {
                await FirestoreService.deleteDocument(userType + 's', currentUser.uid);
              } catch (e) {
                console.log('Erro ao excluir documento específico:', e);
              }
              
              // Excluir documento de usuário
              try {
                await FirestoreService.deleteDocument('users', currentUser.uid);
              } catch (e) {
                console.log('Erro ao excluir documento de usuário:', e);
              }
              
              // 2. Fazer logout
              await logout();
            }
            
            // 3. Voltar para tela inicial
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }]
            });
          } catch (error) {
            console.error("Erro ao cancelar cadastro:", error);
            setError("Erro ao cancelar cadastro. Tente novamente.");
            setShowError(true);
            
            // Mesmo com erro, tentar voltar para o login
            try {
              await logout();
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }]
              });
            } catch (e) {
              setLoading(false);
            }
          }
        }
      }
    ]
  );
};
  
  // Voltar para etapa anterior ou cancelar
  const prevStep = () => {
    if (step > 1) {
      // Animar transição para etapa anterior (código existente)
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(translateYAnim, {
          toValue: -50,
          duration: 1,
          useNativeDriver: true
        })
      ]).start(() => {
        setStep(prev => prev - 1);
        
        // Resetar animações
        translateYAnim.setValue(0);
        
        // Animar entrada do próximo step
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }).start();
      });
      
      // Rolar para o topo
      if (scrollViewRef.current) {
        if (scrollViewRef.current.scrollToPosition) {
          scrollViewRef.current.scrollToPosition(0, 0);
        } else if (scrollViewRef.current.scrollTo) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        }
      }
    } else {
      // Se estiver na primeira etapa, mostrar diálogo de confirmação
      handleCancel();
    }
  };
  
  // O resto do código para renderizar o conteúdo permanece o mesmo
  // ...
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <KeyboardAwareScrollView
        ref={scrollViewRef}
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
        bounces={true}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho com progresso */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={prevStep}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#000000" />
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={step / 4}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              Etapa {step} de 4: {getStepTitle()}
            </Text>
          </View>
        </View>
        
        {/* Conteúdo do formulário */}
        {/* ... (resto do código existente) ... */}
        
        {/* Botões de navegação */}
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={prevStep}
            style={styles.backButtonBottom}
            labelStyle={styles.backButtonLabel}
            disabled={loading}
          >
            {step === 1 ? 'Cancelar' : 'Voltar'}
          </Button>
          
          <Button
            mode="contained"
            onPress={nextStep}
            style={styles.nextButton}
            labelStyle={styles.nextButtonLabel}
            loading={loading}
            disabled={loading}
          >
            {step === 4 ? 'Finalizar' : 'Próximo'}
          </Button>
        </View>
      </KeyboardAwareScrollView>
      
      {/* Snackbar para mensagens de erro */}
      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
        style={styles.errorSnackbar}
      >
        {error}
      </Snackbar>
      
      {/* Overlay de carregamento */}
      <LoadingOverlay visible={loading} />
    </SafeAreaView>
  );
};


const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  contentContainer: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
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
  progressText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  formContainer: {
    paddingHorizontal: 16,
  },
  stepContainer: {
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#424242',
    marginLeft: 8,
    flex: 1,
  },
  divider: {
    marginVertical: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cnhTypeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  cnhTypeCard: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  cnhTypeCardSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  cnhTypeText: {
    fontSize: 14,
    color: '#757575',
  },
  cnhTypeTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  appsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  appCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 8,
    marginBottom: 8,
  },
  appCardSelected: {
    backgroundColor: '#E3F2FD',
    borderColor: '#2196F3',
  },
  appIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  appIconContainerSelected: {
    backgroundColor: '#2196F3',
  },
  appName: {
    fontSize: 14,
    color: '#757575',
  },
  appNameSelected: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  scheduleContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    overflow: 'hidden',
  },
  scheduleHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dayHeaderCell: {
    width: 80,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  periodHeaderCell: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  periodHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
  },
  scheduleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  dayCell: {
    width: 80,
    paddingVertical: 12,
    paddingHorizontal: 8,
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 14,
    color: '#424242',
  },
  scheduleCell: {
    flex: 1,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
  },
  scheduleCellSelected: {
    backgroundColor: '#2196F3',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  backButtonBottom: {
    flex: 1,
    marginRight: 8,
  },
  backButtonLabel: {
    fontSize: 14,
  },
  nextButton: {
    flex: 1,
    marginLeft: 8,
  },
  nextButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  errorSnackbar: {
    backgroundColor: '#F44336',
  }
});

export default DriverRegisterScreen;