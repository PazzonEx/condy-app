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
  RadioButton,
  Card
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
import StorageService from '../../services/storage.service';
import PaymentService from '../../services/payment.service';

// Utilitários
import { maskPhone, maskCNPJ, maskCEP } from '../../utils/masks';
import { isValidEmail, isValidCNPJ } from '../../utils/validation';

const { width } = Dimensions.get('window');

const CondoRegisterScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, userProfile, updateProfile, setUserProfile, logout } = useAuth();
  
  // Refs, animações, estados e dados do formulário permanecem iguais
  // ...
  
  // Refs
  const scrollViewRef = useRef(null);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  
  // Estados
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [availablePlans, setAvailablePlans] = useState([]);
  
  // Dados do formulário
  const [condoData, setCondoData] = useState({
    // ... dados existentes ...
  });
  
  // Atualizar apenas a função handleCancel em src/screens/condo/CondoRegisterScreen.js

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
              const userType = 'condo'; // ou 'driver' ou 'condo' dependendo da tela
              
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
  // Voltar para etapa anterior
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
      if (scrollViewRef.current && scrollViewRef.current.scrollToPosition) {
        scrollViewRef.current.scrollToPosition(0, 0);
      } else if (scrollViewRef.current && scrollViewRef.current.scrollTo) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    } else {
      // Se estiver na primeira etapa, mostrar diálogo de confirmação
      handleCancel();
    }
  };
  
  // O resto do conteúdo da renderização permanece o mesmo
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
              progress={step / 5}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              Etapa {step} de 5: {getStepTitle()}
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
            {step === 5 ? 'Finalizar' : 'Próximo'}
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
    marginTop: 8,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#424242',
    marginLeft: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 24,
  },
  rowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plansContainer: {
    marginVertical: 16,
  },
  planCard: {
    width: 240,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedPlanCard: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    elevation: 4,
  },
  planCardContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  planBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginBottom: 8,
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  planPeriod: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  planDivider: {
    marginVertical: 16,
  },
  planFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planFeatureText: {
    fontSize: 12,
    marginLeft: 8,
  },
  planButtonContainer: {
    marginTop: 16,
  },
  planButton: {
    borderRadius: 4,
  },
  featuresContainer: {
    marginTop: 8,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  preferenceTextContainer: {
    flex: 1,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  preferenceDescription: {
    fontSize: 14,
    color: '#757575',
  },
  toggleButton: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E0E0E0',
    padding: 3,
  },
  toggleButtonActive: {
    backgroundColor: '#2196F3',
  },
  toggleDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleDotActive: {
    alignSelf: 'flex-end',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
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

export default CondoRegisterScreen;