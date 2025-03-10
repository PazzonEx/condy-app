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
import { isValidEmail,isValidCPF,isValidPhone } from '../../utils/validation';

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
  // Obter título da etapa atual
const getStepTitle = () => {
  switch (step) {
    case 1:
      return 'Dados Pessoais';
    case 2:
      return 'Dados de Habilitação';
    case 3:
      return 'Dados do Veículo';
    case 4:
      return 'Documentação e Preferências';
    default:
      return '';
  }
};
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
// Em src/screens/driver/DriverRegisterScreen.js

// Na renderização dos inputs, usar máscaras dos utils
const renderStep1 = () => (
  <View style={styles.stepContainer}>
    {/* Nome completo */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Nome completo *"
        value={driverData.name}
        onChangeText={(text) => updateDriverData('name', text)}
        mode="outlined"
        error={!!errors.name}
        style={styles.input}
        autoCapitalize="words"
        placeholder="Seu nome completo"
        left={<TextInput.Icon icon="account" />}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
    </View>
    
    {/* CPF com máscara */}
    <View style={styles.inputContainer}>
      <TextInput
        label="CPF *"
        value={driverData.cpf}
        onChangeText={(text) => updateDriverData('cpf', maskCPF(text))}
        mode="outlined"
        error={!!errors.cpf}
        style={styles.input}
        keyboardType="numeric"
        maxLength={14}
        placeholder="000.000.000-00"
        left={<TextInput.Icon icon="card-account-details" />}
      />
      {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
    </View>
    
    {/* Telefone com máscara */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Telefone *"
        value={driverData.phone}
        onChangeText={(text) => updateDriverData('phone', maskPhone(text))}
        mode="outlined"
        error={!!errors.phone}
        style={styles.input}
        keyboardType="phone-pad"
        maxLength={15}
        placeholder="(00) 00000-0000"
        left={<TextInput.Icon icon="cellphone" />}
      />
      {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
    </View>
  </View>
); 
// Adicionar função para atualizar dados do motorista
const updateDriverData = (field, value) => {
  setDriverData(prev => ({
    ...prev,
    [field]: value
  }));
  
  // Limpar erro do campo
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: null }));
  }
};

const nextStep = () => {
  if (validateStep()) {
    if (step < 4) {
      // Animar transição
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(translateYAnim, {
          toValue: 50,
          duration: 1,
          useNativeDriver: true
        })
      ]).start(() => {
        setStep(prev => prev + 1);
        
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
      scrollToTop();
    } else {
      submitForm();
    }
  } else {
    // Mostrar erro
    setError('Corrija os erros antes de continuar');
    setShowError(true);
  }
};

// Adicionar função de validação de etapa
// Na função validateStep()
const validateStep = () => {
  let stepErrors = {};
  let isValid = true;

  switch (step) {
    case 1:
      // Validar dados pessoais
      if (!driverData.name.trim()) {
        stepErrors.name = 'Nome é obrigatório';
        isValid = false;
      }
      
      // Usar utilidade de validação de CPF
      const cleanCPF = driverData.cpf.replace(/\D/g, '');
      if (!isValidCPF(cleanCPF)) {
        stepErrors.cpf = 'CPF inválido';
        isValid = false;
      }
      
      // Usar função de validação de telefone
      const cleanPhone = driverData.phone.replace(/\D/g, '');
      if (!isValidPhone(cleanPhone)) {
        stepErrors.phone = 'Telefone inválido';
        isValid = false;
      }
      break;
    
    case 2:
      // Validar dados de habilitação
      if (!driverData.cnh.trim()) {
        stepErrors.cnh = 'CNH é obrigatória';
        isValid = false;
      }
      
      if (!driverData.cnhType) {
        stepErrors.cnhType = 'Tipo de CNH é obrigatório';
        isValid = false;
      }
      break;
    
    case 3:
      // Validar dados do veículo
      if (!driverData.vehiclePlate.trim()) {
        stepErrors.vehiclePlate = 'Placa do veículo é obrigatória';
        isValid = false;
      }
      
      if (!driverData.vehicleModel.trim()) {
        stepErrors.vehicleModel = 'Modelo do veículo é obrigatório';
        isValid = false;
      }
      break;
    
    case 4:
      // Validar documentos
      if (!driverData.documents.cnh || driverData.documents.cnh.length === 0) {
        stepErrors['documents.cnh'] = 'Documento da CNH é obrigatório';
        isValid = false;
      }
      
      if (!driverData.documents.vehicleDocument || driverData.documents.vehicleDocument.length === 0) {
        stepErrors['documents.vehicleDocument'] = 'Documento do veículo é obrigatório';
        isValid = false;
      }
      break;
  }

  setErrors(stepErrors);
  return isValid;
};

