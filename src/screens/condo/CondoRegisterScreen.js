// src/screens/condo/CondoRegisterScreen.js
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
import DocumentUpload from '../../components/DocumentUpload';
import LoadingOverlay from '../../components/LoadingOverlay';
import CondoAddressSearch from '../../components/CondoAddressSearch';

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
  const [errors, setErrors] = useState({});
  
  // Dados do formulário  
const [condoData, setCondoData] = useState({
  // Dados básicos (removemos o nome daqui)
  cnpj: '',
  phone: '',
  email: userProfile?.email || '',
  
  // Endereço (adicionamos o nome aqui)
  name: '', // Nome do condomínio movido para a etapa de endereço
  address: '',
  addressDetails: {
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    postalCode: '',
    latitude: null,
    longitude: null
  },
  
  // Dados do condomínio (novos campos)
  condoInfo: {
    blocks: '', // Número de blocos
    units: '', // Número de unidades
  },
  
  // Dados administrativos
  adminName: '',
  adminPhone: '',
  adminEmail: '',
  
  // Plano
  selectedPlan: 'basic',
  
  // Documentos
  documents: {
    condoRegistration: [],
    adminDocument: [],
    condoPhoto: []
  }
});
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
    
    // Carregar planos disponíveis
    loadPlans();
    
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);
  
  // Função para carregar planos disponíveis
  const loadPlans = async () => {
    try {
      setLoadingPlans(true);
      const plans = await PaymentService.getAllPlans();
      setAvailablePlans(plans);
      
      // Definir plano padrão se nenhum selecionado
      if (!condoData.selectedPlan && plans.length > 0) {
        updateCondoData('selectedPlan', plans[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    } finally {
      setLoadingPlans(false);
    }
  };
  
  // Atualizar dados do condomínio - versão mais robusta
const updateCondoData = (field, value) => {
  console.log(`Atualizando campo ${field} com valor:`, value);
  
  setCondoData(prev => {
    // Criar cópia do estado para garantir nova referência
    const newState = JSON.parse(JSON.stringify(prev));
    
    // Para campos aninhados (como addressDetails.street)
    if (field.includes('.')) {
      const [parentField, childField] = field.split('.');
      if (!newState[parentField]) {
        newState[parentField] = {};
      }
      newState[parentField][childField] = value;
    } else {
      // Para campos normais
      newState[field] = value;
    }
    
    return newState;
  });
  
  // Limpar erro do campo
  if (errors[field]) {
    setErrors(prev => ({ ...prev, [field]: null }));
  }
};
  
  // Atualizar documentos
  const handleDocumentsChange = (docType, documents) => {
    setCondoData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [docType]: documents
      }
    }));
    
    // Limpar erro do campo
    if (errors[`documents.${docType}`]) {
      setErrors(prev => ({ ...prev, [`documents.${docType}`]: null }));
    }
  };
  
  // Selecionar endereço via Google Places
  const handleSelectAddress = (address) => {
    if (address) {
      updateCondoData('address', address.formattedAddress || '');
      
      // Atualizar detalhes do endereço
      updateCondoData('addressDetails.street', address.street || '');
      updateCondoData('addressDetails.number', address.number || '');
      updateCondoData('addressDetails.neighborhood', address.neighborhood || '');
      updateCondoData('addressDetails.city', address.city || '');
      updateCondoData('addressDetails.state', address.state || '');
      updateCondoData('addressDetails.postalCode', address.postalCode || '');
      
      // Atualizar coordenadas
      if (address.latitude && address.longitude) {
        updateCondoData('addressDetails.latitude', address.latitude);
        updateCondoData('addressDetails.longitude', address.longitude);
      }
    }
  };
  
  // Validar etapa atual
  const validateStep = () => {
    let stepErrors = {};
    let isValid = true;
    
    if (step === 1) {
      // Validar dados básicos (sem o nome)
      const cleanCNPJ = condoData.cnpj.replace(/\D/g, '');
      if (!isValidCNPJ(cleanCNPJ)) {
        stepErrors.cnpj = 'CNPJ inválido';
        isValid = false;
      }
      
      if (!condoData.phone || condoData.phone.replace(/\D/g, '').length < 10) {
        stepErrors.phone = 'Telefone inválido';
        isValid = false;
      }
      
      if (!condoData.email || !isValidEmail(condoData.email)) {
        stepErrors.email = 'Email inválido';
        isValid = false;
      }
    } else if (step === 2) {
      // Validar endereço e informações do condomínio
      if (!condoData.name.trim()) {
        stepErrors.name = 'Nome do condomínio é obrigatório';
        isValid = false;
      }
      
      if (!condoData.address.trim()) {
        stepErrors.address = 'Endereço do condomínio é obrigatório';
        isValid = false;
      }
      
      if (!condoData.addressDetails.street.trim()) {
        stepErrors['addressDetails.street'] = 'Rua é obrigatória';
        isValid = false;
      }
      
      if (!condoData.addressDetails.number.trim()) {
        stepErrors['addressDetails.number'] = 'Número é obrigatório';
        isValid = false;
      }
      
      if (!condoData.addressDetails.city.trim()) {
        stepErrors['addressDetails.city'] = 'Cidade é obrigatória';
        isValid = false;
      }
      
      // Validar informações do condomínio
      if (!condoData.condoInfo.blocks.trim()) {
        stepErrors['condoInfo.blocks'] = 'Número de blocos é obrigatório';
        isValid = false;
      }
      
      if (!condoData.condoInfo.units.trim()) {
        stepErrors['condoInfo.units'] = 'Número de unidades é obrigatório';
        isValid = false;
      }
    } else if (step === 3) {
      // Validar dados administrativos
      if (!condoData.adminName.trim()) {
        stepErrors.adminName = 'Nome do administrador é obrigatório';
        isValid = false;
      }
      
      if (!condoData.adminPhone || condoData.adminPhone.replace(/\D/g, '').length < 10) {
        stepErrors.adminPhone = 'Telefone do administrador inválido';
        isValid = false;
      }
      
      if (!condoData.adminEmail || !isValidEmail(condoData.adminEmail)) {
        stepErrors.adminEmail = 'Email do administrador inválido';
        isValid = false;
      }
    } else if (step === 4) {
      // Validar plano de assinatura
      if (!condoData.selectedPlan) {
        stepErrors.selectedPlan = 'Selecione um plano';
        isValid = false;
      }
    } else if (step === 5) {
      // Validar documentos
      if (!condoData.documents.condoRegistration || condoData.documents.condoRegistration.length === 0) {
        stepErrors['documents.condoRegistration'] = 'Documento de registro do condomínio é obrigatório';
        isValid = false;
      }
    }
    
    setErrors(stepErrors);
    return isValid;
  };
  // Avançar para próxima etapa
  const nextStep = () => {
    if (validateStep()) {
      if (step < 5) {
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
  
  // Voltar para etapa anterior
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
  
  // Função para cancelar o cadastro e sair
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
                const userType = 'condo';
                
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
  

// Enviar formulário
const submitForm = async () => {
  try {
    setLoading(true);
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Processar uploads de documentos
    const uploadedDocuments = await processDocumentUploads();
    
    // Preparar dados para envio
    const condoProfileData = {
      // Dados básicos
      name: condoData.name,
      cnpj: condoData.cnpj.replace(/\D/g, ''),
      phone: condoData.phone.replace(/\D/g, ''),
      email: condoData.email,
      
      // Endereço
      address: condoData.address,
      addressDetails: condoData.addressDetails,
      placeId: condoData.placeId || '',
      
      // Informações do condomínio
      condoInfo: {
        blocks: parseInt(condoData.condoInfo.blocks) || 0,
        units: parseInt(condoData.condoInfo.units) || 0,
      },
      
      // Dados administrativos
      adminInfo: {
        name: condoData.adminName,
        phone: condoData.adminPhone.replace(/\D/g, ''),
        email: condoData.adminEmail
      },
      
      // Plano e assinatura
      subscription: {
        plan: condoData.selectedPlan,
        status: 'pending',
        startDate: null,
        endDate: null
      },
      
      // Documentos
      documents: uploadedDocuments,
      
      // Status e metadados
      status: 'pending_verification',
      verificationStatus: 'pending',
      profileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Atualizar documento do condomínio no Firestore
    await FirestoreService.updateDocument('condos', currentUser.uid, condoProfileData);
    
    // Atualizar perfil de usuário
    await updateProfile({
      displayName: condoData.name,
      profileComplete: true,
      status: 'pending_verification'
    });
    
    // Atualizar documento de usuário para consistência
    await FirestoreService.updateDocument('users', currentUser.uid, {
      displayName: condoData.name,
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
      'As informações do condomínio foram enviadas e estão em análise. Você receberá uma notificação quando o cadastro for aprovado.',
      [{ text: 'OK', onPress: () => navigation.navigate('CondoHome') }]
    );
  } catch (error) {
    console.error('Erro ao enviar formulário:', error);
    setError('Erro ao salvar seus dados. Tente novamente.');
    setShowError(true);
  } finally {
    setLoading(false);
  }
};

// Função auxiliar para processar uploads de documentos
const processDocumentUploads = async () => {
  // Similar à implementação para DriverRegisterScreen
  const uploadPromises = [];
  const documentPaths = {};
  
  for (const docType in condoData.documents) {
    if (condoData.documents[docType] && condoData.documents[docType].length > 0) {
      const docs = condoData.documents[docType];
      documentPaths[docType] = [];
      
      for (const doc of docs) {
        // Documento já enviado
        if (doc.url) {
          documentPaths[docType].push({
            path: doc.path,
            url: doc.url,
            type: doc.type || 'image/jpeg',
            name: doc.name || 'documento'
          });
          continue;
        }
        
        // Novo documento
        if (doc.uri) {
          const path = `documents/${currentUser.uid}/${docType}_${Date.now()}`;
          const uploadPromise = StorageService.uploadFile(path, doc.uri)
            .then(result => {
              documentPaths[docType].push({
                path: result.path,
                url: result.url,
                type: doc.type || 'image/jpeg',
                name: doc.name || 'documento'
              });
            });
          
          uploadPromises.push(uploadPromise);
        }
      }
    }
  }
  
  await Promise.all(uploadPromises);
  return documentPaths;
};
  // Obter título da etapa atual
  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Informações Básicas';
      case 2:
        return 'Endereço';
      case 3:
        return 'Dados Administrativos';
      case 4:
        return 'Plano de Assinatura';
      case 5:
        return 'Documentação';
      default:
        return '';
    }
  };// Renderizar formulário da etapa 1 (Informações Básicas)
const renderStep1 = () => (
  <View style={styles.stepContainer}>
    {/* CNPJ */}
    <View style={styles.inputContainer}>
      <TextInput
        label="CNPJ *"
        value={condoData.cnpj}
        onChangeText={(text) => updateCondoData('cnpj', maskCNPJ(text))}
        mode="outlined"
        error={!!errors.cnpj}
        style={styles.input}
        keyboardType="numeric"
        maxLength={18}
        placeholder="XX.XXX.XXX/XXXX-XX"
        left={<TextInput.Icon icon="card-account-details" />}
      />
      {errors.cnpj && <Text style={styles.errorText}>{errors.cnpj}</Text>}
    </View>
    
    {/* Telefone */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Telefone *"
        value={condoData.phone}
        onChangeText={(text) => updateCondoData('phone', maskPhone(text))}
        mode="outlined"
        error={!!errors.phone}
        style={styles.input}
        keyboardType="phone-pad"
        maxLength={15}
        placeholder="(00) 00000-0000"
        left={<TextInput.Icon icon="phone" />}
      />
      {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
    </View>
    
    {/* Email */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Email *"
        value={condoData.email}
        onChangeText={(text) => updateCondoData('email', text)}
        mode="outlined"
        error={!!errors.email}
        style={styles.input}
        keyboardType="email-address"
        autoCapitalize="none"
        placeholder="condominio@exemplo.com"
        left={<TextInput.Icon icon="email" />}
        disabled={!!userProfile?.email}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
    </View>
    
    <View style={styles.infoContainer}>
      <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
      <Text style={styles.infoText}>
        Estas informações serão utilizadas para identificar seu condomínio no aplicativo e para comunicações importantes.
      </Text>
    </View>
  </View>
);
  
// Renderizar formulário da etapa 2 (Endereço)
// Atualizar a função para lidar com a seleção do condomínio
const handleSelectCondo = (condo) => {
  if (condo) {
    console.log("Condomínio selecionado:", condo);
    
    // Atualizar dados básicos
    // Se for um novo condomínio, manter o nome que o usuário já digitou
    if (!condo.inSystem) {
      updateCondoData('address', condo.address || '');
    } else {
      // Se for condomínio existente, pegar nome e endereço dele
      updateCondoData('name', condo.name || condoData.name);
      updateCondoData('address', condo.address || '');
    }
    
    // Extrair e atualizar dados de endereço
    if (condo.address) {
      // Processar componentes de endereço
      let street = '';
      let number = '';
      let neighborhood = '';
      let city = '';
      let state = '';
      let postalCode = '';
      
      // Extrair componentes do endereço
      const addressParts = condo.address.split(',').map(part => part.trim());
      
      if (addressParts.length >= 1) {
        // Primeira parte geralmente é rua e número
        const firstPart = addressParts[0];
        const numberMatch = firstPart.match(/(\d+)/);
        
        if (numberMatch) {
          number = numberMatch[0];
          street = firstPart.replace(number, '').trim();
        } else {
          street = firstPart;
        }
      }
      
      if (addressParts.length >= 2) {
        // Segunda parte geralmente é o bairro
        neighborhood = addressParts[1];
      }
      
      if (addressParts.length >= 3) {
        // Terceira parte geralmente é cidade
        city = addressParts[2];
      }
      
      if (addressParts.length >= 4) {
        // Quarta parte geralmente é estado e CEP
        const lastPart = addressParts[addressParts.length - 1];
        const stateMatch = lastPart.match(/([A-Z]{2})/);
        const postalCodeMatch = lastPart.match(/\d{5}(-\d{3})?/);
        
        if (stateMatch) {
          state = stateMatch[1];
        }
        
        if (postalCodeMatch) {
          postalCode = postalCodeMatch[0];
        }
      }
      
      // Atualizar os campos de endereço
      updateCondoData('addressDetails.street', street);
      updateCondoData('addressDetails.number', number);
      updateCondoData('addressDetails.neighborhood', neighborhood);
      updateCondoData('addressDetails.city', city);
      updateCondoData('addressDetails.state', state);
      updateCondoData('addressDetails.postalCode', postalCode);
    }
    
    // Atualizar coordenadas se disponíveis
    if (condo.latitude && condo.longitude) {
      updateCondoData('addressDetails.latitude', condo.latitude);
      updateCondoData('addressDetails.longitude', condo.longitude);
    }
  }
};

// Renderizar formulário da etapa 2 (Endereço)
// Renderizar formulário da etapa 2 (Endereço)
const renderStep2 = () => (
  <View style={styles.stepContainer}>
    {/* Busca de endereço via Google Places */}
    <Text style={styles.sectionTitle}>Buscar endereço do condomínio *</Text>
    <Text style={styles.sectionSubtitle}>
      Procure o endereço exato do condomínio para facilitar o acesso de motoristas e entregadores
    </Text>
    
    <CondoAddressSearch
  initialValue={condoData.address}
  placeholder="Digite o endereço ou nome do condomínio"
  onSelectAddress={(addressData) => {
    if (addressData) {
      console.log("Endereço selecionado:", addressData);
      
      // Se for um condomínio existente, alerta o usuário
      if (addressData.existingCondo) {
        Alert.alert(
          "Condomínio já cadastrado",
          "Este condomínio já está cadastrado em nosso sistema. Por favor, realize o login ou cadastre outro condomínio.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Limpar campos existentes antes de preencher novos valores
      // Isso garante que os campos sejam atualizados mesmo quando já têm valores
      updateCondoData('address', '');
      updateCondoData('name', '');
      updateCondoData('addressDetails.street', '');
      updateCondoData('addressDetails.number', '');
      updateCondoData('addressDetails.neighborhood', '');
      updateCondoData('addressDetails.city', '');
      updateCondoData('addressDetails.state', '');
      updateCondoData('addressDetails.postalCode', '');
      updateCondoData('addressDetails.latitude', null);
      updateCondoData('addressDetails.longitude', null);
      updateCondoData('placeId', '');
      
      // Pequeno atraso para garantir que os campos foram limpos antes de preencher novos valores
      setTimeout(() => {
        // Atualizar dados de endereço
        updateCondoData('address', addressData.formattedAddress || '');
        updateCondoData('addressDetails.street', addressData.street || '');
        updateCondoData('addressDetails.number', addressData.number || '');
        updateCondoData('addressDetails.neighborhood', addressData.neighborhood || '');
        updateCondoData('addressDetails.city', addressData.city || '');
        updateCondoData('addressDetails.state', addressData.state || '');
        updateCondoData('addressDetails.postalCode', addressData.postalCode || '');
        
        // Atualizar coordenadas e placeId (para referência futura)
        if (addressData.latitude && addressData.longitude) {
          updateCondoData('addressDetails.latitude', addressData.latitude);
          updateCondoData('addressDetails.longitude', addressData.longitude);
        }
        
        if (addressData.placeId) {
          updateCondoData('placeId', addressData.placeId);
        }
        
        // Atualizar o nome do condomínio com o nome sugerido
        if (addressData.suggestedName) {
          updateCondoData('name', addressData.suggestedName);
        }
      }, 10);
    }
  }}
  style={styles.addressSearch}
/>
    {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
    
    {/* Exibir endereço selecionado */}
    {condoData.address && (
      <View style={styles.selectedAddressContainer}>
        <MaterialCommunityIcons name="map-marker" size={24} color={theme.colors.primary} />
        <View style={styles.selectedAddressDetails}>
          <Text style={styles.selectedAddressText}>{condoData.address}</Text>
        </View>
      </View>
    )}
    
    {/* Nome do condomínio */}
    <View style={styles.inputContainer}>
      <TextInput
        label="Nome do condomínio *"
        value={condoData.name}
        onChangeText={(text) => updateCondoData('name', text)}
        mode="outlined"
        error={!!errors.name}
        style={styles.input}
        placeholder="Nome do condomínio"
        left={<TextInput.Icon icon="office-building" />}
      />
      {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
    </View>
    
    {/* Campos de endereço detalhado */}
    <Divider style={styles.divider} />
    
    <Text style={styles.sectionTitle}>Detalhes do endereço</Text>
    <Text style={styles.sectionSubtitle}>
      Confirme ou complete as informações abaixo
    </Text>
    
    <View style={styles.rowContainer}>
      <View style={[styles.inputContainer, { flex: 3, marginRight: 8 }]}>
        <TextInput
          label="Rua/Avenida *"
          value={condoData.addressDetails.street}
          onChangeText={(text) => updateCondoData('addressDetails.street', text)}
          mode="outlined"
          error={!!errors['addressDetails.street']}
          style={styles.input}
          left={<TextInput.Icon icon="road" />}
        />
        {errors['addressDetails.street'] && <Text style={styles.errorText}>{errors['addressDetails.street']}</Text>}
      </View>
      
      <View style={[styles.inputContainer, { flex: 1 }]}>
        <TextInput
          label="Número *"
          value={condoData.addressDetails.number}
          onChangeText={(text) => updateCondoData('addressDetails.number', text)}
          mode="outlined"
          error={!!errors['addressDetails.number']}
          style={styles.input}
          keyboardType="numeric"
          left={<TextInput.Icon icon="numeric" />}
        />
        {errors['addressDetails.number'] && <Text style={styles.errorText}>{errors['addressDetails.number']}</Text>}
      </View>
    </View>
    
    <View style={styles.rowContainer}>
      <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
        <TextInput
          label="Bairro *"
          value={condoData.addressDetails.neighborhood}
          onChangeText={(text) => updateCondoData('addressDetails.neighborhood', text)}
          mode="outlined"
          error={!!errors['addressDetails.neighborhood']}
          style={styles.input}
          left={<TextInput.Icon icon="home-city" />}
        />
        {errors['addressDetails.neighborhood'] && <Text style={styles.errorText}>{errors['addressDetails.neighborhood']}</Text>}
      </View>
      
      <View style={[styles.inputContainer, { flex: 1 }]}>
        <TextInput
          label="CEP"
          value={condoData.addressDetails.postalCode}
          onChangeText={(text) => updateCondoData('addressDetails.postalCode', maskCEP(text))}
          mode="outlined"
          error={!!errors['addressDetails.postalCode']}
          style={styles.input}
          keyboardType="numeric"
          maxLength={9}
          left={<TextInput.Icon icon="map-marker" />}
        />
        {errors['addressDetails.postalCode'] && <Text style={styles.errorText}>{errors['addressDetails.postalCode']}</Text>}
      </View>
    </View>
    
    <View style={styles.rowContainer}>
      <View style={[styles.inputContainer, { flex: 2, marginRight: 8 }]}>
        <TextInput
          label="Cidade *"
          value={condoData.addressDetails.city}
          onChangeText={(text) => updateCondoData('addressDetails.city', text)}
          mode="outlined"
          error={!!errors['addressDetails.city']}
          style={styles.input}
          left={<TextInput.Icon icon="city" />}
        />
        {errors['addressDetails.city'] && <Text style={styles.errorText}>{errors['addressDetails.city']}</Text>}
      </View>
      
      <View style={[styles.inputContainer, { flex: 1 }]}>
        <TextInput
          label="Estado *"
          value={condoData.addressDetails.state}
          onChangeText={(text) => updateCondoData('addressDetails.state', text)}
          mode="outlined"
          error={!!errors['addressDetails.state']}
          style={styles.input}
          maxLength={2}
          autoCapitalize="characters"
          left={<TextInput.Icon icon="map" />}
        />
        {errors['addressDetails.state'] && <Text style={styles.errorText}>{errors['addressDetails.state']}</Text>}
      </View>
    </View>
    
    {/* Informações do condomínio */}
    <Divider style={styles.divider} />
    
    <Text style={styles.sectionTitle}>Informações do condomínio</Text>
    <Text style={styles.sectionSubtitle}>
      Informe o número de blocos e unidades do seu condomínio
    </Text>
    
    <View style={styles.rowContainer}>
      <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
        <TextInput
          label="Número de blocos/torres *"
          value={condoData.condoInfo.blocks}
          onChangeText={(text) => updateCondoData('condoInfo.blocks', text)}
          mode="outlined"
          error={!!errors['condoInfo.blocks']}
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ex: 4"
          left={<TextInput.Icon icon="office-building-marker" />}
        />
        {errors['condoInfo.blocks'] && <Text style={styles.errorText}>{errors['condoInfo.blocks']}</Text>}
      </View>
      
      <View style={[styles.inputContainer, { flex: 1 }]}>
        <TextInput
          label="Número de unidades *"
          value={condoData.condoInfo.units}
          onChangeText={(text) => updateCondoData('condoInfo.units', text)}
          mode="outlined"
          error={!!errors['condoInfo.units']}
          style={styles.input}
          keyboardType="numeric"
          placeholder="Ex: 120"
          left={<TextInput.Icon icon="door" />}
        />
        {errors['condoInfo.units'] && <Text style={styles.errorText}>{errors['condoInfo.units']}</Text>}
      </View>
    </View>
    
    <View style={styles.infoContainer}>
      <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
      <Text style={styles.infoText}>
        Estas informações ajudarão a configurar seu condomínio de forma adequada no sistema e facilitarão o acesso dos moradores.
      </Text>
    </View>
  </View>
);
  // Renderizar formulário da etapa 3 (Dados Administrativos)
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Dados do Administrador/Síndico</Text>
      <Text style={styles.sectionSubtitle}>
        Informe os dados da pessoa responsável pela administração do condomínio
      </Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          label="Nome do administrador *"
          value={condoData.adminName}
          onChangeText={(text) => updateCondoData('adminName', text)}
          mode="outlined"
          error={!!errors.adminName}
          style={styles.input}
          placeholder="Nome completo"
          left={<TextInput.Icon icon="account" />}
        />
        {errors.adminName && <Text style={styles.errorText}>{errors.adminName}</Text>}
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          label="Telefone do administrador *"
          value={condoData.adminPhone}
          onChangeText={(text) => updateCondoData('adminPhone', maskPhone(text))}
          mode="outlined"
          error={!!errors.adminPhone}
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={15}
          placeholder="(00) 00000-0000"
          left={<TextInput.Icon icon="phone" />}
        />
        {errors.adminPhone && <Text style={styles.errorText}>{errors.adminPhone}</Text>}
      </View>
      
      <View style={styles.inputContainer}>
        <TextInput
          label="Email do administrador *"
          value={condoData.adminEmail}
          onChangeText={(text) => updateCondoData('adminEmail', text)}
          mode="outlined"
          error={!!errors.adminEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="admin@exemplo.com"
          left={<TextInput.Icon icon="email" />}
        />
        {errors.adminEmail && <Text style={styles.errorText}>{errors.adminEmail}</Text>}
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 4 (Plano de Assinatura)
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Escolha seu plano</Text>
      <Text style={styles.sectionSubtitle}>
        Selecione o plano que melhor atende às necessidades do seu condomínio
      </Text>
      
      {loadingPlans ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando planos disponíveis...</Text>
        </View>
      ) : (
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plansContainer}
        >
          {availablePlans.map((plan) => (
            <TouchableOpacity
              key={plan.id}
              onPress={() => updateCondoData('selectedPlan', plan.id)}
            >
              <Card 
                style={[
                  styles.planCard, 
                  condoData.selectedPlan === plan.id && styles.selectedPlanCard,
                  plan.id === 'premium' && { borderColor: '#4CAF50' }
                ]}
              >
                <Card.Content style={styles.planCardContent}>
                  {plan.id === 'premium' && (
                    <View style={[styles.planBadge, { backgroundColor: '#4CAF50' }]}>
                      <Text style={styles.planBadgeText}>Recomendado</Text>
                    </View>
                  )}
                                  
                  <Text style={styles.planTitle}>{plan.name}</Text>
                  <Text style={styles.planPrice}>
                    {plan.price === 0 ? 'Gratuito' : `R$ ${plan.price.toFixed(2)}`}
                  </Text>
                  <Text style={styles.planPeriod}>{plan.price > 0 ? 'por mês' : ''}</Text>
                  
                  <Divider style={styles.planDivider} />
                  
                  <View style={styles.featuresContainer}>
                    {plan.features.map((feature, index) => (
                      <View key={index} style={styles.planFeatureItem}>
                        <MaterialCommunityIcons
                          name="check-circle" 
                          size={16} 
                          color={plan.id === 'premium' ? '#4CAF50' : theme.colors.primary}
                        />
                        <Text style={styles.planFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                </Card.Content>
              </Card>  
              {errors.selectedPlan && <Text style={styles.errorText}>{errors.selectedPlan}</Text>}            
            </TouchableOpacity>     
                   
          ))}
          
        </ScrollView>
      )}
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Você poderá alterar seu plano a qualquer momento nas configurações do condomínio.
          O plano selecionado só será ativado após a aprovação do cadastro.
        </Text>
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 5 (Documentação)
  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Documentação</Text>
      <Text style={styles.sectionSubtitle}>
        Envie os documentos necessários para verificação do cadastro
      </Text>
      
      {/* Documento de registro do condomínio */}
      <DocumentUpload
        title="Documento de registro do condomínio *"
        subtitle="CNPJ, contrato social ou documento equivalente"
        documentType="condoRegistration"
        initialDocuments={condoData.documents.condoRegistration}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('condoRegistration', docs)}
        maxDocuments={2}
        required
      />
      {errors['documents.condoRegistration'] && <Text style={styles.errorText}>{errors['documents.condoRegistration']}</Text>}
      
      {/* Documento do administrador */}
      <DocumentUpload
        title="Documento do administrador"
        subtitle="RG, CNH ou documento com foto (opcional)"
        documentType="adminDocument"
        initialDocuments={condoData.documents.adminDocument}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('adminDocument', docs)}
        maxDocuments={2}
      />
      
      {/* Foto do condomínio */}
      <DocumentUpload
        title="Foto do condomínio"
        subtitle="Foto da fachada ou área comum (opcional)"
        documentType="condoPhoto"
        initialDocuments={condoData.documents.condoPhoto}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('condoPhoto', docs)}
        maxDocuments={2}
      />
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
      case 5:
        return renderStep5();
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
  addressSearchContainer: {
    marginBottom: 16,
  },
  selectedAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedAddressDetails: {
    marginLeft: 12,
    flex: 1,
  },
  selectedAddressText: {
    fontSize: 14,
    color: '#212121',
  },
  plansContainer: {
    paddingVertical: 8,
  },
  planCard: {
    width: 240,
    marginRight: 16,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  selectedPlanCard: {
    borderColor: '#1E88E5',
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
  condoSearchContainer: {
    marginBottom: 24,
  },
  condoSearch: {
    flex: 1,
  },
  selectedCondoCard: {
    marginBottom: 16,
    elevation: 2,
  },
  selectedCondoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCondoDetails: {
    marginLeft: 12,
    flex: 1,
  },
  selectedCondoName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  selectedCondoAddress: {
    fontSize: 14,
    color: '#757575',
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
  addressSearch: {
    marginBottom: 16,
  },
  selectedAddressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  selectedAddressDetails: {
    marginLeft: 12,
    flex: 1,
  },
  selectedAddressText: {
    fontSize: 14,
    color: '#212121',
  },
  divider: {
    marginVertical: 16,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 200,
  },
  loadingText: {
    marginTop: 12,
    color: '#757575',
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