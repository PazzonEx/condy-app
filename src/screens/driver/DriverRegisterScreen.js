// src/screens/driver/DriverRegisterScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  useTheme, 
  Snackbar,
  Divider,
  ProgressBar,
  Surface,
  FAB
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
import { validateDriverFields } from '../../utils/validation';
import { maskCPF, maskPhone, maskCNH, maskLicensePlate } from '../../utils/masks';

const DriverRegisterScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, userProfile, updateProfile,setUserProfile } = useAuth();
  
  // Refs
  const scrollViewRef = useRef(null);
  
  // Estados
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showError, setShowError] = useState(false);
  
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
  
  // Apps de transporte disponíveis
  const availableApps = [
    { id: 'uber', name: 'Uber', icon: 'uber' },
    { id: '99', name: '99', icon: 'car' },
    { id: 'indriver', name: 'InDriver', icon: 'car' },
    { id: 'ifood', name: 'iFood', icon: 'food' },
    { id: 'rappi', name: 'Rappi', icon: 'shopping' },
    { id: 'loggi', name: 'Loggi', icon: 'package-variant-closed' },
    { id: 'other', name: 'Outro', icon: 'dots-horizontal-circle' }
  ];
  
  // Dias da semana
  const weekDays = [
    { id: 'monday', name: 'Segunda' },
    { id: 'tuesday', name: 'Terça' },
    { id: 'wednesday', name: 'Quarta' },
    { id: 'thursday', name: 'Quinta' },
    { id: 'friday', name: 'Sexta' },
    { id: 'saturday', name: 'Sábado' },
    { id: 'sunday', name: 'Domingo' }
  ];
  
  // Períodos do dia
  const dayPeriods = [
    { id: 'morning', name: 'Manhã' },
    { id: 'afternoon', name: 'Tarde' },
    { id: 'night', name: 'Noite' },
    { id: 'dawn', name: 'Madrugada' }
  ];
  
  // Tipos de CNH
  const cnhTypes = [
    { id: 'A', name: 'A - Motos' },
    { id: 'B', name: 'B - Carros' },
    { id: 'AB', name: 'AB - Motos e Carros' },
    { id: 'C', name: 'C - Carros e caminhões pequenos' },
    { id: 'D', name: 'D - Ônibus e vans' },
    { id: 'E', name: 'E - Caminhões e ônibus articulados' }
  ];
  
  // Atualizar dados do formulário
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
  
  // Atualizar dados de endereço
  const updateAddressDetails = (field, value) => {
    setDriverData(prev => ({
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
  
  // Selecionar/desselecionar aplicativo
  const toggleApp = (appId) => {
    setDriverData(prev => {
      const apps = [...prev.appServices];
      
      if (apps.includes(appId)) {
        // Remover app
        return {
          ...prev,
          appServices: apps.filter(id => id !== appId)
        };
      } else {
        // Adicionar app
        return {
          ...prev,
          appServices: [...apps, appId]
        };
      }
    });
  };
  
  // Selecionar/desselecionar dia e período
  const toggleSchedule = (dayId, periodId) => {
    setDriverData(prev => {
      const schedule = [...prev.workSchedule];
      const scheduleItem = schedule.find(item => item.day === dayId && item.period === periodId);
      
      if (scheduleItem) {
        // Remover horário
        return {
          ...prev,
          workSchedule: schedule.filter(item => !(item.day === dayId && item.period === periodId))
        };
      } else {
        // Adicionar horário
        return {
          ...prev,
          workSchedule: [...schedule, { day: dayId, period: periodId }]
        };
      }
    });
  };
  
  // Atualizar documentos
  const handleDocumentsChange = (docType, documents) => {
    setDriverData(prev => ({
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
  
  // Verificar se o dia/período está selecionado
  const isScheduleSelected = (dayId, periodId) => {
    return driverData.workSchedule.some(
      item => item.day === dayId && item.period === periodId
    );
  };
  
  // Selecionar endereço do Google Places
  const handleSelectAddress = (addressData) => {
    if (!addressData) {
      updateDriverData('address', '');
      return;
    }
    
    const components = addressData.components || {};
    
    updateDriverData('address', addressData.formattedAddress);
    
    setDriverData(prev => ({
      ...prev,
      addressDetails: {
        ...prev.addressDetails,
        street: components.street || '',
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
      // Validar dados pessoais
      if (!driverData.name.trim()) {
        stepErrors.name = 'Nome é obrigatório';
        isValid = false;
      }
      
      if (!driverData.cpf || driverData.cpf.replace(/\D/g, '').length !== 11) {
        stepErrors.cpf = 'CPF inválido';
        isValid = false;
      }
      
      if (!driverData.phone || driverData.phone.replace(/\D/g, '').length < 10) {
        stepErrors.phone = 'Telefone inválido';
        isValid = false;
      }
      
      if (!driverData.address) {
        stepErrors.address = 'Endereço é obrigatório';
        isValid = false;
      }
      
      if (!driverData.addressDetails.number) {
        stepErrors['addressDetails.number'] = 'Número é obrigatório';
        isValid = false;
      }
    } else if (step === 2) {
      // Validar dados de habilitação e veículo
      if (!driverData.cnh || driverData.cnh.replace(/\D/g, '').length < 9) {
        stepErrors.cnh = 'CNH inválida';
        isValid = false;
      }
      
      if (!driverData.cnhType) {
        stepErrors.cnhType = 'Tipo da CNH é obrigatório';
        isValid = false;
      }
      
      if (!driverData.vehicleMake) {
        stepErrors.vehicleMake = 'Marca do veículo é obrigatória';
        isValid = false;
      }
      
      if (!driverData.vehicleModel) {
        stepErrors.vehicleModel = 'Modelo do veículo é obrigatório';
        isValid = false;
      }
      
      if (!driverData.vehicleYear) {
        stepErrors.vehicleYear = 'Ano do veículo é obrigatório';
        isValid = false;
      }
      
      if (!driverData.vehicleColor) {
        stepErrors.vehicleColor = 'Cor do veículo é obrigatória';
        isValid = false;
      }
      
      if (!driverData.vehiclePlate || driverData.vehiclePlate.replace(/\W/g, '').length < 7) {
        stepErrors.vehiclePlate = 'Placa do veículo inválida';
        isValid = false;
      }
    } else if (step === 3) {
      // Validar documentos
      if (!driverData.documents.cnh || driverData.documents.cnh.length === 0) {
        stepErrors['documents.cnh'] = 'Foto da CNH é obrigatória';
        isValid = false;
      }
      
      if (!driverData.documents.vehicleDocument || driverData.documents.vehicleDocument.length === 0) {
        stepErrors['documents.vehicleDocument'] = 'Documento do veículo é obrigatório';
        isValid = false;
      }
      
      if (!driverData.documents.profilePhoto || driverData.documents.profilePhoto.length === 0) {
        stepErrors['documents.profilePhoto'] = 'Foto de perfil é obrigatória';
        isValid = false;
      }
    } else if (step === 4) {
      // Validar apps e horários
      if (driverData.appServices.length === 0) {
        stepErrors.appServices = 'Selecione pelo menos um aplicativo';
        isValid = false;
      }
      
      if (driverData.workSchedule.length === 0) {
        stepErrors.workSchedule = 'Selecione pelo menos um horário de trabalho';
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
        setStep(prev => prev + 1);
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
      setStep(prev => prev - 1);
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
  // Para a tela DriverRegisterScreen.js
const submitForm = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      // Preparar dados para envio
      const driverProfileData = {
        personalData: {
          name: driverData.name,
          cpf: driverData.cpf.replace(/\D/g, ''),
          phone: driverData.phone.replace(/\D/g, ''),
          address: driverData.address,
          addressDetails: driverData.addressDetails
        },
        driverData: {
          cnh: driverData.cnh.replace(/\D/g, ''),
          cnhType: driverData.cnhType,
          vehicle: {
            make: driverData.vehicleMake,
            model: driverData.vehicleModel,
            year: driverData.vehicleYear,
            color: driverData.vehicleColor,
            plate: driverData.vehiclePlate.replace(/\W/g, '')
          }
        },
        workData: {
          appServices: driverData.appServices,
          workSchedule: driverData.workSchedule
        },
        documents: driverData.documents,
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
        return 'Dados Pessoais';
      case 2:
        return 'Informações do Veículo';
      case 3:
        return 'Documentação';
      case 4:
        return 'Aplicativos e Horários';
      default:
        return '';
    }
  };
  
  // Renderizar formulário da etapa 1
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
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>
      
      {/* CPF */}
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
        />
        {errors.cpf && <Text style={styles.errorText}>{errors.cpf}</Text>}
      </View>
      
      {/* Telefone */}
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
        />
        {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
      </View>
      
      {/* Endereço */}
      <View style={styles.inputContainer}>
        <AddressAutocomplete
          label="Endereço *"
          value={driverData.address}
          onSelect={handleSelectAddress}
          error={errors.address}
          required
        />
      </View>
      
      {/* Número */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Número *"
          value={driverData.addressDetails.number}
          onChangeText={(text) => updateAddressDetails('number', text)}
          mode="outlined"
          error={!!errors['addressDetails.number']}
          style={styles.input}
          keyboardType="numeric"
        />
        {errors['addressDetails.number'] && (
          <Text style={styles.errorText}>{errors['addressDetails.number']}</Text>
        )}
      </View>
      
      {/* Complemento */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Complemento"
          value={driverData.addressDetails.complement}
          onChangeText={(text) => updateAddressDetails('complement', text)}
          mode="outlined"
          style={styles.input}
        />
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 2
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* CNH */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Número da CNH *"
          value={driverData.cnh}
          onChangeText={(text) => updateDriverData('cnh', maskCNH(text))}
          mode="outlined"
          error={!!errors.cnh}
          style={styles.input}
          keyboardType="numeric"
          maxLength={11}
        />
        {errors.cnh && <Text style={styles.errorText}>{errors.cnh}</Text>}
      </View>
      
      {/* Tipo da CNH */}
      <View style={styles.inputContainer}>
        <Text style={styles.sectionTitle}>Tipo da CNH *</Text>
        <View style={styles.optionsContainer}>
          {cnhTypes.map(type => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.optionButton,
                driverData.cnhType === type.id && styles.optionButtonSelected
              ]}
              onPress={() => updateDriverData('cnhType', type.id)}
            >
              <Text
                style={[
                  styles.optionText,
                  driverData.cnhType === type.id && styles.optionTextSelected
                ]}
              >
                {type.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.cnhType && <Text style={styles.errorText}>{errors.cnhType}</Text>}
      </View>
      
      <Divider style={styles.divider} />
      
      {/* Marca do veículo */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Marca do veículo *"
          value={driverData.vehicleMake}
          onChangeText={(text) => updateDriverData('vehicleMake', text)}
          mode="outlined"
          error={!!errors.vehicleMake}
          style={styles.input}
          autoCapitalize="words"
        />
        {errors.vehicleMake && <Text style={styles.errorText}>{errors.vehicleMake}</Text>}
      </View>
      
      {/* Modelo do veículo */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Modelo do veículo *"
          value={driverData.vehicleModel}
          onChangeText={(text) => updateDriverData('vehicleModel', text)}
          mode="outlined"
          error={!!errors.vehicleModel}
          style={styles.input}
          autoCapitalize="words"
        />
        {errors.vehicleModel && <Text style={styles.errorText}>{errors.vehicleModel}</Text>}
      </View>
      
      {/* Ano do veículo */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Ano do veículo *"
          value={driverData.vehicleYear}
          onChangeText={(text) => updateDriverData('vehicleYear', text)}
          mode="outlined"
          error={!!errors.vehicleYear}
          style={styles.input}
          keyboardType="numeric"
          maxLength={4}
        />
        {errors.vehicleYear && <Text style={styles.errorText}>{errors.vehicleYear}</Text>}
      </View>
      
      {/* Cor do veículo */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Cor do veículo *"
          value={driverData.vehicleColor}
          onChangeText={(text) => updateDriverData('vehicleColor', text)}
          mode="outlined"
          error={!!errors.vehicleColor}
          style={styles.input}
          autoCapitalize="words"
        />
        {errors.vehicleColor && <Text style={styles.errorText}>{errors.vehicleColor}</Text>}
      </View>
      
      {/* Placa do veículo */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Placa do veículo *"
          value={driverData.vehiclePlate}
          onChangeText={(text) => updateDriverData('vehiclePlate', maskLicensePlate(text))}
          mode="outlined"
          error={!!errors.vehiclePlate}
          style={styles.input}
          autoCapitalize="characters"
          maxLength={8}
        />
        {errors.vehiclePlate && <Text style={styles.errorText}>{errors.vehiclePlate}</Text>}
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 3
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      {/* Foto da CNH */}
      <DocumentUpload
        title="Foto da CNH"
        subtitle="Frente e verso da sua Carteira Nacional de Habilitação"
        documentType="cnh"
        initialDocuments={driverData.documents.cnh}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('cnh', docs)}
        maxDocuments={2}
        required
      />
      {errors['documents.cnh'] && (
        <Text style={styles.errorText}>{errors['documents.cnh']}</Text>
      )}
      
      {/* Documento do veículo */}
      <DocumentUpload
        title="Documento do veículo"
        subtitle="CRLV ou documento equivalente"
        documentType="vehicleDocument"
        initialDocuments={driverData.documents.vehicleDocument}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('vehicleDocument', docs)}
        maxDocuments={2}
        required
      />
      {errors['documents.vehicleDocument'] && (
        <Text style={styles.errorText}>{errors['documents.vehicleDocument']}</Text>
      )}
      
      {/* Foto de perfil */}
      <DocumentUpload
        title="Foto de perfil"
        subtitle="Foto de rosto clara e recente (tipo documento)"
        documentType="profilePhoto"
        initialDocuments={driverData.documents.profilePhoto}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('profilePhoto', docs)}
        maxDocuments={1}
        required
      />
      {errors['documents.profilePhoto'] && (
        <Text style={styles.errorText}>{errors['documents.profilePhoto']}</Text>
      )}
      
      {/* Foto do veículo */}
      <DocumentUpload
        title="Foto do veículo"
        subtitle="Foto do veículo mostrando a placa"
        documentType="vehiclePhoto"
        initialDocuments={driverData.documents.vehiclePhoto}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('vehiclePhoto', docs)}
        maxDocuments={2}
      />
    </View>
  );
  
  // Renderizar formulário da etapa 4
  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      {/* Apps de transporte */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          Em quais aplicativos você trabalha? *
        </Text>
        <View style={styles.appsContainer}>
          {availableApps.map(app => (
            <TouchableOpacity
              key={app.id}
              style={[
                styles.appButton,
                driverData.appServices.includes(app.id) && styles.appButtonSelected
              ]}
              onPress={() => toggleApp(app.id)}
            >
              <MaterialCommunityIcons
                name={app.icon}
                size={24}
                color={driverData.appServices.includes(app.id) ? '#FFFFFF' : '#757575'}
              />
              <Text
                style={[
                  styles.appButtonText,
                  driverData.appServices.includes(app.id) && styles.appButtonTextSelected
                ]}
              >
                {app.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {errors.appServices && <Text style={styles.errorText}>{errors.appServices}</Text>}
      </View>
      
      <Divider style={styles.divider} />
      
      {/* Horários de trabalho */}
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>
          Quais são seus horários de trabalho? *
        </Text>
        <Text style={styles.sectionSubtitle}>
          Selecione os períodos em que você costuma trabalhar
        </Text>
        
        <Surface style={styles.scheduleContainer}>
          {/* Cabeçalho da tabela */}
          <View style={styles.scheduleHeader}>
            <View style={styles.scheduleDayCell}>
              <Text style={styles.scheduleHeaderText}>Dia</Text>
            </View>
            {dayPeriods.map(period => (
              <View key={period.id} style={styles.schedulePeriodCell}>
                <Text style={styles.scheduleHeaderText}>{period.name}</Text>
              </View>
            ))}
          </View>
          
          {/* Linhas da tabela (dias da semana) */}
          {weekDays.map(day => (
            <View key={day.id} style={styles.scheduleRow}>
              <View style={styles.scheduleDayCell}>
                <Text style={styles.scheduleDayText}>{day.name}</Text>
              </View>
              
              {dayPeriods.map(period => (
                <TouchableOpacity
                  key={period.id}
                  style={[
                    styles.scheduleCheckCell,
                    isScheduleSelected(day.id, period.id) && styles.scheduleCheckCellSelected
                  ]}
                  onPress={() => toggleSchedule(day.id, period.id)}
                >
                  {isScheduleSelected(day.id, period.id) && (
                    <MaterialCommunityIcons name="check" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </Surface>
        {errors.workSchedule && <Text style={styles.errorText}>{errors.workSchedule}</Text>}
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
      <Animatable.View
        animation="fadeIn"
        duration={500}
        style={styles.formContainer}
      >
        {renderStepContent()}
      </Animatable.View>
      
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
          {step === 4 ? 'Enviar' : 'Próximo'}
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
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  optionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 12,
    marginBottom: 12,
  },
  optionButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  optionText: {
    fontSize: 14,
    color: '#757575',
  },
  optionTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  appsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  appButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginRight: 12,
    marginBottom: 12,
  },
  appButtonSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  appButtonText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  appButtonTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scheduleContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  scheduleHeader: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
  },
  scheduleHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  scheduleDayCell: {
    flex: 1.5,
    padding: 12,
    justifyContent: 'center',
  },
  schedulePeriodCell: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  scheduleDayText: {
    fontSize: 14,
  },
  scheduleCheckCell: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  scheduleCheckCellSelected: {
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