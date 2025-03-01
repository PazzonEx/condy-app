import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  Alert,
  Image
} from 'react-native';
import { Text, useTheme, ProgressBar, Divider } from 'react-native-paper';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

// Serviços
import StorageService from '../../services/storage.service';
import FirestoreService from '../../services/firestore.service';

// Utilitários
import { 
  isValidEmail, 
  validatePassword, 
  isValidPhone, 
  isValidCPF, 
  isValidCNPJ,
  isValidVehiclePlate
} from '../../utils/validation';

const RegisterScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const { register, error } = useAuth();
  
  // Pegar tipo de usuário da rota
  const { userType = 'resident' } = route.params || {};
  
  // Estados para controle de etapas
  const [currentStep, setCurrentStep] = useState(1);
  const [totalSteps, setTotalSteps] = useState(1);
  
  // Estados para formulário de registro básico (Etapa 1)
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  
  // Estados para informações específicas de moradores (Etapa 2 para moradores)
  const [residentInfo, setResidentInfo] = useState({
    cpf: '',
    condoName: '',
    condoId: '',
    unit: '',
    block: '',
    availableCondos: []
  });
  
  // Estados para informações específicas de motoristas (Etapas 2-3 para motoristas)
  const [driverInfo, setDriverInfo] = useState({
    cpf: '',
    vehiclePlate: '',
    vehicleModel: '',
    vehicleYear: '',
    vehicleColor: '',
    serviceType: 'app', // 'app', 'taxi', 'delivery' or 'private'
    licenseNumber: ''
  });
  
  // Estados para informações específicas de condomínios (Etapa 2 para condomínios)
  const [condoInfo, setCondoInfo] = useState({
    cnpj: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    units: '',
    blocks: '',
    managerName: '',
    managerPhone: ''
  });
  
  // Estados para imagens/documentos (Etapa 3 ou 4 dependendo do tipo)
  const [documents, setDocuments] = useState({
    profilePhoto: null,
    driverLicense: null,  // Apenas para motoristas
    vehiclePhoto: null,   // Apenas para motoristas
    condoPhoto: null      // Apenas para condomínios
  });
  
  const [loading, setLoading] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  
  // Configurar o número total de etapas com base no tipo de usuário
  useEffect(() => {
    switch(userType) {
      case 'resident':
        setTotalSteps(2);
        break;
      case 'driver':
        setTotalSteps(3);
        break;
      case 'condo':
        setTotalSteps(3);
        break;
      default:
        setTotalSteps(1);
    }
  }, [userType]);
  
  // Carregar condomínios disponíveis para moradores
  useEffect(() => {
    if (userType === 'resident' && currentStep === 2) {
      const loadCondos = async () => {
        try {
          const condos = await FirestoreService.getCollection('condos');
          setResidentInfo(prev => ({
            ...prev,
            availableCondos: condos
          }));
        } catch (error) {
          console.error('Erro ao carregar condomínios:', error);
        }
      };
      
      loadCondos();
    }
  }, [userType, currentStep]);

  // Texto do cabeçalho com base no tipo de usuário
  const getUserTypeTitle = () => {
    switch (userType) {
      case 'resident':
        return 'Cadastro de Morador';
      case 'driver':
        return 'Cadastro de Motorista';
      case 'condo':
        return 'Cadastro de Condomínio';
      default:
        return 'Cadastro';
    }
  };
  
  // Descrição da etapa atual
  const getStepDescription = () => {
    if (userType === 'resident') {
      return currentStep === 1 
        ? 'Informações básicas'
        : 'Informações do condomínio';
    } else if (userType === 'driver') {
      if (currentStep === 1) return 'Informações básicas';
      if (currentStep === 2) return 'Dados do veículo';
      return 'Documentos';
    } else if (userType === 'condo') {
      if (currentStep === 1) return 'Informações básicas';
      if (currentStep === 2) return 'Dados do condomínio';
      return 'Informações adicionais';
    }
    
    return 'Informações básicas';
  };

  // Validar a etapa atual do formulário
  const validateCurrentStep = () => {
    const errors = {};
    
    // Validação da Etapa 1 (comum para todos os tipos)
    if (currentStep === 1) {
      // Nome
      if (!basicInfo.name.trim()) {
        errors.name = 'Nome é obrigatório';
      } else if (basicInfo.name.trim().length < 3) {
        errors.name = 'Nome deve ter pelo menos 3 caracteres';
      }
      
      // Email
      if (!basicInfo.email.trim()) {
        errors.email = 'Email é obrigatório';
      } else if (!isValidEmail(basicInfo.email)) {
        errors.email = 'Email inválido';
      }
      
      // Telefone
      if (!basicInfo.phone.trim()) {
        errors.phone = 'Telefone é obrigatório';
      } else if (!isValidPhone(basicInfo.phone)) {
        errors.phone = 'Telefone inválido';
      }
      
      // Senha
      if (!basicInfo.password) {
        errors.password = 'Senha é obrigatória';
      } else if (basicInfo.password.length < 6) {
        errors.password = 'Senha deve ter pelo menos 6 caracteres';
      }
      
      // Confirmação de senha
      if (basicInfo.password !== basicInfo.confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem';
      }
    }
    
    // Validação da Etapa 2 para moradores
    else if (currentStep === 2 && userType === 'resident') {
      // CPF
      if (!residentInfo.cpf.trim()) {
        errors.cpf = 'CPF é obrigatório';
      } else if (!isValidCPF(residentInfo.cpf)) {
        errors.cpf = 'CPF inválido';
      }
      
      // Unidade
      if (!residentInfo.unit.trim()) {
        errors.unit = 'Número da unidade é obrigatório';
      }
      
      // Condomínio
      if (!residentInfo.condoId) {
        errors.condoId = 'Selecione um condomínio';
      }
    }
    
    // Validação da Etapa 2 para motoristas
    else if (currentStep === 2 && userType === 'driver') {
      // CPF
      if (!driverInfo.cpf.trim()) {
        errors.cpf = 'CPF é obrigatório';
      } else if (!isValidCPF(driverInfo.cpf)) {
        errors.cpf = 'CPF inválido';
      }
      
      // Placa do veículo
      if (!driverInfo.vehiclePlate.trim()) {
        errors.vehiclePlate = 'Placa do veículo é obrigatória';
      } else if (!isValidVehiclePlate(driverInfo.vehiclePlate)) {
        errors.vehiclePlate = 'Placa do veículo inválida';
      }
      
      // Modelo do veículo
      if (!driverInfo.vehicleModel.trim()) {
        errors.vehicleModel = 'Modelo do veículo é obrigatório';
      }
      
      // Número da CNH
      if (!driverInfo.licenseNumber.trim()) {
        errors.licenseNumber = 'Número da CNH é obrigatório';
      }
    }
    
    // Validação da Etapa 3 para motoristas
    else if (currentStep === 3 && userType === 'driver') {
      // Foto do perfil
      if (!documents.profilePhoto) {
        errors.profilePhoto = 'Foto de perfil é obrigatória';
      }
      
      // Foto da CNH
      if (!documents.driverLicense) {
        errors.driverLicense = 'Foto da CNH é obrigatória';
      }
      
      // Foto do veículo
      if (!documents.vehiclePhoto) {
        errors.vehiclePhoto = 'Foto do veículo é obrigatória';
      }
    }
    
    // Validação da Etapa 2 para condomínios
    else if (currentStep === 2 && userType === 'condo') {
      // CNPJ
      if (!condoInfo.cnpj.trim()) {
        errors.cnpj = 'CNPJ é obrigatório';
      } else if (!isValidCNPJ(condoInfo.cnpj)) {
        errors.cnpj = 'CNPJ inválido';
      }
      
      // Endereço
      if (!condoInfo.address.trim()) {
        errors.address = 'Endereço é obrigatório';
      }
      
      // Cidade
      if (!condoInfo.city.trim()) {
        errors.city = 'Cidade é obrigatória';
      }
      
      // Estado
      if (!condoInfo.state.trim()) {
        errors.state = 'Estado é obrigatório';
      }
      
      // CEP
      if (!condoInfo.zipCode.trim()) {
        errors.zipCode = 'CEP é obrigatório';
      }
      
      // Número de unidades
      if (!condoInfo.units.trim()) {
        errors.units = 'Número de unidades é obrigatório';
      }
    }
    
    // Validação da Etapa 3 para condomínios
    else if (currentStep === 3 && userType === 'condo') {
      // Nome do responsável/síndico
      if (!condoInfo.managerName.trim()) {
        errors.managerName = 'Nome do responsável é obrigatório';
      }
      
      // Telefone do responsável/síndico
      if (!condoInfo.managerPhone.trim()) {
        errors.managerPhone = 'Telefone do responsável é obrigatório';
      } else if (!isValidPhone(condoInfo.managerPhone)) {
        errors.managerPhone = 'Telefone do responsável inválido';
      }
      
      // Foto do condomínio
      if (!documents.condoPhoto) {
        errors.condoPhoto = 'Foto do condomínio é obrigatória';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Avançar para a próxima etapa
  const handleNextStep = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(currentStep + 1);
      } else {
        handleRegister();
      }
    }
  };

  // Voltar para a etapa anterior
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };
  
  // Escolher foto/documento
  const handleChooseImage = async (type) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário conceder permissão para acessar a galeria.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedAsset = result.assets[0];
        
        setDocuments(prev => ({
          ...prev,
          [type]: selectedAsset.uri
        }));
        
        // Limpar erro
        if (formErrors[type]) {
          setFormErrors(prev => ({
            ...prev,
            [type]: null
          }));
        }
      }
    } catch (error) {
      console.error('Erro ao escolher imagem:', error);
      Alert.alert('Erro', 'Não foi possível selecionar a imagem. Tente novamente.');
    }
  };
  
  // Formatar CPF durante digitação
  const handleCPFChange = (text) => {
    // Remove caracteres não numéricos
    const cleaned = text.replace(/\D/g, '');
    
    // Formata o CPF (XXX.XXX.XXX-XX)
    let formatted = '';
    if (cleaned.length <= 3) {
      formatted = cleaned;
    } else if (cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    } else if (cleaned.length <= 9) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    } else {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
    }
    
    if (userType === 'resident') {
      setResidentInfo(prev => ({ ...prev, cpf: formatted }));
    } else if (userType === 'driver') {
      setDriverInfo(prev => ({ ...prev, cpf: formatted }));
    }
  };
  
  // Formatar CNPJ durante digitação
  const handleCNPJChange = (text) => {
    // Remove caracteres não numéricos
    const cleaned = text.replace(/\D/g, '');
    
    // Formata o CNPJ (XX.XXX.XXX/XXXX-XX)
    let formatted = '';
    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 5) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    } else if (cleaned.length <= 8) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    } else if (cleaned.length <= 12) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    } else {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
    }
    
    setCondoInfo(prev => ({ ...prev, cnpj: formatted }));
  };
  
  // Formatar telefone durante digitação
  const handlePhoneChange = (text) => {
    // Remove caracteres não numéricos
    const cleaned = text.replace(/\D/g, '');
    
    // Formata o telefone ((XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
    let formatted = '';
    if (cleaned.length <= 2) {
      formatted = cleaned.length ? `(${cleaned}` : '';
    } else if (cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 10) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    
    setBasicInfo(prev => ({ ...prev, phone: formatted }));
  };
  
  // Formatar telefone do gerente durante digitação
  const handleManagerPhoneChange = (text) => {
    // Remove caracteres não numéricos
    const cleaned = text.replace(/\D/g, '');
    
    // Formata o telefone ((XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
    let formatted = '';
    if (cleaned.length <= 2) {
      formatted = cleaned.length ? `(${cleaned}` : '';
    } else if (cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 10) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    
    setCondoInfo(prev => ({ ...prev, managerPhone: formatted }));
  };
  
  // Formatar placa do veículo durante digitação
  const handleVehiclePlateChange = (text) => {
    // Remove caracteres não alfanuméricos e converte para maiúsculas
    const cleaned = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Formata a placa (ABC-1234 ou ABC1D23)
    let formatted = cleaned;
    if (cleaned.length > 3) {
      formatted = `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    
    setDriverInfo(prev => ({ ...prev, vehiclePlate: formatted }));
  };

  // Manipulador para o processo de registro
  const handleRegister = async () => {
    try {
      setLoading(true);
      
      // Registrar com Firebase Auth
      const user = await register(basicInfo.email, basicInfo.password, basicInfo.name);
      
      // Upload de documentos, se houver
      const uploadResults = {};
      
      if (documents.profilePhoto) {
        const filename = documents.profilePhoto.split('/').pop();
        const path = `profile_photos/${user.uid}/${filename}`;
        const result = await StorageService.uploadFile(path, documents.profilePhoto);
        uploadResults.profilePhotoURL = result.url;
      }
      
      if (userType === 'driver' && documents.driverLicense) {
        const filename = documents.driverLicense.split('/').pop();
        const path = `driver_documents/${user.uid}/license_${filename}`;
        const result = await StorageService.uploadFile(path, documents.driverLicense);
        uploadResults.driverLicenseURL = result.url;
      }
      
      if (userType === 'driver' && documents.vehiclePhoto) {
        const filename = documents.vehiclePhoto.split('/').pop();
        const path = `driver_documents/${user.uid}/vehicle_${filename}`;
        const result = await StorageService.uploadFile(path, documents.vehiclePhoto);
        uploadResults.vehiclePhotoURL = result.url;
      }
      
      if (userType === 'condo' && documents.condoPhoto) {
        const filename = documents.condoPhoto.split('/').pop();
        const path = `condo_photos/${user.uid}/${filename}`;
        const result = await StorageService.uploadFile(path, documents.condoPhoto);
        uploadResults.condoPhotoURL = result.url;
      }
      
      // Criar documento do usuário no Firestore com dados específicos
      const userData = {
        email: basicInfo.email,
        displayName: basicInfo.name,
        phone: basicInfo.phone,
        type: userType,
        status: userType === 'driver' ? 'pending' : 'active', // Motoristas precisam de aprovação
        photoURL: uploadResults.profilePhotoURL || null,
        createdAt: new Date()
      };
      
      await FirestoreService.createDocumentWithId('users', user.uid, userData);
      
      // Criar documento específico do tipo no Firestore
      if (userType === 'resident') {
        const residentData = {
          name: basicInfo.name,
          email: basicInfo.email,
          phone: basicInfo.phone,
          cpf: residentInfo.cpf,
          condoId: residentInfo.condoId,
          condoName: residentInfo.condoName,
          unit: residentInfo.unit,
          block: residentInfo.block,
          status: 'active',
          type: 'resident',
          photoURL: uploadResults.profilePhotoURL || null,
          createdAt: new Date()
        };
        
        await FirestoreService.createDocumentWithId('residents', user.uid, residentData);
      }
      else if (userType === 'driver') {
        const driverData = {
          name: basicInfo.name,
          email: basicInfo.email,
          phone: basicInfo.phone,
          cpf: driverInfo.cpf,
          vehiclePlate: driverInfo.vehiclePlate.toUpperCase(),
          vehicleModel: driverInfo.vehicleModel,
          vehicleYear: driverInfo.vehicleYear,
          vehicleColor: driverInfo.vehicleColor,
          serviceType: driverInfo.serviceType,
          licenseNumber: driverInfo.licenseNumber,
          status: 'pending',  // Aguardando aprovação
          verificationStatus: 'pending',
          isAvailable: true,
          type: 'driver',
          photoURL: uploadResults.profilePhotoURL || null,
          driverLicenseURL: uploadResults.driverLicenseURL || null,
          vehiclePhotoURL: uploadResults.vehiclePhotoURL || null,
          createdAt: new Date()
        };
        
        await FirestoreService.createDocumentWithId('drivers', user.uid, driverData);
      }
      else if (userType === 'condo') {
        const condoData = {
          name: basicInfo.name,
          email: basicInfo.email,
          phone: basicInfo.phone,
          cnpj: condoInfo.cnpj,
          address: condoInfo.address,
          city: condoInfo.city,
          state: condoInfo.state,
          zipCode: condoInfo.zipCode,
          units: parseInt(condoInfo.units, 10) || 0,
          blocks: parseInt(condoInfo.blocks, 10) || 0,
          managerName: condoInfo.managerName,
          managerPhone: condoInfo.managerPhone,
          status: 'active',
          verified: false, // Aguardando verificação
          plan: 'free', // Plano gratuito inicial
          type: 'condo',
          photoURL: uploadResults.condoPhotoURL || null,
          createdAt: new Date()
        };
        
        await FirestoreService.createDocumentWithId('condos', user.uid, condoData);
      }
      
      // Exibir feedback ao usuário
      if (userType === 'driver') {
        Alert.alert(
          'Cadastro Realizado',
          'Seu cadastro foi realizado com sucesso! Aguarde a aprovação para começar a utilizar o aplicativo.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Cadastro Realizado',
          'Seu cadastro foi realizado com sucesso!',
          [{ text: 'OK' }]
        );
      }
      
      // O redirecionamento será tratado pelo navegador de autenticação
    } catch (error) {
      console.error('Erro no registro:', error);
      setFormErrors(prev => ({ 
        ...prev, 
        general: 'Falha no registro. Por favor, tente novamente.' 
      }));
      setLoading(false);
    }
  };

  // Renderizar tela de acordo com a etapa atual
  const renderCurrentStep = () => {
    // Etapa 1 - Informações básicas (comum para todos os tipos)
    if (currentStep === 1) {
      return (
        <View>
          <Input
            label="Nome completo"
            value={basicInfo.name}
            onChangeText={(text) => setBasicInfo(prev => ({ ...prev, name: text }))}
            error={formErrors.name}
            autoCapitalize="words"
            placeholder="Digite seu nome completo"
          />
          
          <Input
            label="Email"
            value={basicInfo.email}
            onChangeText={(text) => setBasicInfo(prev => ({ ...prev, email: text }))}
            error={formErrors.email}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="Digite seu email"
          />
          
          <Input
            label="Telefone"
            value={basicInfo.phone}
            onChangeText={handlePhoneChange}
            error={formErrors.phone}
            keyboardType="phone-pad"
            placeholder="(XX) XXXXX-XXXX"
          />
          
          <Input
            label="Senha"
            value={basicInfo.password}
            onChangeText={(text) => setBasicInfo(prev => ({ ...prev, password: text }))}
            error={formErrors.password}
            secureTextEntry
            placeholder="Digite sua senha"
          />
          
          <Input
            label="Confirmar senha"
            value={basicInfo.confirmPassword}
            onChangeText={(text) => setBasicInfo(prev => ({ ...prev, confirmPassword: text }))}
            error={formErrors.confirmPassword}
            secureTextEntry
            placeholder="Confirme sua senha"
          />
        </View>
      );
    }
    
    // Etapa 2 para moradores
    else if (currentStep === 2 && userType === 'resident') {
      return (
        <View>
          <Input
            label="CPF"
            value={residentInfo.cpf}
            onChangeText={handleCPFChange}
            error={formErrors.cpf}
            keyboardType="number-pad"
            placeholder="XXX.XXX.XXX-XX"
            maxLength={14}
          />
          
          <Input
            label="Nome do Condomínio"
            value={residentInfo.condoName}
            onChangeText={(text) => setResidentInfo(prev => ({ ...prev, condoName: text }))}
            error={formErrors.condoName}
            placeholder="Digite o nome do seu condomínio"
            autoCapitalize="words"
          />
          
          <Input
            label="Unidade"
            value={residentInfo.unit}
            onChangeText={(text) => setResidentInfo(prev => ({ ...prev, unit: text }))}
            error={formErrors.unit}
            keyboardType="number-pad"
            placeholder="Digite o número da sua unidade"
          />
          
          <Input
            label="Bloco (opcional)"
            value={residentInfo.block}
            onChangeText={(text) => setResidentInfo(prev => ({ ...prev, block: text }))}
            error={formErrors.block}
            placeholder="Digite o bloco da sua unidade"
            autoCapitalize="characters"
          />
          
          {/* Seleção de condomínio (poderia ser implementado com um dropdown/auto-complete) */}
          <Text style={styles.label}>Condomínio (selecione um):</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.condoList}
          >
            {residentInfo.availableCondos.map((condo) => (
              <TouchableOpacity 
                key={condo.id}
                style={[
                  styles.condoCard,
                  residentInfo.condoId === condo.id && styles.selectedCondoCard
                ]}
                onPress={() => setResidentInfo(prev => ({
                  ...prev,
                  condoId: condo.id,
                  condoName: condo.name
                }))}
              >
                <MaterialCommunityIcons 
                  name="office-building" 
                  size={24} 
                  color={residentInfo.condoId === condo.id ? theme.colors.primary : "#757575"}
                />
                <Text style={styles.condoCardText}>{condo.name}</Text>
                <Text style={styles.condoCardSubtext}>{condo.address}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {formErrors.condoId && (
            <Text style={styles.errorText}>{formErrors.condoId}</Text>
          )}
          
          <Text style={styles.sectionTitle}>Foto de Perfil</Text>
          <TouchableOpacity 
            style={styles.photoPickerButton}
            onPress={() => handleChooseImage('profilePhoto')}
          >
            {documents.profilePhoto ? (
              <Image 
                source={{ uri: documents.profilePhoto }} 
                style={styles.photoPreview} 
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="camera" size={40} color="#757575" />
                <Text style={styles.photoPlaceholderText}>Toque para adicionar</Text>
              </View>
            )}
          </TouchableOpacity>
          {formErrors.profilePhoto && (
            <Text style={styles.errorText}>{formErrors.profilePhoto}</Text>
          )}
        </View>
      );
    }
    
    // Etapa 2 para motoristas
    else if (currentStep === 2 && userType === 'driver') {
      return (
        <View>
          <Input
            label="CPF"
            value={driverInfo.cpf}
            onChangeText={handleCPFChange}
            error={formErrors.cpf}
            keyboardType="number-pad"
            placeholder="XXX.XXX.XXX-XX"
            maxLength={14}
          />
          
          <Input
            label="Número da CNH"
            value={driverInfo.licenseNumber}
            onChangeText={(text) => setDriverInfo(prev => ({ ...prev, licenseNumber: text }))}
            error={formErrors.licenseNumber}
            keyboardType="number-pad"
            placeholder="Digite o número da sua CNH"
          />
          
          <Input
            label="Placa do Veículo"
            value={driverInfo.vehiclePlate}
            onChangeText={handleVehiclePlateChange}
            error={formErrors.vehiclePlate}
            placeholder="ABC-1234"
            autoCapitalize="characters"
            maxLength={8}
          />
          
          <Input
            label="Modelo do Veículo"
            value={driverInfo.vehicleModel}
            onChangeText={(text) => setDriverInfo(prev => ({ ...prev, vehicleModel: text }))}
            error={formErrors.vehicleModel}
            placeholder="Ex: Honda Civic Preto"
            autoCapitalize="words"
          />
          
          <View style={styles.row}>
            <Input
              label="Ano do Veículo"
              value={driverInfo.vehicleYear}
              onChangeText={(text) => setDriverInfo(prev => ({ ...prev, vehicleYear: text }))}
              error={formErrors.vehicleYear}
              keyboardType="number-pad"
              placeholder="Ex: 2022"
              maxLength={4}
              style={styles.halfInput}
            />
            
            <Input
              label="Cor do Veículo"
              value={driverInfo.vehicleColor}
              onChangeText={(text) => setDriverInfo(prev => ({ ...prev, vehicleColor: text }))}
              error={formErrors.vehicleColor}
              placeholder="Ex: Preto"
              autoCapitalize="words"
              style={styles.halfInput}
            />
          </View>
          
          <Text style={styles.label}>Tipo de Serviço:</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.serviceTypeList}
          >
            {[
              { id: 'app', icon: 'cellphone', label: 'Aplicativo' },
              { id: 'taxi', icon: 'taxi', label: 'Taxista' },
              { id: 'delivery', icon: 'package-variant-closed', label: 'Entregador' },
              { id: 'private', icon: 'car', label: 'Particular' }
            ].map((type) => (
              <TouchableOpacity 
                key={type.id}
                style={[
                  styles.serviceTypeCard,
                  driverInfo.serviceType === type.id && styles.selectedServiceTypeCard
                ]}
                onPress={() => setDriverInfo(prev => ({ ...prev, serviceType: type.id }))}
              >
                <MaterialCommunityIcons 
                  name={type.icon} 
                  size={24} 
                  color={driverInfo.serviceType === type.id ? theme.colors.primary : "#757575"}
                />
                <Text style={styles.serviceTypeText}>{type.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }
    
    // Etapa 3 para motoristas
    else if (currentStep === 3 && userType === 'driver') {
      return (
        <View>
          <Text style={styles.sectionTitle}>Foto de Perfil</Text>
          <TouchableOpacity 
            style={styles.photoPickerButton}
            onPress={() => handleChooseImage('profilePhoto')}
          >
            {documents.profilePhoto ? (
              <Image 
                source={{ uri: documents.profilePhoto }} 
                style={styles.photoPreview} 
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="account" size={40} color="#757575" />
                <Text style={styles.photoPlaceholderText}>Toque para adicionar</Text>
              </View>
            )}
          </TouchableOpacity>
          {formErrors.profilePhoto && (
            <Text style={styles.errorText}>{formErrors.profilePhoto}</Text>
          )}
          
          <Divider style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Foto da CNH</Text>
          <TouchableOpacity 
            style={styles.photoPickerButton}
            onPress={() => handleChooseImage('driverLicense')}
          >
            {documents.driverLicense ? (
              <Image 
                source={{ uri: documents.driverLicense }} 
                style={styles.photoPreview} 
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="card-account-details" size={40} color="#757575" />
                <Text style={styles.photoPlaceholderText}>Toque para adicionar</Text>
              </View>
            )}
          </TouchableOpacity>
          {formErrors.driverLicense && (
            <Text style={styles.errorText}>{formErrors.driverLicense}</Text>
          )}
          
          <Divider style={styles.divider} />
          
          <Text style={styles.sectionTitle}>Foto do Veículo</Text>
          <TouchableOpacity 
            style={styles.photoPickerButton}
            onPress={() => handleChooseImage('vehiclePhoto')}
          >
            {documents.vehiclePhoto ? (
              <Image 
                source={{ uri: documents.vehiclePhoto }} 
                style={styles.photoPreview} 
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="car" size={40} color="#757575" />
                <Text style={styles.photoPlaceholderText}>Toque para adicionar</Text>
              </View>
            )}
          </TouchableOpacity>
          {formErrors.vehiclePhoto && (
            <Text style={styles.errorText}>{formErrors.vehiclePhoto}</Text>
          )}
          
          <Text style={styles.infoText}>
            Suas informações serão revisadas para aprovação. Você receberá uma notificação quando seu cadastro for aprovado.
          </Text>
        </View>
      );
    }
    
    // Etapa 2 para condomínios
    else if (currentStep === 2 && userType === 'condo') {
      return (
        <View>
          <Input
            label="CNPJ"
            value={condoInfo.cnpj}
            onChangeText={handleCNPJChange}
            error={formErrors.cnpj}
            keyboardType="number-pad"
            placeholder="XX.XXX.XXX/XXXX-XX"
            maxLength={18}
          />
          
          <Input
            label="Endereço"
            value={condoInfo.address}
            onChangeText={(text) => setCondoInfo(prev => ({ ...prev, address: text }))}
            error={formErrors.address}
            placeholder="Endereço completo do condomínio"
            autoCapitalize="words"
          />
          
          <View style={styles.row}>
            <Input
              label="Cidade"
              value={condoInfo.city}
              onChangeText={(text) => setCondoInfo(prev => ({ ...prev, city: text }))}
              error={formErrors.city}
              placeholder="Cidade"
              autoCapitalize="words"
              style={styles.halfInput}
            />
            
            <Input
              label="Estado"
              value={condoInfo.state}
              onChangeText={(text) => setCondoInfo(prev => ({ ...prev, state: text }))}
              error={formErrors.state}
              placeholder="UF"
              autoCapitalize="characters"
              maxLength={2}
              style={styles.halfInput}
            />
          </View>
          
          <Input
            label="CEP"
            value={condoInfo.zipCode}
            onChangeText={(text) => setCondoInfo(prev => ({ ...prev, zipCode: text.replace(/\D/g, '') }))}
            error={formErrors.zipCode}
            keyboardType="number-pad"
            placeholder="XXXXX-XXX"
            maxLength={9}
          />
          
          <View style={styles.row}>
            <Input
              label="Número de Unidades"
              value={condoInfo.units}
              onChangeText={(text) => setCondoInfo(prev => ({ ...prev, units: text.replace(/\D/g, '') }))}
              error={formErrors.units}
              keyboardType="number-pad"
              placeholder="Ex: 100"
              style={styles.halfInput}
            />
            
            <Input
              label="Número de Blocos"
              value={condoInfo.blocks}
              onChangeText={(text) => setCondoInfo(prev => ({ ...prev, blocks: text.replace(/\D/g, '') }))}
              error={formErrors.blocks}
              keyboardType="number-pad"
              placeholder="Ex: 4"
              style={styles.halfInput}
            />
          </View>
        </View>
      );
    }
    
    // Etapa 3 para condomínios
    else if (currentStep === 3 && userType === 'condo') {
      return (
        <View>
          <Input
            label="Nome do Responsável/Síndico"
            value={condoInfo.managerName}
            onChangeText={(text) => setCondoInfo(prev => ({ ...prev, managerName: text }))}
            error={formErrors.managerName}
            placeholder="Nome completo do responsável"
            autoCapitalize="words"
          />
          
          <Input
            label="Telefone do Responsável"
            value={condoInfo.managerPhone}
            onChangeText={handleManagerPhoneChange}
            error={formErrors.managerPhone}
            keyboardType="phone-pad"
            placeholder="(XX) XXXXX-XXXX"
          />
          
          <Text style={styles.sectionTitle}>Foto do Condomínio</Text>
          <TouchableOpacity 
            style={styles.photoPickerButton}
            onPress={() => handleChooseImage('condoPhoto')}
          >
            {documents.condoPhoto ? (
              <Image 
                source={{ uri: documents.condoPhoto }} 
                style={styles.photoPreview} 
              />
            ) : (
              <View style={styles.photoPlaceholder}>
                <MaterialCommunityIcons name="office-building" size={40} color="#757575" />
                <Text style={styles.photoPlaceholderText}>Toque para adicionar</Text>
              </View>
            )}
          </TouchableOpacity>
          {formErrors.condoPhoto && (
            <Text style={styles.errorText}>{formErrors.condoPhoto}</Text>
          )}
          
          <Text style={styles.infoText}>
            Seu condomínio terá acesso ao plano gratuito inicialmente. Você poderá fazer upgrade para planos com mais recursos a qualquer momento.
          </Text>
        </View>
      );
    }
    
    return null;
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.container}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <Text style={styles.title}>{getUserTypeTitle()}</Text>
            <Text style={styles.subtitle}>
              {getStepDescription()}
            </Text>
          </View>

          {/* Barra de progresso */}
          <View style={styles.progressContainer}>
            <ProgressBar
              progress={currentStep / totalSteps}
              color={theme.colors.primary}
              style={styles.progressBar}
            />
            <Text style={styles.progressText}>
              Etapa {currentStep} de {totalSteps}
            </Text>
          </View>

          {/* Formulário */}
          <Card style={styles.card}>
            {formErrors.general ? (
              <Text style={styles.errorText}>{formErrors.general}</Text>
            ) : null}

            {renderCurrentStep()}

            <View style={styles.buttonContainer}>
              <Button
                mode="outlined"
                onPress={handlePreviousStep}
                style={styles.button}
                disabled={loading}
              >
                {currentStep === 1 ? 'Cancelar' : 'Anterior'}
              </Button>

              <Button
                mode="contained"
                onPress={handleNextStep}
                loading={loading}
                disabled={loading}
                style={styles.button}
              >
                {currentStep < totalSteps ? 'Próximo' : 'Cadastrar'}
              </Button>
            </View>
          </Card>

          {/* Rodapé para navegação para o login */}
          <View style={styles.footer}>
            <Text>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={{ color: theme.colors.primary, fontWeight: 'bold' }}>
                Entrar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    marginBottom: 20,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 5,
    fontSize: 14,
    color: '#777',
  },
  card: {
    width: '100%',
    maxWidth: 500,
    padding: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 5,
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  errorText: {
    color: '#f13a59',
    textAlign: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 5,
    marginTop: 10,
    color: '#757575',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  condoList: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  condoCard: {
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    minWidth: 150,
    maxWidth: 200,
    alignItems: 'center',
  },
  selectedCondoCard: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  condoCardText: {
    marginTop: 5,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  condoCardSubtext: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  serviceTypeList: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  serviceTypeCard: {
    padding: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    width: 100,
    alignItems: 'center',
  },
  selectedServiceTypeCard: {
    borderColor: '#1E88E5',
    backgroundColor: '#E3F2FD',
  },
  serviceTypeText: {
    marginTop: 5,
    fontSize: 12,
    textAlign: 'center',
  },
  photoPickerButton: {
    width: '100%',
    height: 200,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 15,
    overflow: 'hidden',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  photoPlaceholderText: {
    marginTop: 10,
    color: '#757575',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  divider: {
    marginVertical: 15,
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 10,
  },
});

export default RegisterScreen;