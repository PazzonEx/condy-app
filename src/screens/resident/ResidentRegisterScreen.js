// src/screens/resident/ResidentRegisterScreen.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet,
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
  Chip,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { serverTimestamp } from 'firebase/firestore';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Componentes
import DocumentUpload from '../../components/DocumentUpload';
import GooglePlacesCondoSearch from '../../components/GooglePlacesCondoSearch';
import LoadingOverlay from '../../components/LoadingOverlay';

// Serviços
import FirestoreService from '../../services/firestore.service';
import StorageService from '../../services/storage.service';

// Utilitários
import { maskCPF, maskPhone } from '../../utils/masks';
import { isValidEmail, isValidCPF } from '../../utils/validation';

const { width } = Dimensions.get('window');

const ResidentRegisterScreen = () => {
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
  const [residentData, setResidentData] = useState({
    // Dados pessoais
    name: userProfile?.displayName || '',
    cpf: '',
    phone: '',
    email: userProfile?.email || '',
    
    // Dados de residência
    condoId: '',
    condoName: '',
    condoAddress: '',
    block: '',
    unit: '',
    
    // Documentos
    documents: {
      idDocument: [],
      profilePhoto: [],
      proofOfResidence: []
    },
    
    // Preferências
    notificationPreferences: {
      accessRequests: true,
      statusUpdates: true,
      announcements: true
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
  
  // Atualizar dados do formulário
  const updateResidentData = (field, value) => {
    setResidentData(prev => {
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
  
  // Atualizar preferências de notificação
  const toggleNotificationPreference = (key) => {
    updateResidentData(`notificationPreferences.${key}`, !residentData.notificationPreferences[key]);
  };
  
  // Atualizar documentos
  const handleDocumentsChange = (docType, documents) => {
    updateResidentData(`documents.${docType}`, documents);
    
    // Limpar erro do campo
    if (errors[`documents.${docType}`]) {
      setErrors(prev => ({ ...prev, [`documents.${docType}`]: null }));
    }
  };
  
  // Selecionar condomínio
  const handleSelectCondo = (condo) => {
    if (condo) {
      console.log("Condomínio selecionado:", condo);
      
      // Atualizar dados de condomínio
      updateResidentData('condoId', condo.id);
      updateResidentData('condoName', condo.name);
      updateResidentData('condoAddress', condo.address || '');
    } else {
      // Limpar dados se nenhum condomínio for selecionado
      updateResidentData('condoId', '');
      updateResidentData('condoName', '');
      updateResidentData('condoAddress', '');
    }
  };
  
  // Validar etapa atual
  const validateStep = () => {
    let stepErrors = {};
    let isValid = true;
    
    if (step === 1) {
      // Validar dados pessoais
      if (!residentData.name.trim()) {
        stepErrors.name = 'Nome é obrigatório';
        isValid = false;
      }
      
      // Usar função isValidCPF para validação
      const cleanCPF = residentData.cpf.replace(/\D/g, '');
      if (!isValidCPF(cleanCPF)) {
        stepErrors.cpf = 'CPF inválido';
        isValid = false;
      }
      
      // Validar telefone (pelo menos 10 dígitos)
      const cleanPhone = residentData.phone.replace(/\D/g, '');
      if (!cleanPhone || cleanPhone.length < 10) {
        stepErrors.phone = 'Telefone inválido';
        isValid = false;
      }
      
      // Validar email
      if (!residentData.email || !isValidEmail(residentData.email)) {
        stepErrors.email = 'Email inválido';
        isValid = false;
      }
    } else if (step === 2) {
      // Validar dados de residência
      if (!residentData.condoId) {
        stepErrors.condoId = 'Selecione um condomínio';
        isValid = false;
      }
      
      if (!residentData.block.trim()) {
        stepErrors.block = 'Bloco/Torre é obrigatório';
        isValid = false;
      }
      
      if (!residentData.unit.trim()) {
        stepErrors.unit = 'Número do apartamento é obrigatório';
        isValid = false;
      }
    } else if (step === 3) {
      // Validar documentos
      if (!residentData.documents.idDocument || residentData.documents.idDocument.length === 0) {
        stepErrors['documents.idDocument'] = 'Documento de identidade é obrigatório';
        isValid = false;
      }
      
      if (!residentData.documents.proofOfResidence || residentData.documents.proofOfResidence.length === 0) {
        stepErrors['documents.proofOfResidence'] = 'Comprovante de residência é obrigatório';
        isValid = false;
      }
    }
    
    setErrors(stepErrors);
    return isValid;
  };
  
  // Avançar para próxima etapa
  const nextStep = () => {
    if (validateStep()) {
      if (step < 3) {
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
  
  // Função para processar uploads de documentos
  const processDocumentUploads = async () => {
    try {
      const uploadPromises = [];
      const documentPaths = {};
      
      // Processar cada tipo de documento
      for (const docType in residentData.documents) {
        if (residentData.documents[docType] && residentData.documents[docType].length > 0) {
          const docs = residentData.documents[docType];
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
  
  // Função para cancelar o cadastro
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
                  for (const docType in residentData.documents) {
                    const docs = residentData.documents[docType];
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
                await cancelRegistration('resident');
                
                // Navegar para a tela de login
               /* navigation.reset({
                  index: 0,
                  routes: [{ name: 'Login' }]
                });*/
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
  

  const submitForm = async () => {
    try {
      setLoading(true);
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      // Garantir que o CPF esteja formatado corretamente
      const cleanCPF = residentData.cpf.replace(/\D/g, '');
      
      // Preparar documentos para upload
      const documentUploads = [];
      
      // Fazer upload de documentos se existirem
      if (residentData.documents.idDocument && residentData.documents.idDocument.length > 0) {
        for (const doc of residentData.documents.idDocument) {
          if (doc.uri && !doc.uploaded) {
            // Fazer upload do documento
            const path = `documents/${currentUser.uid}/idDocument/${Date.now()}_${doc.name}`;
            documentUploads.push(StorageService.uploadFile(path, doc.uri));
          }
        }
      }
      
      if (residentData.documents.proofOfResidence && residentData.documents.proofOfResidence.length > 0) {
        for (const doc of residentData.documents.proofOfResidence) {
          if (doc.uri && !doc.uploaded) {
            // Fazer upload do documento
            const path = `documents/${currentUser.uid}/proofOfResidence/${Date.now()}_${doc.name}`;
            documentUploads.push(StorageService.uploadFile(path, doc.uri));
          }
        }
      }
      
      // Fazer upload opcional da foto de perfil
      if (residentData.documents.profilePhoto && residentData.documents.profilePhoto.length > 0) {
        const profilePhoto = residentData.documents.profilePhoto[0];
        if (profilePhoto.uri && !profilePhoto.uploaded) {
          const path = `profile_photos/${currentUser.uid}/${Date.now()}_${profilePhoto.name}`;
          documentUploads.push(StorageService.uploadFile(path, profilePhoto.uri));
        }
      }
      
      // Aguardar todos os uploads
      const uploadResults = await Promise.all(documentUploads);
      
      // Atualizar URLs dos documentos
      const updatedDocuments = {
        idDocument: residentData.documents.idDocument.map((doc, index) => {
          if (doc.uri && !doc.uploaded) {
            return {
              ...doc,
              url: uploadResults.shift().url,
              path: uploadResults.shift().path,
              uploaded: true
            };
          }
          return doc;
        }),
        proofOfResidence: residentData.documents.proofOfResidence.map((doc, index) => {
          if (doc.uri && !doc.uploaded) {
            return {
              ...doc,
              url: uploadResults.shift().url,
              path: uploadResults.shift().path,
              uploaded: true
            };
          }
          return doc;
        }),
        profilePhoto: residentData.documents.profilePhoto.map((doc, index) => {
          if (doc.uri && !doc.uploaded) {
            return {
              ...doc,
              url: uploadResults.shift().url,
              path: uploadResults.shift().path,
              uploaded: true
            };
          }
          return doc;
        })
      };
      
      // Preparar dados para envio
      const residentProfileData = {
        // Dados pessoais
        name: residentData.name,
        cpf: cleanCPF,
        phone: residentData.phone.replace(/\D/g, ''),
        email: residentData.email,
        
        // Dados de residência
        condoId: residentData.condoId,
        condoName: residentData.condoName,
        block: residentData.block,
        unit: residentData.unit,
        
        // Documentos com URLs atualizadas
        documents: updatedDocuments,
        
        // Foto de perfil URL (se existir)
        photoURL: updatedDocuments.profilePhoto?.[0]?.url,
        
        // Preferências
        notificationPreferences: residentData.notificationPreferences,
        
        // Metadados
        status: 'pending_verification',
        verificationStatus: 'pending',
        profileComplete: true,
        updatedAt: serverTimestamp()
      };
      
      // Atualizar documento do morador no Firestore
      await FirestoreService.updateDocument('residents', currentUser.uid, residentProfileData);
      
      // Atualizar perfil geral (users collection)
      await FirestoreService.updateDocument('users', currentUser.uid, {
        displayName: residentData.name,
        profileComplete: true,
        status: 'pending_verification',
        updatedAt: serverTimestamp(),
        photoURL: updatedDocuments.profilePhoto?.[0]?.url
      });
      
      // Atualizar o contexto de autenticação
      await updateProfile({
        displayName: residentData.name,
        profileComplete: true,
        photoURL: updatedDocuments.profilePhoto?.[0]?.url
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
        'Suas informações foram enviadas e estão em análise. Por favor, aguarde a aprovação do seu condomínio.',
        [{ 
          text: 'OK' 
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
        return 'Informações de Residência';
      case 3:
        return 'Documentação e Preferências';
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
          value={residentData.name}
          onChangeText={(text) => updateResidentData('name', text)}
          mode="outlined"
          error={!!errors.name}
          style={styles.input}
          autoCapitalize="words"
          placeholder="Seu nome completo"
          left={<TextInput.Icon icon="account" />}
        />
        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
      </View>
      
      {/* CPF */}
      <View style={styles.inputContainer}>
        <TextInput
          label="CPF *"
          value={residentData.cpf}
          onChangeText={(text) => updateResidentData('cpf', maskCPF(text))}
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
      
      {/* Telefone */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Telefone *"
          value={residentData.phone}
          onChangeText={(text) => updateResidentData('phone', maskPhone(text))}
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
      
      {/* Email */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Email *"
          value={residentData.email}
          onChangeText={(text) => updateResidentData('email', text)}
          mode="outlined"
          error={!!errors.email}
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="seu.email@exemplo.com"
          left={<TextInput.Icon icon="email" />}
          disabled={!!userProfile?.email}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Suas informações pessoais são usadas para verificar sua identidade e serão compartilhadas apenas com a administração do seu condomínio.
        </Text>
      </View>
    </View>
  );
  
  // Renderizar formulário da etapa 2
  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      {/* Seletor de condomínio */}
      <Text style={styles.sectionTitle}>Selecione seu condomínio *</Text>
      <View style={styles.condoSearchContainer}>
      
        <GooglePlacesCondoSearch
          onSelectCondo={handleSelectCondo}
          initialValue=""
          style={styles.condoSearch}
          insideScrollView={true} 
        />
      </View>
      {errors.condoId && <Text style={styles.errorText}>{errors.condoId}</Text>}
      
      {/* Bloco/Torre */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Bloco/Torre *"
          value={residentData.block}
          onChangeText={(text) => updateResidentData('block', text)}
          mode="outlined"
          error={!!errors.block}
          style={styles.input}
          placeholder="Ex: Bloco A, Torre 2"
          left={<TextInput.Icon icon="office-building" />}
        />
        {errors.block && <Text style={styles.errorText}>{errors.block}</Text>}
      </View>
      
      {/* Apartamento */}
      <View style={styles.inputContainer}>
        <TextInput
          label="Número do apartamento *"
          value={residentData.unit}
          onChangeText={(text) => updateResidentData('unit', text)}
          mode="outlined"
          error={!!errors.unit}
          style={styles.input}
          placeholder="Ex: 101, 202"
          left={<TextInput.Icon icon="door" />}
        />
        {errors.unit && <Text style={styles.errorText}>{errors.unit}</Text>}
      </View>
      
      <View style={styles.infoContainer}>
        <MaterialCommunityIcons name="information-outline" size={20} color="#757575" />
        <Text style={styles.infoText}>
          Essas informações ajudarão os motoristas e entregadores a localizarem corretamente sua residência.
        </Text>
      </View>
      
      {residentData.condoId && (
        <Surface style={styles.selectedCondoCard}>
          <View style={styles.selectedCondoIcon}>
            <MaterialCommunityIcons name="office-building" size={28} color="#FFFFFF" />
          </View>
          <View style={styles.selectedCondoInfo}>
            <Text style={styles.selectedCondoName}>{residentData.condoName}</Text>
            <Text style={styles.selectedCondoAddress}>
              {residentData.block && residentData.unit 
                ? `${residentData.block}, Apto ${residentData.unit}`
                : 'Informe bloco e apartamento'}
            </Text>
          </View>
          <IconButton
            icon="check-circle"
            color="#4CAF50"
            size={24}
          />
        </Surface>
      )}
    </View>
  );
  
  // Renderizar formulário da etapa 3
  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      {/* Documento de identidade */}
      <DocumentUpload
        title="Documento de identidade"
        subtitle="RG, CNH ou outro documento com foto"
        documentType="idDocument"
        initialDocuments={residentData.documents.idDocument}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('idDocument', docs)}
        maxDocuments={2}
        required
      />
      {errors['documents.idDocument'] && (
        <Text style={styles.errorText}>{errors['documents.idDocument']}</Text>
      )}
      
      {/* Comprovante de residência */}
      <DocumentUpload
        title="Comprovante de residência"
        subtitle="Conta de luz, água ou outro documento que comprove seu endereço"
        documentType="proofOfResidence"
        initialDocuments={residentData.documents.proofOfResidence}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('proofOfResidence', docs)}
        maxDocuments={2}
        required
      />
      {errors['documents.proofOfResidence'] && (
        <Text style={styles.errorText}>{errors['documents.proofOfResidence']}</Text>
      )}
      
      {/* Foto de perfil */}
      <DocumentUpload
        title="Foto de perfil"
        subtitle="Foto de rosto clara e recente (opcional)"
        documentType="profilePhoto"
        initialDocuments={residentData.documents.profilePhoto}
        userId={currentUser?.uid}
        onDocumentsChange={(docs) => handleDocumentsChange('profilePhoto', docs)}
        maxDocuments={1}
      />
      
      {/* Preferências de notificação */}
      <View style={styles.preferencesContainer}>
        <Text style={styles.sectionTitle}>Preferências de notificação</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Solicitações de acesso</Text>
            <Text style={styles.preferenceDescription}>
              Receba notificações quando motoristas solicitarem acesso
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              residentData.notificationPreferences.accessRequests && styles.toggleButtonActive
            ]}
            onPress={() => toggleNotificationPreference('accessRequests')}
          >
            <View style={[
              styles.toggleDot,
              residentData.notificationPreferences.accessRequests && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Atualizações de status</Text>
            <Text style={styles.preferenceDescription}>
              Receba notificações sobre mudanças de status nas solicitações
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              residentData.notificationPreferences.statusUpdates && styles.toggleButtonActive
            ]}
            onPress={() => toggleNotificationPreference('statusUpdates')}
          >
            <View style={[
              styles.toggleDot,
              residentData.notificationPreferences.statusUpdates && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceTextContainer}>
            <Text style={styles.preferenceTitle}>Anúncios do condomínio</Text>
            <Text style={styles.preferenceDescription}>
              Receba notificações sobre anúncios importantes do condomínio
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              residentData.notificationPreferences.announcements && styles.toggleButtonActive
            ]}
            onPress={() => toggleNotificationPreference('announcements')}
          >
            <View style={[
              styles.toggleDot,
              residentData.notificationPreferences.announcements && styles.toggleDotActive
            ]} />
          </TouchableOpacity>
        </View>
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
      default:a
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
    progress={step / 3}
    color={theme.colors.primary}
    style={styles.progressBar}
  />
  <Text style={styles.progressText}>
    Etapa {step} de 3: {getStepTitle()}
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
            {step === 3 ? 'Finalizar' : 'Próximo'}
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
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#424242',
    marginLeft: 8,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  condoSearchContainer: {
    marginBottom: 24,
  },
  condoSearch: {
    flex: 1,
  },
  selectedCondoCard: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2,
  },
  selectedCondoIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedCondoInfo: {
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
  preferencesContainer: {
    marginTop: 16,
  },
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
    paddingVertical: 16,
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

export default ResidentRegisterScreen;