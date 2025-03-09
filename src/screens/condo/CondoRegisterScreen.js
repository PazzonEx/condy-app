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
  Image
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
  Card,
  RadioButton
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
  const { currentUser, userProfile, updateProfile , setUserProfile} = useAuth();
  
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
    // Dados do condomínio
    name: userProfile?.displayName || '',
    cnpj: '',
    phone: '',
    email: userProfile?.email || '',
    
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
    
    // Informações extras
    totalUnits: '',
    totalBlocks: '',
    
    // Administrador/Síndico
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    
    // Documentos
    documents: {
      condoRegistration: [],
      condoPhoto: [],
      condoLogo: [],
    },
    
    // Plano selecionado
    selectedPlan: 'free',
    
    // Features ativas
    features: {
      qrCodeAccess: true,
      emailNotifications: true,
      pushNotifications: true,
      accessHistory: true,
      residentVerification: true
    }
  });
  
  // Erros de validação
  const [errors, setErrors] = useState({});
  
  // Carregar planos disponíveis
  useEffect(() => {
    loadAvailablePlans();
  }, []);
  
  // Carregar planos
  const loadAvailablePlans = async () => {
    try {
      setLoadingPlans(true);
      const plans = await PaymentService.getAllPlans();
      setAvailablePlans(plans);
    } catch (error) {
      console.error('Erro ao carregar planos:', error);
    } finally {
      setLoadingPlans(false);
    }
  };
  
  // Efeito para monitorar teclado
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
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
      'keyboardDidHide',
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
  
  // Atualizar dados do formulário
  const updateCondoData = (field, value) => {
    setCondoData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };
  
  // Atualizar dados de endereço
  const updateAddressDetails = (field, value) => {
    setCondoData(prev => ({
      ...prev,
      addressDetails: {
        ...prev.addressDetails,
        [field]: value
      }
    }));
    
    // Limpar erro do campo
    if (errors[`addressDetails.${field}`]) {
      setErrors(prev => ({ ...prev, [`addressDetails.${field}`]: null }));
    }
  };
  
  // Atualizar features do condomínio
  const toggleFeature = (key) => {
    setCondoData(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key]
      }
    }));
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
  
  // Selecionar endereço do Google Places
  const handleSelectAddress = (addressData) => {
    if (!addressData) {
      updateCondoData('address', '');
      return;
    }
    
    const components = addressData.components || {};
    
    updateCondoData('address', addressData.formattedAddress);
    
    setCondoData(prev => ({
      ...prev,
      addressDetails: {
        ...prev.addressDetails,
        street: components.street || '',
        number: components.number || '',
        neighborhood: components.neighborhood || '',
        city: components.city || '',
        state: components.state || '',
        postalCode: components.postalCode || '',
        latitude: addressData.latitude || null,
        longitude: addressData.longitude || null
      }
    }));
  };
  
  // Validar etapa atual
  const validateStep = () => {
    let stepErrors = {};
    let isValid = true;
    
    if (step === 1) {
      // Validar dados do condomínio
      if (!condoData.name.trim()) {
        stepErrors.name = 'Nome do condomínio é obrigatório';
        isValid = false;
      }
      
      if (!condoData.cnpj.trim() || !isValidCNPJ(condoData.cnpj)) {
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
      // Validar endereço
      if (!condoData.address) {
        stepErrors.address = 'Endereço é obrigatório';
        isValid = false;
      }
      
      if (!condoData.addressDetails.number) {
        stepErrors['addressDetails.number'] = 'Número é obrigatório';
        isValid = false;
      }
      
      if (!condoData.addressDetails.city) {
        stepErrors['addressDetails.city'] = 'Cidade é obrigatória';
        isValid = false;
      }
      
      if (!condoData.addressDetails.state) {
        stepErrors['addressDetails.state'] = 'Estado é obrigatório';
        isValid = false;
      }
      
      // Validar informações extras
      if (!condoData.totalUnits) {
        stepErrors.totalUnits = 'Total de unidades é obrigatório';
        isValid = false;
      }
      
      if (!condoData.totalBlocks) {
        stepErrors.totalBlocks = 'Total de blocos é obrigatório';
        isValid = false;
      }
    } else if (step === 3) {
      // Validar responsável
      if (!condoData.managerName.trim()) {
        stepErrors.managerName = 'Nome do responsável é obrigatório';
        isValid = false;
      }
      
      if (!condoData.managerPhone || condoData.managerPhone.replace(/\D/g, '').length < 10) {
        stepErrors.managerPhone = 'Telefone do responsável inválido';
        isValid = false;
      }
      
      if (!condoData.managerEmail || !isValidEmail(condoData.managerEmail)) {
        stepErrors.managerEmail = 'Email do responsável inválido';
        isValid = false;
      }
    } else if (step === 4) {
      // Validar documentos
      if (!condoData.documents.condoRegistration || condoData.documents.condoRegistration.length === 0) {
        stepErrors['documents.condoRegistration'] = 'Registro do condomínio é obrigatório';
        isValid = false;
      }
      
      if (!condoData.documents.condoPhoto || condoData.documents.condoPhoto.length === 0) {
        stepErrors['documents.condoPhoto'] = 'Foto do condomínio é obrigatória';
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
        if (scrollViewRef.current && scrollViewRef.current.scrollToPosition) {
          scrollViewRef.current.scrollToPosition(0, 0);
        } else if (scrollViewRef.current && scrollViewRef.current.scrollTo) {
          scrollViewRef.current.scrollTo({ y: 0, animated: true });
        } else {
          console.log('Método de rolagem não disponível');
        }
      } else {
        submitForm();
      }
    } else {
      // Mostrar erro
      setError('Corrija os erros antes de continuar');
      setShowError(true);
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
      if (scrollViewRef.current && scrollViewRef.current.scrollToPosition) {
        scrollViewRef.current.scrollToPosition(0, 0);
      } else if (scrollViewRef.current && scrollViewRef.current.scrollTo) {
        scrollViewRef.current.scrollTo({ y: 0, animated: true });
      } else {
        console.log('Método de rolagem não disponível');
      }
    } else {
      navigation.goBack();
    }
  };
  
  // Enviar formulário
// Para a tela CondoRegisterScreen.js
const submitForm = async () => {
  try {
    setLoading(true);
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Preparar dados para envio
    const condoProfileData = {
      condoData: {
        name: condoData.name,
        cnpj: condoData.cnpj.replace(/\D/g, ''),
        phone: condoData.phone.replace(/\D/g, ''),
        email: condoData.email
      },
      addressData: {
        fullAddress: condoData.address,
        ...condoData.addressDetails
      },
      condoInfo: {
        totalUnits: parseInt(condoData.totalUnits) || 0,
        totalBlocks: parseInt(condoData.totalBlocks) || 0
      },
      managerData: {
        name: condoData.managerName,
        phone: condoData.managerPhone.replace(/\D/g, ''),
        email: condoData.managerEmail
      },
      documents: condoData.documents,
      subscription: {
        plan: condoData.selectedPlan,
        features: condoData.features
      },
      status: 'pending_verification',
      verificationStatus: 'pending',
      profileComplete: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    // Atualizar documento do condomínio no Firestore
    await FirestoreService.updateDocument('condos', currentUser.uid, condoProfileData);
    
    // Atualizar perfil geral
    await updateProfile({
      displayName: condoData.name,
      profileComplete: true,
      status: 'pending_verification'
    });
    console.log('Perfil atualizado com sucesso?', updateProfile);
    
    // Forçar uma atualização no perfil do usuário
    // Este é um hack para garantir que a navegação reconheça a mudança
    const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
    setUserProfile({
      ...userProfile,
      ...userDoc,
      profileComplete: true,
      status: 'pending_verification'
    });
    
    // Mostrar mensagem de sucesso e então recarregar a aplicação
    Alert.alert(
      'Cadastro Enviado',
      'Suas informações foram enviadas e estão em análise. Por favor, aguarde a aprovação do seu condomínio.',
      [{ 
        text: 'OK', 
        onPress: () => {
          // Você pode implementar alguma lógica de recarregamento de aplicativo aqui
          // Por exemplo, usando React Navigation para resetar a navegação
          navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }], // Nome da sua rota principal que avalia o estado de login
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
  
  // Obter título da etapa atual
  const getStepTitle = () => {
    switch (step) {
      case 1:
        return 'Dados do Condomínio';
      case 2:
        return 'Localização';
      case 3:
        return 'Responsável/Síndico';
      case 4:
        return 'Documentação';
      case 5:
        return 'Plano e Recursos';
      default:
        return '';
    }
  };
  
  // Renderizar formulário da etapa 1
  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      {/* Nome do condomínio */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Nome do condomínio *"
          value={condoData.name}
          onChangeText={(text) => updateCondoData('name', text)}
          mode="outlined"
          error={!!errors.name}
          style={styles.input}
          placeholder="Ex: Residencial Jardim das Flores"
          left={<TextInput.Icon icon="office-building" />}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>
      
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
          placeholder="00.000.000/0000-00"
          left={<TextInput.Icon icon="file-document-outline" />}
        />
        {errors.cnpj && <Text style={styles.errorText}>{errors.cnpj}</Text>}
      </View>
      
      {/* Telefone */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Telefone do condomínio *"
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
          label="Email de contato *"
          value={condoData.email}
          onChangeText={(text) => updateCondoData('email', text)}
          mode="outlined"
          error={!!errors.email}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="contato@seucondominio.com"
          left={<TextInput.Icon icon="email" />}
          disabled={!!userProfile?.email}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Estas informações serão usadas para gerar faturas e para contato administrativo. Certifique-se de que estão corretas.
        </Text>
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 2
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* Endereço completo */}
      <View style={styles.inputContainer}>
        <AddressAutocomplete
          label="Endereço do condomínio *"
          value={condoData.address}
          onSelect={handleSelectAddress}
          error={errors.address}
          required
        />
      </View>
      
      {/* Número */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Número *"
          value={condoData.addressDetails.number}
          onChangeText={(text) => updateAddressDetails('number', text)}
          mode="outlined"
          error={!!errors['addressDetails.number']}
          style={styles.input}
          keyboardType="numeric"
          placeholder="Número"
          left={<TextInput.Icon icon="pound" />}
        />
        {errors['addressDetails.number'] && (
          <Text style={styles.errorText}>{errors['addressDetails.number']}</Text>
        )}
      </View>
      
      {/* Complemento */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Complemento"
          value={condoData.addressDetails.complement}
          onChangeText={(text) => updateAddressDetails('complement', text)}
          mode="outlined"
          style={styles.input}
          placeholder="Complemento (opcional)"
          left={<TextInput.Icon icon="information-outline" />}
        />
      </View>
      
      <View style={styles.rowContainer}>
        {/* Cidade */}
        <View style={[styles.inputContainer, { flex: 2, marginRight: 8 }]}>
          <TextInput
            label="Cidade *"
            value={condoData.addressDetails.city}
            onChangeText={(text) => updateAddressDetails('city', text)}
            mode="outlined"
            error={!!errors['addressDetails.city']}
            style={styles.input}
            placeholder="Cidade"
            left={<TextInput.Icon icon="city" />}
          />
          {errors['addressDetails.city'] && (
            <Text style={styles.errorText}>{errors['addressDetails.city']}</Text>
          )}
        </View>
        
        {/* Estado */}
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <TextInput
            label="Estado *"
            value={condoData.addressDetails.state}
            onChangeText={(text) => updateAddressDetails('state', text)}
            mode="outlined"
            error={!!errors['addressDetails.state']}
            style={styles.input}
            placeholder="UF"
            left={<TextInput.Icon icon="map-marker" />}
            maxLength={2}
            autoCapitalize="characters"
          />
          {errors['addressDetails.state'] && (
            <Text style={styles.errorText}>{errors['addressDetails.state']}</Text>
          )}
        </View>
      </View>
      
      {/* CEP */}
      <View style={styles.inputContainer}>
        <TextInput
          label="CEP"
          value={condoData.addressDetails.postalCode}
          onChangeText={(text) => updateAddressDetails('postalCode', maskCEP(text))}
          mode="outlined"
          style={styles.input}
          keyboardType="numeric"
          maxLength={9}
          placeholder="00000-000"
          left={<TextInput.Icon icon="map-marker-radius" />}
        />
      </View>
      
      <Divider style={styles.divider} />
      
      <Text style={styles.sectionTitle}>Informações do condomínio</Text>
      
      <View style={styles.rowContainer}>
        {/* Total de unidades */}
        <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
          <TextInput
            label="Total de unidades *"
            value={condoData.totalUnits}
            onChangeText={(text) => updateCondoData('totalUnits', text.replace(/\D/g, ''))}
            mode="outlined"
            error={!!errors.totalUnits}
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ex: 100"
            left={<TextInput.Icon icon="home" />}
          />
          {errors.totalUnits && <Text style={styles.errorText}>{errors.totalUnits}</Text>}
        </View>
        
        {/* Total de blocos */}
        <View style={[styles.inputContainer, { flex: 1 }]}>
          <TextInput
            label="Total de blocos *"
            value={condoData.totalBlocks}
            onChangeText={(text) => updateCondoData('totalBlocks', text.replace(/\D/g, ''))}
            mode="outlined"
            error={!!errors.totalBlocks}
            style={styles.input}
            keyboardType="numeric"
            placeholder="Ex: 4"
            left={<TextInput.Icon icon="office-building" />}
          />
          {errors.totalBlocks && <Text style={styles.errorText}>{errors.totalBlocks}</Text>}
        </View>
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 3
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      {/* Nome do responsável */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Nome do responsável/síndico *"
          value={condoData.managerName}
          onChangeText={(text) => updateCondoData('managerName', text)}
          mode="outlined"
          error={!!errors.managerName}
          style={styles.input}
          placeholder="Nome completo"
          left={<TextInput.Icon icon="account" />}
        />
        {errors.managerName && <Text style={styles.errorText}>{errors.managerName}</Text>}
      </View>
      
      {/* Telefone do responsável */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Telefone do responsável *"
          value={condoData.managerPhone}
          onChangeText={(text) => updateCondoData('managerPhone', maskPhone(text))}
          mode="outlined"
          error={!!errors.managerPhone}
          style={styles.input}
          keyboardType="phone-pad"
          maxLength={15}
          placeholder="(00) 00000-0000"
          left={<TextInput.Icon icon="phone" />}
        />
        {errors.managerPhone && <Text style={styles.errorText}>{errors.managerPhone}</Text>}
      </View>
      
      {/* Email do responsável */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Email do responsável *"
          value={condoData.managerEmail}
          onChangeText={(text) => updateCondoData('managerEmail', text)}
          mode="outlined"
          error={!!errors.managerEmail}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="email@exemplo.com"
          left={<TextInput.Icon icon="email" />}
        />
        {errors.managerEmail && <Text style={styles.errorText}>{errors.managerEmail}</Text>}
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="shield-account" size={20} color="#757575" />
        <Text style={styles.infoText}>
          O responsável terá acesso a todas as funcionalidades administrativas do sistema e receberá notificações importantes.
        </Text>
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 4
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      {/* Registro do condomínio */}
      <DocumentUpload
        title="Registro do condomínio"
        subtitle="Documentação oficial do condomínio (CNPJ, Convenção, etc.)"
        documentType="condoRegistration"
        initialDocuments={condoData.documents.condoRegistration}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('condoRegistration', docs)}
        maxDocuments={3}
        required
      />
      {errors['documents.condoRegistration'] && (
        <Text style={styles.errorText}>{errors['documents.condoRegistration']}</Text>
      )}
      
      {/* Foto do condomínio */}
      <DocumentUpload
        title="Foto da fachada"
        subtitle="Uma foto clara da fachada do condomínio para identificação"
        documentType="condoPhoto"
        initialDocuments={condoData.documents.condoPhoto}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('condoPhoto', docs)}
        maxDocuments={1}
        required
      />
      {errors['documents.condoPhoto'] && (
        <Text style={styles.errorText}>{errors['documents.condoPhoto']}</Text>
      )}
      
      {/* Logo do condomínio */}
      <DocumentUpload
        title="Logo do condomínio"
        subtitle="Logo ou símbolo do condomínio (opcional)"
        documentType="condoLogo"
        initialDocuments={condoData.documents.condoLogo}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('condoLogo', docs)}
        maxDocuments={1}
      />
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Os documentos serão analisados para verificar a legitimidade do condomínio e acelerar o processo de aprovação.
        </Text>
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 5
  const renderStep5 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.sectionTitle}>Escolha seu plano</Text>
      
      {/* Lista de planos */}
      {loadingPlans ? (
        <View style={styles.loadingContainer}>
          <Text>Carregando planos disponíveis...</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.plansContainer}>
          {/* Plano Gratuito */}
          <Card 
            style={[
              styles.planCard, 
              condoData.selectedPlan === 'free' && styles.selectedPlanCard
            ]}
            onPress={() => updateCondoData('selectedPlan', 'free')}
          >
            <Card.Content style={styles.planCardContent}>
              <View style={[styles.planBadge, { backgroundColor: '#4CAF50' }]}>
                <Text style={styles.planBadgeText}>Grátis</Text>
              </View>
              <Text style={styles.planTitle}>Plano Gratuito</Text>
              <Text style={styles.planPrice}>R$ 0,00</Text>
              <Text style={styles.planPeriod}>para sempre</Text>
              
              <Divider style={styles.planDivider} />
              
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                <Text style={styles.planFeatureText}>Até 5 solicitações por mês</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                <Text style={styles.planFeatureText}>Acesso para até 10 moradores</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                <Text style={styles.planFeatureText}>Histórico por 7 dias</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#4CAF50" />
                <Text style={styles.planFeatureText}>Suporte básico por email</Text>
              </View>
              
              <View style={styles.planButtonContainer}>
                <Button 
                  mode={condoData.selectedPlan === 'free' ? 'contained' : 'outlined'}
                  onPress={() => updateCondoData('selectedPlan', 'free')}
                  style={styles.planButton}
                >
                  {condoData.selectedPlan === 'free' ? 'Selecionado' : 'Selecionar'}
                </Button>
              </View>
            </Card.Content>
          </Card>
          
          {/* Plano Básico */}
          <Card 
            style={[
              styles.planCard, 
              condoData.selectedPlan === 'basic' && styles.selectedPlanCard,
              { borderColor: '#2196F3' }
            ]}
            onPress={() => updateCondoData('selectedPlan', 'basic')}
          >
            <Card.Content style={styles.planCardContent}>
              <View style={[styles.planBadge, { backgroundColor: '#2196F3' }]}>
                <Text style={styles.planBadgeText}>Popular</Text>
              </View>
              <Text style={styles.planTitle}>Plano Básico</Text>
              <Text style={styles.planPrice}>R$ 99,90</Text>
              <Text style={styles.planPeriod}>por mês</Text>
              
              <Divider style={styles.planDivider} />
              
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#2196F3" />
                <Text style={styles.planFeatureText}>Até 50 solicitações por mês</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#2196F3" />
                <Text style={styles.planFeatureText}>Acesso para até 50 unidades</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#2196F3" />
                <Text style={styles.planFeatureText}>Histórico por 30 dias</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#2196F3" />
                <Text style={styles.planFeatureText}>Suporte prioritário</Text>
              </View>
              
              <View style={styles.planButtonContainer}>
                <Button 
                  mode={condoData.selectedPlan === 'basic' ? 'contained' : 'outlined'}
                  onPress={() => updateCondoData('selectedPlan', 'basic')}
                  style={[styles.planButton, { backgroundColor: condoData.selectedPlan === 'basic' ? '#2196F3' : 'transparent' }]}
                >
                  {condoData.selectedPlan === 'basic' ? 'Selecionado' : 'Selecionar'}
                </Button>
              </View>
            </Card.Content>
          </Card>
          
          {/* Plano Premium */}
          <Card 
            style={[
              styles.planCard, 
              condoData.selectedPlan === 'premium' && styles.selectedPlanCard,
              { borderColor: '#9C27B0' }
            ]}
            onPress={() => updateCondoData('selectedPlan', 'premium')}
          >
            <Card.Content style={styles.planCardContent}>
              <View style={[styles.planBadge, { backgroundColor: '#9C27B0' }]}>
                <Text style={styles.planBadgeText}>Premium</Text>
              </View>
              <Text style={styles.planTitle}>Plano Premium</Text>
              <Text style={styles.planPrice}>R$ 199,90</Text>
              <Text style={styles.planPeriod}>por mês</Text>
              
              <Divider style={styles.planDivider} />
              
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#9C27B0" />
                <Text style={styles.planFeatureText}>Solicitações ilimitadas</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#9C27B0" />
                <Text style={styles.planFeatureText}>Unidades ilimitadas</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#9C27B0" />
                <Text style={styles.planFeatureText}>Histórico completo</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#9C27B0" />
                <Text style={styles.planFeatureText}>Suporte 24/7</Text>
              </View>
              <View style={styles.planFeatureItem}>
                <MaterialCommunityIcons name="check" size={16} color="#9C27B0" />
                <Text style={styles.planFeatureText}>Relatórios avançados</Text>
              </View>
              
              <View style={styles.planButtonContainer}>
                <Button 
                  mode={condoData.selectedPlan === 'premium' ? 'contained' : 'outlined'}
                  onPress={() => updateCondoData('selectedPlan', 'premium')}
                  style={[styles.planButton, { backgroundColor: condoData.selectedPlan === 'premium' ? '#9C27B0' : 'transparent' }]}
                >
                  {condoData.selectedPlan === 'premium' ? 'Selecionado' : 'Selecionar'}
                </Button>
              </View>
            </Card.Content>
          </Card>
        </ScrollView>
      )}
      
      <Divider style={styles.divider} />
      
      <Text style={styles.sectionTitle}>Recursos ativos</Text>
      <Text style={styles.sectionSubtitle}>Selecione quais recursos você deseja utilizar</Text>
      
      <View style={styles.featuresContainer}>
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Acesso por QR Code</Text>
            <Text style={styles.preferenceDescription}>
              Permitir acesso via QR Code para motoristas
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              condoData.features.qrCodeAccess && styles.toggleButtonActive
            ]}
            onPress={() => toggleFeature('qrCodeAccess')}
          >
            <View style={[
              styles.toggleDot,
              condoData.features.qrCodeAccess && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Notificações por Email</Text>
            <Text style={styles.preferenceDescription}>
              Receber alertas por email para novas solicitações
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              condoData.features.emailNotifications && styles.toggleButtonActive
            ]}
            onPress={() => toggleFeature('emailNotifications')}
          >
            <View style={[
              styles.toggleDot,
              condoData.features.emailNotifications && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Notificações Push</Text>
            <Text style={styles.preferenceDescription}>
              Receber alertas em tempo real no aplicativo
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              condoData.features.pushNotifications && styles.toggleButtonActive
            ]}
            onPress={() => toggleFeature('pushNotifications')}
          >
            <View style={[
              styles.toggleDot,
              condoData.features.pushNotifications && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Histórico de Acesso</Text>
            <Text style={styles.preferenceDescription}>
              Manter histórico detalhado de acessos ao condomínio
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              condoData.features.accessHistory && styles.toggleButtonActive
            ]}
            onPress={() => toggleFeature('accessHistory')}
          >
            <View style={[
              styles.toggleDot,
              condoData.features.accessHistory && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Verificação de Moradores</Text>
            <Text style={styles.preferenceDescription}>
              Verificar identidade dos moradores que se cadastram
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              condoData.features.residentVerification && styles.toggleButtonActive
            ]}
            onPress={() => toggleFeature('residentVerification')}
          >
            <View style={[
              styles.toggleDot,
              condoData.features.residentVerification && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Você poderá alterar seu plano e recursos ativos a qualquer momento após o cadastro.
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
      case 5:
        return renderStep5();
      default:
        return null;
    }
  };
  
  return (
    <KeyboardAwareScrollView
      ref={scrollViewRef}
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
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
    </KeyboardAwareScrollView>
  );
};

const styles = StyleSheet.create({
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