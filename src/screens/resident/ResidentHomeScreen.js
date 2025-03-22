import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, FAB, Portal, Modal, Chip, Button as PaperButton, ActivityIndicator,useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Button from '../../components/Button';
import RequestStatusBadge from '../../components/RequestStatusBadge';
import { Surface, Divider } from 'react-native-paper';
import LottieView from 'lottie-react-native';
import { formatVehiclePlate } from '../../utils/format';
// Hooks e serviços
import { useAuth } from '../../hooks/useAuth';
import AccessService from '../../services/access.service';

// Componentes
import { COLORS, globalStyles} from '../../styles/theme';

// Cores padrão (caso o objeto COLORS não esteja disponível)
const defaultColors = {
  primary: '#1E88E5',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  grey: {
    400: '#BDBDBD',
    600: '#757575'
  },
  white: '#FFFFFF',
  dark: '#212121',
  light: '#F5F5F5'
};

// Usar as cores do tema ou as cores padrão
const getColor = (colorPath) => {
  const parts = colorPath.split('.');
  let current = COLORS || defaultColors;
  
  for (const part of parts) {
    if (current[part] === undefined) {
      return defaultColors[parts[0]] || '#1E88E5';
    }
    current = current[part];
  }
  
  return current;
};

const ResidentHomeScreen = ({ navigation }) => {
  const { userProfile } = useAuth();  
  // Estados
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const [modalVisible, setModalVisible] = useState(false);

  const theme = useTheme();
 
  
  // Carregar solicitações
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filter])
  );
  
  // Buscar solicitações do servidor
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Definir filtro de status com base na seleção do usuário
      let statusFilter = null;
      if (filter === 'active') {
        statusFilter = ['pending', 'authorized', 'arrived', 'pending_resident'];
      } else if (filter === 'completed') {
        statusFilter = ['completed', 'entered', 'denied', 'canceled'];
      }
      
      // Usar o método existente no AccessService
      const accessRequests = await AccessService.getAccessRequests(statusFilter);
      setRequests(accessRequests);
      
      console.log(`Carregadas ${accessRequests.length} solicitações`);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      setError('Não foi possível carregar as solicitações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Atualizar puxando a tela para baixo
  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };
  
  // Ir para detalhes da solicitação
  const handleRequestDetails = (requestId) => {
    navigation.navigate('AccessDetails', { requestId });
  };
  
  // Mostrar QR Code
  const handleShowQR = (requestId) => {
    navigation.navigate('AccessDetails', { requestId, showQR: true });
  };
  
  // Cancelar solicitação
  const handleCancelRequest = (requestId) => {
    Alert.alert(
      'Cancelar Solicitação',
      'Tem certeza que deseja cancelar esta solicitação?',
      [
        { text: 'Não', style: 'cancel' },
        { 
          text: 'Sim', 
          onPress: async () => {
            try {
              await AccessService.updateAccessRequestStatus(requestId, 'canceled');
              // Atualizar a lista
              loadRequests();
            } catch (error) {
              console.error('Erro ao cancelar solicitação:', error);
              Alert.alert('Erro', 'Não foi possível cancelar a solicitação');
            }
          }
        }
      ]
    );
  };
  
  // Aprovar solicitação pendente de morador
  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      await AccessService.approveResidentRequest(requestId);
      Alert.alert('Sucesso', 'Solicitação aprovada com sucesso!');
      await loadRequests();
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      Alert.alert('Erro', 'Não foi possível aprovar a solicitação');
    } finally {
      setLoading(false);
    }
  };
  
  // Rejeitar solicitação pendente de morador
  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      await AccessService.denyResidentRequest(requestId);
      Alert.alert('Sucesso', 'Solicitação rejeitada com sucesso!');
      await loadRequests();
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      Alert.alert('Erro', 'Não foi possível rejeitar a solicitação');
    } finally {
      setLoading(false);
    }
  };
  
  // Criar nova solicitação
  const handleCreateRequest = (driverType) => {
    setModalVisible(false);
    navigation.navigate('NewAccessRequest', { driverType });
  };
  
 // Em src/screens/resident/ResidentHomeScreen.js - Função atualizada para mostrar solicitações pendentes

