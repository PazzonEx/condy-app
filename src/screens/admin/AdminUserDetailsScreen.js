// src/screens/admin/AdminUserDetailsScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert, 
  Image, 
  Linking 
} from 'react-native';
import { 
  Text, 
  Surface, 
  Button, 
  ActivityIndicator,
  Divider, 
  useTheme,
  IconButton,
  Portal,
  Dialog,
  Avatar,
  Chip
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Serviços
import FirestoreService from '../../services/firestore.service';
import NotificationService from '../../services/notification.service';

// Componentes
import ConfirmDialog from '../../components/ConfirmDialog';
import DocumentViewer from '../../components/DocumentViewer';
import AddressDisplay from '../../components/AddressDisplay';

const AdminUserDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Parâmetros da rota
  const { userId, userType, userName } = route.params || {};
  
  // Estados
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('info');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeDocument, setActiveDocument] = useState(null);
  
  // Carregar dados do usuário
  useEffect(() => {
    loadUserData();
  }, [userId, userType]);
  
  // Função para carregar dados do usuário
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
      Alert.alert('Erro', 'Não foi possível carregar os dados deste usuário.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };
  
  // Navegar para tela de aprovação
  const navigateToApproval = () => {
    navigation.navigate('AdminApproval', {
      userId,
      userType,
      userName: userName || user?.displayName || 'Usuário'
    });
  };
  
  // Excluir usuário
  const handleDeleteUser = async () => {
    try {
      setDeleting(true);
      
      // Excluir documento específico do tipo
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
      
      await FirestoreService.deleteDocument(collectionName, userId);
      
      // Excluir documento do usuário
      await FirestoreService.deleteDocument('users', userId);
      
      // Mostrar mensagem de sucesso
      Alert.alert(
        'Usuário excluído',
        'O usuário foi excluído com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      Alert.alert(
        'Erro',
        'Não foi possível excluir o usuário. Tente novamente mais tarde.'
      );
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };
  
  // Vizualiar documento
  const handleViewDocument = (document) => {
    setActiveDocument(document);
  };
  
  // Enviar notificação para o usuário
  const handleSendNotification = async () => {
    try {
      if (!user.notificationToken) {
        Alert.alert(
          'Erro',
          'Este usuário não possui token de notificação registrado.'
        );
        return;
      }
      
      await NotificationService.sendLocalNotification(
        'Mensagem do Administrador',
        'Esta é uma mensagem de teste do administrador do sistema.',
        { type: 'admin_message' }
      );
      
      Alert.alert('Sucesso', 'Notificação enviada com sucesso!');
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação.');
    }
  };
  
  // Entrar em contato com o usuário
  const handleContactUser = () => {
    const email = user.email;
    const subject = 'Contato do administrador do Condy';
    const body = `Olá ${userName || 'usuário'},\n\n`;
    
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };
  
  // Renderizar conteúdo baseado no tipo de usuário
  const renderUserContent = () => {
    switch (userType) {
      case 'resident':
        return renderResidentContent();
      case 'driver':
        return renderDriverContent();
      case 'condo':
        return renderCondoContent();
      default:
        return (
          <Surface style={styles.contentCard}>
            <Text style={styles.errorText}>Tipo de usuário não suportado.</Text>
          </Surface>
        );
    }
  };
  
  // Renderizar conteúdo de morador
  const renderResidentContent = () => {
    if (activeTab === 'info') {
      const personalData = user.personalData || {};
      const residenceData = user.residenceData || {};
      
      return (
        <View>
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{personalData.name || user.displayName || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CPF:</Text>
              <Text style={styles.infoValue}>{personalData.cpf || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>{personalData.phone || 'Não informado'}</Text>
            </View>
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Residência</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Condomínio:</Text>
              <Text style={styles.infoValue}>{residenceData.condoName || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bloco/Torre:</Text>
              <Text style={styles.infoValue}>{residenceData.block || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Unidade:</Text>
              <Text style={styles.infoValue}>{residenceData.unit || 'Não informado'}</Text>
            </View>
          </Surface>
        </View>
      );
    } else if (activeTab === 'docs') {
      return renderDocumentsTab();
    } else if (activeTab === 'activity') {
      return renderActivityTab();
    }
    
    return null;
  };
  
  // Renderizar conteúdo de motorista
  const renderDriverContent = () => {
    if (activeTab === 'info') {
      const personalData = user.personalData || {};
      const licenseData = user.licenseData || {};
      const vehicleData = user.vehicleData || {};
      const addressData = user.addressData || {};
      
      return (
        <View>
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Dados Pessoais</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{personalData.name || user.displayName || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CPF:</Text>
              <Text style={styles.infoValue}>{personalData.cpf || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{user.email || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>{personalData.phone || 'Não informado'}</Text>
            </View>
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Habilitação</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CNH:</Text>
              <Text style={styles.infoValue}>{licenseData.cnh || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Categoria:</Text>
              <Text style={styles.infoValue}>{licenseData.cnhType || 'Não informado'}</Text>
            </View>
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Veículo</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Modelo:</Text>
              <Text style={styles.infoValue}>
                {vehicleData.make ? `${vehicleData.make} ${vehicleData.model}` : 'Não informado'}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Ano:</Text>
              <Text style={styles.infoValue}>{vehicleData.year || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cor:</Text>
              <Text style={styles.infoValue}>{vehicleData.color || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Placa:</Text>
              <Text style={styles.infoValue}>{vehicleData.plate || 'Não informado'}</Text>
            </View>
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Endereço</Text>
            <Divider style={styles.divider} />
            
            <AddressDisplay 
              address={addressData.fullAddress} 
              details={addressData} 
            />
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Aplicativos</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.chipsContainer}>
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
        </View>
      );
    } else if (activeTab === 'docs') {
      return renderDocumentsTab();
    } else if (activeTab === 'activity') {
      return renderActivityTab();
    }
    
    return null;
  };
  
  // Renderizar conteúdo de condomínio
  const renderCondoContent = () => {
    if (activeTab === 'info') {
      const condoData = user.condoData || {};
      const addressData = user.addressData || {};
      const managerData = user.managerData || {};
      const condoInfo = user.condoInfo || {};
      
      return (
        <View>
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Dados do Condomínio</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{condoData.name || user.displayName || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>CNPJ:</Text>
              <Text style={styles.infoValue}>{condoData.cnpj || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{condoData.email || user.email || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>{condoData.phone || 'Não informado'}</Text>
            </View>
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Endereço</Text>
            <Divider style={styles.divider} />
            
            <AddressDisplay 
              address={addressData.fullAddress} 
              details={addressData} 
            />
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Informações</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total de Unidades:</Text>
              <Text style={styles.infoValue}>{condoInfo.totalUnits || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Total de Blocos:</Text>
              <Text style={styles.infoValue}>{condoInfo.totalBlocks || 'Não informado'}</Text>
            </View>
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Responsável</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nome:</Text>
              <Text style={styles.infoValue}>{managerData.name || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{managerData.email || 'Não informado'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Telefone:</Text>
              <Text style={styles.infoValue}>{managerData.phone || 'Não informado'}</Text>
            </View>
          </Surface>
          
          <Surface style={styles.contentCard}>
            <Text style={styles.sectionTitle}>Assinatura</Text>
            <Divider style={styles.divider} />
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Plano:</Text>
              <Text style={styles.infoValue}>{user.subscription?.plan || 'Gratuito'}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{user.subscription?.status || 'Ativo'}</Text>
            </View>
          </Surface>
        </View>
      );
    } else if (activeTab === 'docs') {
      return renderDocumentsTab();
    } else if (activeTab === 'activity') {
      return renderActivityTab();
    }
    
    return null;
  };
  
  // Renderizar aba de documentos
  const renderDocumentsTab = () => {
    const documents = user?.documents || {};
    const documentTypes = Object.keys(documents);
    
    if (documentTypes.length === 0) {
      return (
        <Surface style={styles.contentCard}>
          <Text style={styles.emptyText}>Nenhum documento enviado</Text>
        </Surface>
      );
    }
    
    return (
      <View>
        {documentTypes.map(docType => {
          const docList = documents[docType] || [];
          
          if (docList.length === 0) return null;
          
          return (
            <Surface key={docType} style={styles.contentCard}>
              <Text style={styles.sectionTitle}>{getDocumentTypeTitle(docType)}</Text>
              <Divider style={styles.divider} />
              
              <View style={styles.documentsContainer}>
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
              </View>
            </Surface>
          );
        })}
      </View>
    );
  };
  
  // Renderizar aba de atividade
  const renderActivityTab = () => {
    return (
      <Surface style={styles.contentCard}>
        <Text style={styles.sectionTitle}>Histórico de Atividades</Text>
        <Divider style={styles.divider} />
        
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="history" size={48} color="#BDBDBD" />
          <Text style={styles.emptyText}>Histórico de atividades não disponível</Text>
        </View>
      </Surface>
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
  
  // Obter label do status
  const getStatusLabel = (status) => {
    switch (status) {
      case 'active':
        return 'Ativo';
      case 'pending_verification':
        return 'Pendente';
      case 'rejected':
        return 'Rejeitado';
      default:
        return 'Desconhecido';
    }
  };
  
  // Obter cor do status
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
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Cabeçalho com informações do usuário */}
        <Surface style={styles.headerCard}>
          <View style={styles.userInfoHeader}>
            {user?.documents?.profilePhoto?.[0]?.thumbnailUrl ? (
              <Avatar.Image 
                size={80} 
                source={{ uri: user.documents.profilePhoto[0].thumbnailUrl }} 
                style={styles.userAvatar}
              />
            ) : (
              <Avatar.Icon 
                size={80} 
                icon={getUserTypeIcon(userType)}
                style={[styles.userAvatar, { backgroundColor: getUserTypeColor(userType) + '30' }]}
                color={getUserTypeColor(userType)}
              />
            )}
            
            <View style={styles.userInfoContainer}>
              <Text style={styles.userName}>
                {user?.displayName || userName || 'Usuário sem nome'}
              </Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              
              <View style={styles.userMeta}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(user?.status) + '20' }]}>
                  <Text style={[styles.statusText, { color: getStatusColor(user?.status) }]}>
                    {getStatusLabel(user?.status)}
                  </Text>
                </View>
                
                <Text style={styles.createdAt}>
                  Criado em {getFormattedDate(user?.createdAt)}
                </Text>
              </View>
            </View>
          </View>
          
          {user?.status === 'pending_verification' && (
            <View style={styles.approvalActions}>
              <Button 
                mode="contained"
                onPress={navigateToApproval}
                style={styles.approvalButton}
                icon="account-check"
              >
                Aprovar/Rejeitar
              </Button>
            </View>
          )}
        </Surface>
        
        {/* Abas de navegação */}
        <Surface style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'info' && styles.activeTab]}
            onPress={() => setActiveTab('info')}
          >
            <MaterialCommunityIcons 
              name="information-outline" 
              size={20} 
              color={activeTab === 'info' ? theme.colors.primary : '#757575'} 
            />
            <Text style={[styles.tabText, activeTab === 'info' && styles.activeTabText]}>
              Informações
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'docs' && styles.activeTab]}
            onPress={() => setActiveTab('docs')}
          >
            <MaterialCommunityIcons 
              name="file-document-outline" 
              size={20} 
              color={activeTab === 'docs' ? theme.colors.primary : '#757575'} 
            />
            <Text style={[styles.tabText, activeTab === 'docs' && styles.activeTabText]}>
              Documentos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'activity' && styles.activeTab]}
            onPress={() => setActiveTab('activity')}
          >
            <MaterialCommunityIcons 
              name="history" 
              size={20} 
              color={activeTab === 'activity' ? theme.colors.primary : '#757575'} 
            />
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>
              Atividade
            </Text>
          </TouchableOpacity>
        </Surface>
        
        {/* Conteúdo principal */}
        {renderUserContent()}
        
        {/* Ações do admin */}
        <Surface style={styles.actionsCard}>
          <Button 
            mode="outlined" 
            icon="bell-outline" 
            onPress={handleSendNotification}
            style={styles.actionButton}
          >
            Enviar Notificação
          </Button>
          
          <Button 
            mode="outlined" 
            icon="email-outline" 
            onPress={handleContactUser}
            style={styles.actionButton}
          >
            Enviar Email
          </Button>
          
          <Button 
            mode="outlined" 
            icon="delete-outline" 
            onPress={() => setShowDeleteDialog(true)}
            style={[styles.actionButton, styles.deleteButton]}
            color="#F44336"
          >
            Excluir Usuário
          </Button>
        </Surface>
      </ScrollView>
      
      {/* Modal de confirmação de exclusão */}
      <Portal>
        <Dialog
          visible={showDeleteDialog}
          onDismiss={() => setShowDeleteDialog(false)}
        >
          <Dialog.Title>Excluir Usuário</Dialog.Title>
          <Dialog.Content>
            <Text>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancelar</Button>
            <Button 
              onPress={handleDeleteUser} 
              loading={deleting}
              disabled={deleting}
              color="#F44336"
            >
              Excluir
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Visualizador de documento */}
      {activeDocument && (
        <DocumentViewer 
          document={activeDocument} 
          visible={!!activeDocument} 
          onClose={() => setActiveDocument(null)} 
        />
      )}
    </View>
  );
};

// Obter ícone com base no tipo de usuário
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

// Obter cor com base no tipo de usuário
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

// Formatar data
const getFormattedDate = (timestamp) => {
  if (!timestamp) return 'Data desconhecida';
  
  try {
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return 'Data inválida';
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
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  userInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    marginRight: 16,
  },
  userInfoContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  createdAt: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  approvalActions: {
    marginTop: 16,
  },
  approvalButton: {
    borderRadius: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#2196F3',
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 4,
  },
  activeTabText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  contentCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  divider: {
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    margin: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
  documentsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  documentItem: {
    width: 100,
    marginRight: 12,
    marginBottom: 12,
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
  actionsCard: {
    padding: 16,
    borderRadius: 8,
  },
  actionButton: {
    marginBottom: 8,
  },
  deleteButton: {
    borderColor: '#F44336',
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  }
});

export default AdminUserDetailsScreen;