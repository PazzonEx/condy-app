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
import DocumentUpload from '../../components/DocumentUpload';
import LoadingOverlay from '../../components/LoadingOverlay';

// Serviços
import FirestoreService from '../../services/firestore.service';
import StorageService from '../../services/storage.service';

// Utilitários
import { maskCPF, maskPhone, maskCNH, maskLicensePlate } from '../../utils/masks';
import { isValidEmail, isValidCPF, isValidPhone } from '../../utils/validation';

const { width, height } = Dimensions.get('window');

const DriverRegisterScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, userProfile, updateProfile, setUserProfile, logout, cancelRegistration } = useAuth();
  
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
    
    // Endereço
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
  
  // Efeito para monitorar teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0.8,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: -50,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start();
      }
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(translateYAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          })
        ]).start();
      }
    );
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Atualizar dados do motorista
  const updateDriverData = (field, value) => {
    setDriverData(prev => {
      // Criar uma cópia profunda para campos aninhados
      const updated = JSON.parse(JSON.stringify(prev));
      
      // Atualizar campo aninhado (se necessário)
      if (field.includes('.')) {
        const parts = field.split('.');
        let target = updated;
        
        // Navegar pela estrutura aninhada
        for (let i = 0; i < parts.length - 1; i++) {
          target = target[parts[i]];
        }
        
        // Atualizar o campo mais profundo
        target[parts[parts.length - 1]] = value;
      } else {
        // Atualizar campo normal
        updated[field] = value;
      }
      
      return updated;
    });
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Atualizar documentos
  const handleDocumentsChange = (docType, documents) => {
    updateDriverData(`documents.${docType}`, documents);
    
    // Limpar erro do campo
    if (errors[`documents.${docType}`]) {
      setErrors(prev => ({ ...prev, [`documents.${docType}`]: null }));
    }
  };

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

  // Validar etapa atual
  const validateStep = () => {
    let stepErrors = {};
    let isValid = true;
    
    if (step === 1) {
      // Validar dados pessoais
      if (!driverData.name.trim()) {
        stepErrors.name = 'Nome é obrigatório';
        isValid = false;
      }
      
      // Validar CPF
      const cleanCPF = driverData.cpf.replace(/\D/g, '');
      if (!isValidCPF(cleanCPF)) {
        stepErrors.cpf = 'CPF inválido';
        isValid = false;
      }
      
      // Validar telefone
      const cleanPhone = driverData.phone.replace(/\D/g, '');
      if (!isValidPhone(cleanPhone)) {
        stepErrors.phone = 'Telefone inválido';
        isValid = false;
      }
    } else if (step === 2) {
      // Validar dados de habilitação
      if (!driverData.cnh.trim()) {
        stepErrors.cnh = 'CNH é obrigatória';
        isValid = false;
      }
      
      if (!driverData.cnhType) {
        stepErrors.cnhType = 'Tipo de CNH é obrigatório';
        isValid = false;
      }
    } else if (step === 3) {
      // Validar dados do veículo
      if (!driverData.vehiclePlate.trim()) {
        stepErrors.vehiclePlate = 'Placa do veículo é obrigatória';
        isValid = false;
      } else {
        // Remover caracteres não alfanuméricos
        const cleanedPlate = driverData.vehiclePlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
        
        // Validar formato da placa (padrão tradicional AAA1234 ou Mercosul AAA1A23)
        const validPlateFormat = /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$|^[A-Z]{3}[0-9]{4}$/;
        
        if (!validPlateFormat.test(cleanedPlate)) {
          stepErrors.vehiclePlate = 'Formato de placa inválido';
          isValid = false;
        }
      }
      
      if (!driverData.vehicleModel.trim()) {
        stepErrors.vehicleModel = 'Modelo do veículo é obrigatório';
        isValid = false;
      }
      
      // Validações adicionais (opcionais)
      if (driverData.vehicleYear && !/^\d{4}$/.test(driverData.vehicleYear)) {
        stepErrors.vehicleYear = 'Ano do veículo inválido';
        isValid = false;
      }
    } else if (step === 4) {
      // Validar documentos
      if (!driverData.documents.cnh || driverData.documents.cnh.length === 0) {
        stepErrors['documents.cnh'] = 'Documento da CNH é obrigatório';
        isValid = false;
      }
      
      if (!driverData.documents.vehicleDocument || driverData.documents.vehicleDocument.length === 0) {
        stepErrors['documents.vehicleDocument'] = 'Documento do veículo é obrigatório';
        isValid = false;
      }
    }
    
    setErrors(stepErrors);
    return isValid;
  };

  // Avançar para próxima etapa
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

  // Função auxiliar para rolar para o topo
  const scrollToTop = () => {
    if (scrollViewRef.current) {
      if (scrollViewRef.current.scrollToPosition) {
        scrollViewRef.current.scrollToPosition(0, 0);
      } else if (scrollViewRef.current.scrollTo) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      }
    }
  };

  // Função auxiliar para processar uploads de documentos
  const processDocumentUploads = async () => {
    try {
      const uploadPromises = [];
      const documentPaths = {};
      
      // Processar cada tipo de documento
      for (const docType in driverData.documents) {
        if (driverData.documents[docType] && driverData.documents[docType].length > 0) {
          const docs = driverData.documents[docType];
          documentPaths[docType] = [];
          
          for (const doc of docs) {
            // Se o documento já tem URL, apenas inclua no resultado
            if (doc.url) {
              documentPaths[docType].push({
                path: doc.path,
                url: doc.url,
                type: doc.type || 'image/jpeg',
                name: doc.name || 'documento'
              });
              continue;
            }
            
            // Se for um novo documento, faça upload
            if (doc.uri) {
              // Criar caminho único para o arquivo
              const timestamp = Date.now();
              const path = `users/${currentUser.uid}/documents/${docType}_${timestamp}`;
              
              // Adicionar promessa de upload à lista
              const uploadPromise = StorageService.uploadFile(path, doc.uri)
                .then(result => {
                  // Adicionar documento carregado à lista
                  documentPaths[docType].push({
                    path: result.path,
                    url: result.url,
                    type: doc.type || 'image/jpeg',
                    name: doc.name || `${docType}_${timestamp}`
                  });
                });
              
              uploadPromises.push(uploadPromise);
            }
          }
        }
      }
      
      // Aguardar conclusão de todos os uploads
      await Promise.all(uploadPromises);
      return documentPaths;
    } catch (error) {
      console.error('Erro ao processar uploads de documentos:', error);
      throw new Error('Falha ao enviar documentos. Tente novamente.');
    }
  };

  // Cancelar cadastro
  const handleCancel = () => {
    Alert.alert(
      "Cancelar Cadastro",
      "Tem certeza que deseja cancelar o cadastro? Esta ação não pode ser desfeita.",
      [
        { text: "Não", style: "cancel" },
        {
          text: "Sim, cancelar",
          onPress: async () => {
            setLoading(true);
            try {
              if (currentUser) {
                // Remover documentos que foram enviados ao Storage
                try {
                  // Verificar se existem documentos para remover
                  for (const docType in driverData.documents) {
                    const docs = driverData.documents[docType];
                    if (docs && docs.length > 0) {
                      for (const doc of docs) {
                        if (doc.path) {
                          // Remover arquivo do Storage
                          await StorageService.deleteFile(doc.path);
                        }
                      }
                    }
                  }
                } catch (storageError) {
                  console.error("Erro ao remover arquivos:", storageError);
                  // Continuar mesmo com erro
                }
                
                // Usar a função do hook de autenticação para cancelar o registro
                await cancelRegistration('driver');
                
                // Navegar para a tela de login
                navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }]
                });
              }
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
      // Animar transição
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
      scrollToTop();
    } else {
      // Se estiver na primeira etapa, mostrar diálogo de confirmação
      handleCancel();
    }
  };

  // Enviar formulário
  const submitForm = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      // Processar uploads de documentos
      console.log('Iniciando upload de documentos...');
      const uploadedDocuments = await processDocumentUploads();
      console.log('Uploads concluídos:', uploadedDocuments);
      
      // Preparar dados para envio
      const driverProfileData = {
        // Dados pessoais
        name: driverData.name,
        cpf: driverData.cpf.replace(/\D/g, ''),
        phone: driverData.phone.replace(/\D/g, ''),
        
        // Dados de habilitação
        licenseData: {
          cnh: driverData.cnh.replace(/\D/g, ''),
          cnhType: driverData.cnhType
        },
        
        // Dados do veículo
        
        vehicleMake: driverData.vehicleMake || '',
        vehicleModel: driverData.vehicleModel,
        vehicleYear: driverData.vehicleYear || '',
        vehicleColor: driverData.vehicleColor || '',
        vehiclePlate: driverData.vehiclePlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase(),
        
        
        // Documentos processados
        documents: uploadedDocuments,
        photoURL:uploadedDocuments.profilePhoto[0].url,
        serviceType:driverData.appServices ||  [],

        // Serviços
        servicePreferences: {
          appServices: driverData.appServices || [],
          workSchedule: driverData.workSchedule || []
        },
        
        // Metadados e status
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
      
      // Atualizar documento de usuário para consistência
      await FirestoreService.updateDocument('users', currentUser.uid, {
        displayName: driverData.name,
        profileComplete: true,
        status: 'pending_verification',
        updatedAt: new Date().toISOString()
      });
      
      // Atualizar o estado do contexto de autenticação
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
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Erro ao enviar formulário:', error);
      setError('Erro ao salvar seus dados. Tente novamente.');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  // Renderização das etapas
  // Renderizar formulário da etapa 1 (Dados Pessoais)
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

  // Renderizar formulário da etapa 2 (Dados de Habilitação)
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

  // Renderizar formulário da etapa 3 (Dados do Veículo)
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
          left={<TextInput.Icon icon="car-multiple" />}
        />
      </View>
      
      {/* Ano do veículo (opcional) */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Ano do Veículo"
          value={driverData.vehicleYear}
          onChangeText={(text) => updateDriverData('vehicleYear', text)}
          mode="outlined"
          error={!!errors.vehicleYear}
          style={styles.input}
          keyboardType="numeric"
          maxLength={4}
          placeholder="Exemplo: 2020"
          left={<TextInput.Icon icon="calendar" />}
        />
        {errors.vehicleYear && <Text style={styles.errorText}>{errors.vehicleYear}</Text>}
      </View>
      
      {/* Cor do veículo (opcional) */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Cor do Veículo"
          value={driverData.vehicleColor}
          onChangeText={(text) => updateDriverData('vehicleColor', text)}
          mode="outlined"
          style={styles.input}
          placeholder="Exemplo: Prata"
          left={<TextInput.Icon icon="palette" />}
        />
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Essas informações ajudarão a portaria a identificar seu veículo na entrada do condomínio.
        </Text>
      </View>
    </View>
  );

  // Renderizar formulário da etapa 4 (Documentação e Preferências)
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      {/* Upload de documentos */}
      <DocumentUpload
        title="Documento da CNH *"
        subtitle="Foto frente e verso da CNH"
        documentType="cnh"
        initialDocuments={driverData.documents.cnh}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('cnh', docs)}
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
        onDocumentsChange={(docs) => handleDocumentsChange('vehicleDocument', docs)}
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
        onDocumentsChange={(docs) => handleDocumentsChange('profilePhoto', docs)}
        maxDocuments={1}
      />

      <DocumentUpload
        title="Foto do Veículo"
        subtitle="Foto atual do seu veículo (opcional)"
        documentType="vehiclePhoto"
        initialDocuments={driverData.documents.vehiclePhoto}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('vehiclePhoto', docs)}
        maxDocuments={2}
      />

      {/* Serviços de Aplicativo */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Serviços de Aplicativo</Text>
        <Text style={styles.sectionSubtitle}>
          Selecione os aplicativos de transporte ou entrega que você utiliza
        </Text>
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
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Após o envio, seus documentos serão verificados antes da aprovação do seu cadastro.
          Você receberá uma notificação quando seu cadastro for aprovado.
        </Text>
      </View>
    </View>
  );

  // Renderizar conteúdo baseado na etapa atual
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
  sectionContainer: {
    marginBottom: 24,
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