// Componente para exibir solicitações pendentes de aprovação do morador
const PendingApprovalSection = () => {
  const pendingRequests = requests.filter(req => req.status === 'pending_resident');
  if (pendingRequests.length === 0) return null;
  
  return (
    <View style={styles.pendingSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Aguardando Sua Aprovação</Text>
        

<TouchableOpacity 
  onPress={() => navigation.navigate('ResidentNotifications')}
  style={styles.seeAllButton}
>
  <Text style={styles.seeAllText}>Ver todas</Text>
  <MaterialCommunityIcons name="chevron-right" size={18} color="#1E88E5" />
</TouchableOpacity>
</View>

{pendingRequests.slice(0, 2).map(request => (
<Surface key={request.id} style={styles.pendingRequestCard}>
  <View style={styles.pendingCardHeader}>
    <MaterialCommunityIcons name="account-clock" size={22} color="#FF9800" />
    <Text style={styles.pendingCardTitle}>Solicitação de {request.driverName || 'Motorista'}</Text>
    <Text style={styles.pendingCardTime}>
      {formatRelativeTime(request.createdAt)}
    </Text>
  </View>
  
  <Divider style={styles.divider} />
  
  <View style={styles.pendingCardDetails}>
    <View style={styles.detailRow}>
      <MaterialCommunityIcons name="car" size={18} color="#757575" />
      <Text style={styles.detailLabel}>Veículo:</Text>
      <Text style={styles.detailValue}>
        {request.vehicleModel || 'Não informado'}{' '}
        {request.vehiclePlate ? `(${formatVehiclePlate(request.vehiclePlate)})` : ''}
      </Text>
    </View>
    
    {request.comment && (
      <View style={styles.commentContainer}>
        <Text style={styles.commentLabel}>Observação:</Text>
        <Text style={styles.commentText}>{request.comment}</Text>
      </View>
    )}
  </View>
  
  <View style={styles.pendingCardActions}>
    <Button 
      mode="outlined" 
      onPress={() => handleRejectRequest(request.id)}
      style={[styles.actionButton, { borderColor: '#F44336' }]}
      labelStyle={{ color: '#F44336' }}
      compact
    >
      Recusar
    </Button>
    
    <Button 
      mode="contained" 
      onPress={() => handleApproveRequest(request.id)}
      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
      compact
    >
      Aprovar
    </Button>
  </View>
</Surface>
))}

{pendingRequests.length > 2 && (
<Button 
  mode="text" 
  onPress={() => navigation.navigate('ResidentNotifications')}
  style={styles.moreButton}
>
  Ver mais {pendingRequests.length - 2} solicitações
</Button>
)}
</View>
);
};

// Função utilitária para formatar tempo relativo
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  
  const now = new Date();
  const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return diffDay === 1 ? 'Ontem' : `${diffDay} dias atrás`;
  } else if (diffHour > 0) {
    return `${diffHour}h atrás`;
  } else if (diffMin > 0) {
    return `${diffMin}min atrás`;
  } else {
    return 'Agora';
  }
};
// Em src/screens/resident/ResidentHomeScreen.js - Componente para exibir solicitações ativas