// Adicionar função para rolar para o topo
const scrollToTop = () => {
  if (scrollViewRef.current) {
    if (scrollViewRef.current.scrollToPosition) {
      scrollViewRef.current.scrollToPosition(0, 0);
    } else if (scrollViewRef.current.scrollTo) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }
};

// Adicionar função de envio do formulário
const submitForm = async () => {
  try {
    setLoading(true);
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    await updateProfile({
      displayName: driverData.name,
      profileComplete: true, // Definir como true após completar o registro
      status: 'pending_verification'
    });
    
    // Preparar dados para envio
    const driverProfileData = {
      personalData: {
        name: driverData.name,
        cpf: driverData.cpf.replace(/\D/g, ''),
        phone: driverData.phone.replace(/\D/g, ''),
      },
      licenseData: {
        cnh: driverData.cnh,
        cnhType: driverData.cnhType
      },
      vehicleData: {
        make: driverData.vehicleMake,
        model: driverData.vehicleModel,
        year: driverData.vehicleYear,
        color: driverData.vehicleColor,
        plate: driverData.vehiclePlate
      },
      documents: driverData.documents,
      servicePreferences: {
        appServices: driverData.appServices,
        workSchedule: driverData.workSchedule
      },
      status: 'pending_verification',
      verificationStatus: 'pending',
      profileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Atualizar documento do motorista no Firestore
    await FirestoreService.updateDocument('drivers', currentUser.uid, driverProfileData);
    
    // Atualizar perfil geral
    await updateProfile({
      displayName: driverData.name,
      profileComplete: true,
      status: 'pending_verification'
    });
    
    // Forçar uma atualização no perfil do usuário
    const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
    setUserProfile({
      ...userProfile,
      ...userDoc,
      profileComplete: true,
      status: 'pending_verification'
    });
    
    // Mostrar mensagem de sucesso
    Alert.alert(
      'Cadastro Enviado',
      'Suas informações foram enviadas e estão em análise. Por favor, aguarde a aprovação.',
      [{ 
        text: 'OK', 
        onPress: () => {
          // Recarregar a aplicação/navegação
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
          });
        } 
      }]
    );
  } catch (error) {
    console.error('Erro ao enviar formulário:', error);
    setError('Erro ao salvar seus dados. Tente novamente.');
    setShowError(true);
  } finally {
    setLoading(false);
  }
};
// Renderizar dados de habilitação (Etapa 2)
const renderStep2 = () => (
  <View style={styles.stepContainer}>
    {/* Número da CNH */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Número da CNH *"
        value={driverData.cnh}
        onChangeText={(text) => updateDriverData('cnh', maskCNH(text))}
        mode="outlined"
        error={!!errors.cnh}
        style={styles.input}
        keyboardType="numeric"
        placeholder="CNH"
        left={<TextInput.Icon icon="card-account-details" />}
      />
      {errors.cnh && <Text style={styles.errorText}>{errors.cnh}</Text>}
    </View>
    
    {/* Tipo de CNH */}
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Tipo de CNH *</Text>
      <View style={styles.cnhTypeContainer}>
        {['A', 'B', 'C', 'D', 'E'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.cnhTypeCard,
              driverData.cnhType === type && styles.cnhTypeCardSelected
            ]}
            onPress={() => updateDriverData('cnhType', type)}
          >
            <Text style={[
              styles.cnhTypeText,
              driverData.cnhType === type && styles.cnhTypeTextSelected
            ]}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {errors.cnhType && <Text style={styles.errorText}>{errors.cnhType}</Text>}
    </View>
  </View>
);

// Renderizar dados do veículo (Etapa 3)
const renderStep3 = () => (
  <View style={styles.stepContainer}>
    {/* Placa do veículo */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Placa do Veículo *"
        value={driverData.vehiclePlate}
        onChangeText={(text) => updateDriverData('vehiclePlate', maskLicensePlate(text))}
        mode="outlined"
        error={!!errors.vehiclePlate}
        style={styles.input}
        placeholder="ABC-1234"
        left={<TextInput.Icon icon="car" />}
      />
      {errors.vehiclePlate && <Text style={styles.errorText}>{errors.vehiclePlate}</Text>}
    </View>
    
    {/* Modelo do veículo */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Modelo do Veículo *"
        value={driverData.vehicleModel}
        onChangeText={(text) => updateDriverData('vehicleModel', text)}
        mode="outlined"
        error={!!errors.vehicleModel}
        style={styles.input}
        placeholder="Exemplo: Fiat Uno"
        left={<TextInput.Icon icon="car-outline" />}
      />
      {errors.vehicleModel && <Text style={styles.errorText}>{errors.vehicleModel}</Text>}
    </View>
    
    {/* Marca do veículo (opcional) */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Marca do Veículo"
        value={driverData.vehicleMake}
        onChangeText={(text) => updateDriverData('vehicleMake', text)}
        mode="outlined"
        style={styles.input}
        placeholder="Exemplo: Fiat"
        left={<TextInput.Icon icon="car-marker" />}
      />
    </View>
  </View>
);

// Renderizar documentos e preferências (Etapa 4)
const renderStep4 = () => (
  <View style={styles.stepContainer}>
    {/* Upload de documentos */}
    <DocumentUpload
      title="Documento da CNH *"
      subtitle="Foto frente e verso da CNH"
      documentType="cnh"
      initialDocuments={driverData.documents.cnh}
      userId={currentUser?.uid}
      onDocumentsChange={(docs) => updateDriverData('documents', {...driverData.documents, cnh: docs})}
      maxDocuments={2}
      required
    />
    {errors['documents.cnh'] && <Text style={styles.errorText}>{errors['documents.cnh']}</Text>}

    <DocumentUpload
      title="Documento do Veículo *"
      subtitle="CRLV (Certificado de Registro e Licenciamento de Veículo)"
      documentType="vehicleDocument"
      initialDocuments={driverData.documents.vehicleDocument}
      userId={currentUser?.uid}
      onDocumentsChange={(docs) => updateDriverData('documents', {...driverData.documents, vehicleDocument: docs})}
      maxDocuments={2}
      required
    />
    {errors['documents.vehicleDocument'] && <Text style={styles.errorText}>{errors['documents.vehicleDocument']}</Text>}

    <DocumentUpload
      title="Foto de Perfil"
      subtitle="Foto de rosto clara e recente (opcional)"
      documentType="profilePhoto"
      initialDocuments={driverData.documents.profilePhoto}
      userId={currentUser?.uid}
      onDocumentsChange={(docs) => updateDriverData('documents', {...driverData.documents, profilePhoto: docs})}
      maxDocuments={1}
    />

    {/* Serviços de Aplicativo */}
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>Serviços de Aplicativo</Text>
      <View style={styles.appsContainer}>
        {['Uber', 'iFood', 'Cabify', 'Rappi', '99', 'Outros'].map((app) => (
          <TouchableOpacity
            key={app}
            style={[
              styles.appCard,
              driverData.appServices.includes(app) && styles.appCardSelected
            ]}
            onPress={() => {
              const updatedServices = driverData.appServices.includes(app)
                ? driverData.appServices.filter(service => service !== app)
                : [...driverData.appServices, app];
              updateDriverData('appServices', updatedServices);
            }}
          >
            <View style={[
              styles.appIconContainer,
              driverData.appServices.includes(app) && styles.appIconContainerSelected
            ]}>
              <MaterialCommunityIcons 
                name={app === 'Outros' ? 'plus' : 'apps'}
                size={20}
                color={driverData.appServices.includes(app) ? 'white' : '#757575'}
              />
            </View>
            <Text style={[
              styles.appName,
              driverData.appServices.includes(app) && styles.appNameSelected
            ]}>
              {app}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  </View>
);

// Na função que renderiza o conteúdo da etapa
const renderStepContent = () => {
  switch (step) {
    case 1:
      return renderStep1();
    case 2:
      return renderStep2();
    case 3:
      return renderStep3();
    case 4:
      return renderStep4();
    default:
      return null;
  }
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
        <Animated.View
  style={[
    styles.formContainer,
    {
      opacity: fadeAnim,
      transform: [{ translateY: translateYAnim }]
    }
  ]}
>
  {renderStepContent()}
</Animated.View>
        
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