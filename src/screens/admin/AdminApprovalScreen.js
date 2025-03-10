// src/screens/admin/AdminApprovalScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native';
import { 
  Text, 
  Surface, 
  Button, 
  TextInput, 
  Divider, 
  useTheme, 
  ActivityIndicator,
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';

// Serviços
import FirestoreService from '../../services/firestore.service';
import NotificationService from '../../services/notification.service';

// Hooks customizados
import { useAdmin } from '../../hooks/useAdmin';

// Componentes
import DocumentViewer from '../../components/DocumentViewer';
import AddressDisplay from '../../components/AddressDisplay';

const AdminApprovalScreen = () => {
  const theme = useTheme();
  const route = useRoute();
  const navigation = useNavigation();
  const { updateUserStatus } = useAdmin();
  
  // Parâmetros da rota
  const { userId, userType, userName } = route.params || {};
  
  // Estados
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingApproval, setProcessingApproval] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  
  // Carregar dados do usuário
  useEffect(() => {
    loadUserData();
  }, [userId, userType]);
  
  // Carregar dados completos do usuário
  const loadUserData = async () => {
    try {
      setLoading(true);
      
      if (!userId || !userType) {
        throw new Error('ID de usuário ou tipo não fornecido');
      }
      
      // Determinar a coleção com base no tipo
      let collectionName;
      switch (userType) {
        case 'resident':
          collectionName = 'residents';
          break;
        case 'driver':
          collectionName = 'drivers';
          break;
        case 'condo':
          collectionName = 'condos';
          break;
        default:
          throw new Error('Tipo de usuário inválido');
      }
      
      // Buscar documento do usuário
      const userData = await FirestoreService.getDocument(collectionName, userId);
      
      if (!userData) {
        throw new Error('Usuário não encontrado');
      }
      
      // Buscar documento geral do usuário
      const generalUserData = await FirestoreService.getDocument('users', userId);
      
      setUser({
        ...userData,
        ...generalUserData,
        id: userId,
        type: userType
      });
    } catch (error) {
      console.error('Erro ao carregar dados do usuário:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados deste usuário. Tente novamente mais tarde.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  // Aprovar usuário
  const handleApprove = async () => {
    try {
      setProcessingApproval(true);
      
      // Atualizar status do usuário
      await updateUserStatus(userId, 'active', 'Aprovado pelo administrador');
      
      // Enviar notificação
      try {
        if (user.notificationToken) {
          await NotificationService.sendLocalNotification(
            'Cadastro Aprovado',
            'Seu cadastro foi aprovado. Você já pode utilizar o aplicativo.',
            { type: 'approval_notification', status: 'approved' }
          );
        }
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
        // Não interromper o fluxo por erro de notificação
      }
      
      // Exibir sucesso
      Alert.alert(
        'Usuário Aprovado',
        'O usuário foi aprovado com sucesso e já pode acessar o aplicativo.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao aprovar usuário:', error);
      Alert.alert('Erro', 'Não foi possível aprovar o usuário. Tente novamente mais tarde.');
    } finally {
      setProcessingApproval(false);
    }
  };
  
  // Rejeitar usuário
  const handleReject = async () => {
    try {
      if (!rejectionReason.trim()) {
        Alert.alert('Erro', 'Por favor, informe o motivo da rejeição.');
        return;
      }
      
      setProcessingApproval(true);
      
      // Atualizar status do usuário
      await updateUserStatus(userId, 'rejected', rejectionReason);
      
      // Enviar notificação
      try {
        if (user.notificationToken) {
          await NotificationService.sendLocalNotification(
            'Cadastro Rejeitado',
            'Seu cadastro não foi aprovado. Entre em contato para mais informações.',
            { type: 'approval_notification', status: 'rejected', reason: rejectionReason }
          );
        }
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
        // Não interromper o fluxo por erro de notificação
      }
      
      // Exibir sucesso
      Alert.alert(
        'Usuário Rejeitado',
        'O cadastro foi rejeitado e o usuário foi notificado.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao rejeitar usuário:', error);
      Alert.alert('Erro', 'Não foi possível rejeitar o usuário. Tente novamente mais tarde.');
    } finally {
      setProcessingApproval(false);
      setShowRejectionForm(false);
    }
  };
  
  // Visualizar documento
  const handleViewDocument = (document) => {
    setActiveDocument(document);
  };
  
  // Fechar visualizador de documento
  const handleCloseDocumentViewer = () => {
    setActiveDocument(null);
  };
  
  // Renderização condicional baseada no tipo de usuário
  const renderUserDetails = () => {
    if (!user) return null;
    
    switch (user.type) {
      case 'resident':
        return renderResidentDetails();
      case 'driver':
        return renderDriverDetails();
      case 'condo':
        return renderCondoDetails();
      default:
        return (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>Tipo de usuário não suportado</Text>
          </View>
        );
    }
  };
  
  // Renderizar detalhes do morador
  const renderResidentDetails = () => {
    const residentData = user.personalData || {};
    const residenceData = user.residenceData || {};
    
    return (
      <View>
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nome:</Text>
            <Text style={styles.infoValue}>{residentData.name || user.displayName || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{residentData.cpf || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{residentData.email || user.email || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Telefone:</Text>
            <Text style={styles.infoValue}>{residentData.phone || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Dados de Residência</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Condomínio:</Text>
            <Text style={styles.infoValue}>{residenceData.condoName || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Bloco/Torre:</Text>
            <Text style={styles.infoValue}>{residenceData.block || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Unidade:</Text>
            <Text style={styles.infoValue}>{residenceData.unit || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Documentos</Text>
          {renderDocumentList()}
        </Surface>
      </View>
    );
  };
  
  // Renderizar detalhes do motorista
  const renderDriverDetails = () => {
    const personalData = user.personalData || {};
    const licenseData = user.licenseData || {};
    const vehicleData = user.vehicleData || {};
    const addressData = user.addressData || {};
    
    return (
      <View>
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Dados Pessoais</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nome:</Text>
            <Text style={styles.infoValue}>{personalData.name || user.displayName || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CPF:</Text>
            <Text style={styles.infoValue}>{personalData.cpf || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{personalData.email || user.email || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Telefone:</Text>
            <Text style={styles.infoValue}>{personalData.phone || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Dados de Habilitação</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CNH:</Text>
            <Text style={styles.infoValue}>{licenseData.cnh || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Categoria:</Text>
            <Text style={styles.infoValue}>{licenseData.cnhType || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Veículo</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Modelo:</Text>
            <Text style={styles.infoValue}>{vehicleData.make} {vehicleData.model || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Ano:</Text>
            <Text style={styles.infoValue}>{vehicleData.year || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Cor:</Text>
            <Text style={styles.infoValue}>{vehicleData.color || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Placa:</Text>
            <Text style={styles.infoValue}>{vehicleData.plate || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>
          <AddressDisplay 
            address={addressData.fullAddress} 
            details={addressData} 
          />
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Aplicativos</Text>
          <View style={styles.chipContainer}>
            {user.workData?.appServices?.map((app, index) => (
              <Chip key={index} style={styles.chip} mode="outlined">
                {app}
              </Chip>
            ))}
            {(!user.workData?.appServices || user.workData.appServices.length === 0) && (
              <Text style={styles.emptyText}>Nenhum aplicativo informado</Text>
            )}
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Documentos</Text>
          {renderDocumentList()}
        </Surface>
      </View>
    );
  };
  
  // Renderizar detalhes do condomínio
  const renderCondoDetails = () => {
    const condoData = user.condoData || {};
    const addressData = user.addressData || {};
    const managerData = user.managerData || {};
    const condoInfo = user.condoInfo || {};
    
    return (
      <View>
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Dados do Condomínio</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nome:</Text>
            <Text style={styles.infoValue}>{condoData.name || user.displayName || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>CNPJ:</Text>
            <Text style={styles.infoValue}>{condoData.cnpj || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{condoData.email || user.email || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Telefone:</Text>
            <Text style={styles.infoValue}>{condoData.phone || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Endereço</Text>
          <AddressDisplay 
            address={addressData.fullAddress} 
            details={addressData} 
          />
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Informações</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Total de Unidades:</Text>
            <Text style={styles.infoValue}>{condoInfo.totalUnits || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Total de Blocos:</Text>
            <Text style={styles.infoValue}>{condoInfo.totalBlocks || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Responsável</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Nome:</Text>
            <Text style={styles.infoValue}>{managerData.name || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{managerData.email || 'Não informado'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Telefone:</Text>
            <Text style={styles.infoValue}>{managerData.phone || 'Não informado'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Assinatura</Text>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Plano:</Text>
            <Text style={styles.infoValue}>{user.subscription?.plan || 'Gratuito'}</Text>
          </View>
        </Surface>
        
        <Surface style={styles.section}>
          <Text style={styles.sectionTitle}>Documentos</Text>
          {renderDocumentList()}
        </Surface>
      </View>
    );
  };
  
  // Renderizar lista de documentos
  const renderDocumentList = () => {
    const documents = user?.documents || {};
    const documentTypes = Object.keys(documents);
    
    if (documentTypes.length === 0) {
      return <Text style={styles.emptyText}>Nenhum documento enviado</Text>;
    }
    
    return (
      <View style={styles.documentsContainer}>
        {documentTypes.map(docType => {
          const docList = documents[docType] || [];
          
          if (docList.length === 0) return null;
          
          return (
            <View key={docType} style={styles.documentTypeContainer}>
              <Text style={styles.documentTypeTitle}>{getDocumentTypeTitle(docType)}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {docList.map((doc, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.documentItem}
                    onPress={() => handleViewDocument(doc)}
                  >
                    {doc.thumbnailUrl ? (
                      <Image
                        source={{ uri: doc.thumbnailUrl }}
                        style={styles.documentThumbnail}
                        resizeMode="cover"
                      />
                    ) : (
                      <View style={styles.documentIconContainer}>
                        <MaterialCommunityIcons
                          name={getDocumentIcon(doc.type)}
                          size={32}
                          color={theme.colors.primary}
                        />
                      </View>
                    )}
                    <Text style={styles.documentName} numberOfLines={1}>
                      Documento {index + 1}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          );
        })}
      </View>
    );
  };
  
  // Obter título amigável para tipo de documento
  const getDocumentTypeTitle = (docType) => {
    const titles = {
      idDocument: 'Documento de Identidade',
      profilePhoto: 'Foto de Perfil',
      proofOfResidence: 'Comprovante de Residência',
      cnh: 'Carteira de Habilitação',
      vehicleDocument: 'Documento do Veículo',
      vehiclePhoto: 'Foto do Veículo',
      condoRegistration: 'Registro do Condomínio',
      condoPhoto: 'Foto do Condomínio',
      condoLogo: 'Logo do Condomínio'
    };
    
    return titles[docType] || docType;
  };
  
  // Obter ícone para tipo de documento
  const getDocumentIcon = (mimeType) => {
    if (mimeType?.startsWith('image/')) {
      return 'file-image';
    } else if (mimeType?.includes('pdf')) {
      return 'file-pdf-box';
    } else {
      return 'file-document';
    }
  };
  
  // Renderizar formulário de rejeição
  const renderRejectionForm = () => (
    <Surface style={styles.rejectionForm}>
      <Text style={styles.rejectionTitle}>Motivo da Rejeição</Text>
      <TextInput
        mode="outlined"
        multiline
        numberOfLines={4}
        value={rejectionReason}
        onChangeText={setRejectionReason}
        placeholder="Informe o motivo da rejeição para o usuário"
        style={styles.rejectionInput}
      />
      <View style={styles.rejectionButtons}>
        <Button
          mode="outlined"
          onPress={() => setShowRejectionForm(false)}
          style={styles.rejectionCancelButton}
          disabled={processingApproval}
        >
          Cancelar
        </Button>
        <Button
          mode="contained"
          onPress={handleReject}
          style={styles.rejectionConfirmButton}
          loading={processingApproval}
          disabled={processingApproval}
        >
          Confirmar
        </Button>
      </View>
    </Surface>
  );
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando dados do usuário...</Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Cabeçalho */}
        <Surface style={styles.headerCard}>
          <View style={styles.userHeader}>
            <View style={[styles.userTypeIconContainer, { backgroundColor: getUserTypeColor(user?.type) + '20' }]}>
              <MaterialCommunityIcons name={getUserTypeIcon(user?.type)} size={32} color={getUserTypeColor(user?.type)} />
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{user?.displayName || 'Usuário sem nome'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'Sem email'}</Text>
              <View style={styles.userTypeChip}>
                <Text style={[styles.userTypeText, { color: getUserTypeColor(user?.type) }]}>
                  {getUserTypeLabel(user?.type)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Status atual:</Text>
            <View style={[styles.statusChip, { backgroundColor: getStatusColor(user?.status) + '20' }]}>
              <Text style={[styles.statusText, { color: getStatusColor(user?.status) }]}>
                {getStatusLabel(user?.status)}
              </Text>
            </View>
          </View>
        </Surface>
        
        {/* Detalhes do usuário */}
        {renderUserDetails()}
        
        {/* Formulário de rejeição */}
        {showRejectionForm && renderRejectionForm()}
        
        {/* Botões de ação */}
        {!showRejectionForm && (
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              icon="close"
              onPress={() => setShowRejectionForm(true)}
              style={styles.rejectButton}
              labelStyle={styles.rejectButtonLabel}
              disabled={processingApproval || user?.status === 'active' || user?.status === 'rejected'}
            >
              Rejeitar
            </Button>
            <Button
              mode="contained"
              icon="check"
              onPress={handleApprove}
              style={styles.approveButton}
              labelStyle={styles.approveButtonLabel}
              loading={processingApproval}
              disabled={processingApproval || user?.status === 'active' || user?.status === 'rejected'}
            >
              Aprovar
            </Button>
          </View>
        )}
      </ScrollView>
      
      {/* Visualizador de documento */}
      {activeDocument && (
        <DocumentViewer 
          document={activeDocument} 
          visible={!!activeDocument} 
          onClose={handleCloseDocumentViewer} 
        />
      )}
    </View>
  );
};

// Funções auxiliares para exibição
const getUserTypeIcon = (type) => {
  switch (type) {
    case 'resident':
      return 'home-account';
    case 'driver':
      return 'car';
    case 'condo':
      return 'office-building';
    default:
      return 'account';
  }
};

const getUserTypeColor = (type) => {
  switch (type) {
    case 'resident':
      return '#2196F3';
    case 'driver':
      return '#FF9800';
    case 'condo':
      return '#4CAF50';
    default:
      return '#9E9E9E';
  }
};

const getUserTypeLabel = (type) => {
  switch (type) {
    case 'resident':
      return 'Morador';
    case 'driver':
      return 'Motorista';
    case 'condo':
      return 'Condomínio';
    default:
      return 'Desconhecido';
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case 'active':
      return '#4CAF50';
    case 'pending_verification':
      return '#FF9800';
    case 'rejected':
      return '#F44336';
    default:
      return '#9E9E9E';
  }
};

const getStatusLabel = (status) => {
  switch (status) {
    case 'active':
      return 'Ativo';
    case 'pending_verification':
      return 'Aguardando Verificação';
    case 'rejected':
      return 'Rejeitado';
    default:
      return 'Desconhecido';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  userTypeIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  userTypeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  userTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  statusInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#757575',
    marginRight: 8,
  },
  statusChip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  section: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#424242',
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    fontStyle: 'italic',
  },
  documentsContainer: {
    marginTop: 8,
  },
  documentTypeContainer: {
    marginBottom: 16,
  },
  documentTypeTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  documentItem: {
    width: 100,
    marginRight: 12,
    alignItems: 'center',
  },
  documentThumbnail: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 4,
  },
  documentIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  documentName: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  rejectButton: {
    flex: 1,
    marginRight: 8,
    borderColor: '#F44336',
  },
  rejectButtonLabel: {
    color: '#F44336',
  },
  approveButton: {
    flex: 1,
    marginLeft: 8,
    backgroundColor: '#4CAF50',
  },
  approveButtonLabel: {
    color: '#FFFFFF',
  },
  rejectionForm: {
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
    marginBottom: 16,
    elevation: 2,
  },
  rejectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  rejectionInput: {
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  rejectionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  rejectionCancelButton: {
    marginRight: 8,
  },
  rejectionConfirmButton: {
    backgroundColor: '#F44336',
  }
});

export default AdminApprovalScreen;