// Componente para exibir solicitações ativas
const ActiveRequestsSection = () => {
  const activeRequests = requests.filter(req => 
    ['pending', 'authorized', 'arrived'].includes(req.status)
  );
  
  if (activeRequests.length === 0) return null;
  
  return (
    <View style={styles.activeSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Solicitações Ativas</Text>
        <TouchableOpacity 
          onPress={() => navigation.navigate('History', { screen: 'AccessHistory' })}
          style={styles.seeAllButton}
        >
          <Text style={styles.seeAllText}>Ver histórico</Text>
          <MaterialCommunityIcons name="chevron-right" size={18} color="#1E88E5" />
        </TouchableOpacity>
      </View>
      
      {activeRequests.map(request => (
        <TouchableOpacity 
          key={request.id}
          onPress={() => handleRequestDetails(request.id)}
          style={styles.activeRequestCard}
        >
          <View style={styles.activeCardHeader}>
            <RequestStatusBadge status={request.status} size="small" />
            <Text style={styles.activeCardTime}>
              {formatRelativeTime(request.createdAt)}
            </Text>
          </View>
          
          <View style={styles.activeCardContent}>
            <View style={styles.driverInfo}>
              <MaterialCommunityIcons name="account" size={20} color="#757575" />
              <Text style={styles.driverName}>{request.driverName || 'Motorista'}</Text>
            </View>
            
            <View style={styles.vehicleInfo}>
              <MaterialCommunityIcons name="car" size={18} color="#757575" />
              <Text style={styles.vehicleText}>
                {request.vehicleModel || 'Veículo'}{' '}
                {request.vehiclePlate ? `• ${formatVehiclePlate(request.vehiclePlate)}` : ''}
              </Text>
            </View>
          </View>
          
          <View style={styles.activeCardActions}>
            {request.status === 'authorized' && (
              <Button 
                mode="contained" 
                onPress={() => handleShowQR(request.id)}
                icon="qrcode"
                style={styles.qrButton}
                compact
              >
                QR Code
              </Button>
            )}
            
            <Button 
              mode="outlined" 
              onPress={() => handleRequestDetails(request.id)}
              icon="eye"
              style={styles.detailsButton}
              compact
            >
              Detalhes
            </Button>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
};
  
  // Renderizar botões de filtro
  const renderFilterButtons = () => (
    <View style={styles.filtersContainer}>
      <Chip
        selected={filter === 'active'}
        onPress={() => setFilter('active')}
        style={styles.filterChip}
      >
        Ativas
      </Chip>
      
      <Chip
        selected={filter === 'completed'}
        onPress={() => setFilter('completed')}
        style={styles.filterChip}
      >
        Concluídas
      </Chip>
      
      <Chip
        selected={filter === 'all'}
        onPress={() => setFilter('all')}
        style={styles.filterChip}
      >
        Todas
      </Chip>
    </View>
  );
  
  // Renderizar estado vazio (sem solicitações)
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={getColor('grey.400')} />
      <Text style={styles.emptyTitle}>Nenhuma solicitação encontrada</Text>
      <Text style={styles.emptyDescription}>
        {filter === 'active'
          ? 'Você não tem solicitações ativas no momento'
          : filter === 'completed'
          ? 'Você não tem solicitações concluídas'
          : 'Você ainda não fez nenhuma solicitação'}
      </Text>
      <PaperButton 
        mode="contained" 
        onPress={() => setModalVisible(true)}
        style={styles.emptyButton}
      >
        Nova Solicitação
      </PaperButton>
    </View>
  );
  
  // Filtrar solicitações com base no filtro atual
  const filteredRequests = requests.filter(req => {
    // Para pendentes de aprovação do morador, só mostrar na seção específica
    if (req.status === 'pending_resident') return false;
    
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'authorized', 'arrived'].includes(req.status);
    if (filter === 'completed') return ['completed', 'entered', 'denied', 'canceled', 'denied_by_resident'].includes(req.status);
    
    return true;
  });
  
  // Função para obter cor baseada no status
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return getColor('warning');
      case 'authorized': return getColor('success');
      case 'arrived': return getColor('info');
      case 'entered': return '#9C27B0'; // Roxo
      case 'completed': return getColor('success');
      case 'denied': case 'denied_by_resident': return getColor('danger');
      case 'canceled': return getColor('grey.600');
      default: return getColor('grey.600');
    }
  };
  
  // Função para obter ícone baseado no status
  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return 'clock-outline';
      case 'authorized': return 'check-circle-outline';
      case 'arrived': return 'map-marker';
      case 'entered': return 'login';
      case 'completed': return 'check-circle';
      case 'denied': case 'denied_by_resident': return 'close-circle-outline';
      case 'canceled': return 'cancel';
      default: return 'help-circle-outline';
    }
  };
  
  // Função para obter texto de status
  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'pending_resident': return 'Aguardando Aprovação';
      case 'authorized': return 'Autorizado';
      case 'arrived': return 'Na portaria';
      case 'entered': return 'Entrou';
      case 'completed': return 'Concluído';
      case 'denied': return 'Negado';
      case 'denied_by_resident': return 'Negado por você';
      case 'canceled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };
  // Renderizar conteúdo principal
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.profileInfo}>
          <Text style={styles.greeting}>
            Olá, {userProfile?.displayName?.split(' ')[0] || 'Morador'}
          </Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('pt-BR', { 
              weekday: 'long', 
              day: 'numeric', 
              month: 'long' 
            })}
          </Text>
        </View>
        
        <TouchableOpacity 
          style={styles.profileAvatar} 
          onPress={() => navigation.navigate('Profile')}
        >
          {userProfile?.photoURL ? (
            <Image 
              source={{ uri: userProfile.photoURL }} 
              style={styles.avatarImage} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {userProfile?.displayName?.charAt(0).toUpperCase() || 'M'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Conteúdo principal */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando solicitações...</Text>
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Seção de solicitações pendentes de aprovação */}
          <PendingApprovalSection />
          
          {/* Seção de solicitações ativas */}
          <ActiveRequestsSection />
          
          {/* Estado vazio */}
          {requests.length === 0 && (
            <View style={styles.emptyContainer}>
              <LottieView
                source={require('../../assets/animations/empty-state.json')}
                autoPlay
                loop
                style={styles.emptyAnimation}
              />
              <Text style={styles.emptyTitle}>Nenhuma solicitação encontrada</Text>
              <Text style={styles.emptyDescription}>
                Você ainda não tem solicitações de acesso.
                Para solicitar acesso para um motorista, use o botão abaixo.
              </Text>
              <Button
                mode="contained"
                onPress={() => setModalVisible(true)}
                style={styles.createButton}
                icon="plus"
              >
                Nova Solicitação
              </Button>
            </View>
          )}
        </ScrollView>
      )}
      
      {/* FAB para criar nova solicitação */}
      <FAB
        style={styles.fab}
        icon="plus"
        label="Nova Solicitação"
        onPress={() => setModalVisible(true)}
      />
      
      {/* Modal para selecionar tipo de motorista */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Text style={styles.modalTitle}>Nova Solicitação de Acesso</Text>
          <Text style={styles.modalSubtitle}>Escolha o tipo de solicitação:</Text>
          
          <View style={styles.driverTypeContainer}>
            <TouchableOpacity 
              style={styles.driverTypeCard}
              onPress={() => handleCreateRequest('saved')}
            >
              <MaterialCommunityIcons name="account-check" size={40} color={theme.colors.primary} />
              <Text style={styles.driverTypeTitle}>Motorista Salvo</Text>
              <Text style={styles.driverTypeDescription}>
                Selecione um motorista já cadastrado em seus favoritos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.driverTypeCard}
              onPress={() => handleCreateRequest('new')}
            >
              <MaterialCommunityIcons name="account-plus" size={40} color={theme.colors.primary} />
              <Text style={styles.driverTypeTitle}>Novo Motorista</Text>
              <Text style={styles.driverTypeDescription}>
                Adicione os dados de um novo motorista
              </Text>
            </TouchableOpacity>
          </View>
          
          <Button
            mode="outlined"
            onPress={() => setModalVisible(false)}
            style={styles.cancelButton}
          >
            Cancelar
          </Button>
        </Modal>
      </Portal>
    </View>
  );
};

// Estilos do componente
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 40,
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  profileInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  profileAvatar: {
    marginLeft: 16,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E88E5',
  },
  avatarText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    fontSize: 14,
    color: '#1E88E5',
  },
  
  // Estilos para a seção de solicitações pendentes
  pendingSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  pendingRequestCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  pendingCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pendingCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  pendingCardTime: {
    fontSize: 12,
    color: '#757575',
  },
  divider: {
    marginVertical: 12,
  },
  pendingCardDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 4,
    marginRight: 4,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  commentContainer: {
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
  },
  pendingCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginLeft: 8,
  },
  moreButton: {
    alignSelf: 'center',
    marginBottom: 8,
  },
  
  // Estilos para a seção de solicitações ativas
  activeSection: {
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
  },
  activeRequestCard: {
    margin: 16,
    marginTop: 0,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E88E5',
    backgroundColor: '#FFFFFF',
    elevation: 2,
  },
  activeCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  activeCardTime: {
    fontSize: 12,
    color: '#757575',
  },
  activeCardContent: {
    marginBottom: 12,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleText: {
    fontSize: 14,
    color: '#616161',
    marginLeft: 8,
  },
  activeCardActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  qrButton: {
    marginRight: 8,
  },
  detailsButton: {
    backgroundColor: 'transparent',
  },
  
  // Estilos para estado vazio e carregamento
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#757575',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
    elevation: 2,
  },
  emptyAnimation: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    paddingHorizontal: 16,
  },
  
  // Estilos para FAB e modal
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    backgroundColor: '#1E88E5',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 20,
    textAlign: 'center',
  },
  driverTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  driverTypeCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 16,
    width: '48%',
    alignItems: 'center',
    elevation: 2,
  },
  driverTypeTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  driverTypeDescription: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  cancelButton: {
    marginTop: 16,
  }
});

export default ResidentHomeScreen;