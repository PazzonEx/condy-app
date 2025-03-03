import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, FAB, Portal, Modal, Chip, Button as PaperButton, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Hooks e serviços
import { useAuth } from '../../hooks/useAuth';
import AccessService from '../../services/access.service';

// Componentes
import { COLORS, globalStyles } from '../../styles/theme';

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
      loadRequests();
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
      loadRequests();
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
  
  // Componente para exibir solicitações pendentes de aprovação do morador
  const PendingApprovalSection = () => {
    const pendingRequests = requests.filter(req => req.status === 'pending_resident');
    if (pendingRequests.length === 0) return null;
    
    return (
      <View style={styles.pendingSection}>
        <Text style={styles.sectionTitle}>Solicitações Aguardando Sua Aprovação</Text>
        {pendingRequests.map(request => (
          <View key={request.id} style={styles.pendingRequestCard}>
            <Text style={styles.driverName}>{request.driverName || 'Motorista'}</Text>
            <Text style={styles.requestDetails}>
              {request.vehicleModel ? `${request.vehicleModel} • ` : ''}
              Placa: {request.vehiclePlate || 'Não informada'}
            </Text>
            <View style={styles.pendingActions}>
              <PaperButton 
                mode="contained" 
                onPress={() => handleApproveRequest(request.id)}
                style={[styles.actionButton, { backgroundColor: getColor('success') }]}
              >
                Aprovar
              </PaperButton>
              <PaperButton 
                mode="contained" 
                onPress={() => handleRejectRequest(request.id)}
                style={[styles.actionButton, { backgroundColor: getColor('danger') }]}
              >
                Rejeitar
              </PaperButton>
            </View>
          </View>
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
  
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text style={styles.greeting}>
            Olá, {userProfile?.displayName?.split(' ')[0] || 'Morador'}
          </Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
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
      
      {/* Seção de solicitações pendentes de aprovação */}
      <PendingApprovalSection />
      
      {/* Filtros */}
      {renderFilterButtons()}
      
      {/* Mensagem de erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Lista de solicitações */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={getColor('primary')} />
          <Text style={styles.loadingText}>Carregando solicitações...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={({item}) => (
            <View style={styles.requestCard}>
              <View style={styles.requestHeader}>
                <View style={styles.statusContainer}>
                  <MaterialCommunityIcons 
                    name={getStatusIcon(item.status)} 
                    size={24} 
                    color={getStatusColor(item.status)} 
                  />
                  <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                    {getStatusText(item.status)}
                  </Text>
                </View>
                <Text style={styles.dateText}>
                  {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : ''}
                </Text>
              </View>

              <View style={styles.requestContent}>
                <Text style={styles.driverName}>{item.driverName || 'Motorista'}</Text>
                <Text style={styles.requestDetails}>
                  {item.vehicleModel ? `${item.vehicleModel} • ` : ''}
                  Placa: {item.vehiclePlate || 'Não informada'}
                </Text>
              </View>

              <View style={styles.requestActions}>
                {item.status === 'pending' && (
                  <PaperButton 
                    mode="text" 
                    onPress={() => handleCancelRequest(item.id)}
                  >
                    Cancelar
                  </PaperButton>
                )}
                <PaperButton 
                  mode="contained" 
                  onPress={() => handleRequestDetails(item.id)}
                >
                  Detalhes
                </PaperButton>
                {item.status === 'authorized' && (
                  <PaperButton 
                    mode="contained" 
                    icon="qrcode"
                    onPress={() => handleShowQR(item.id)}
                  >
                    QR Code
                  </PaperButton>
                )}
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[getColor('primary')]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Botão flutuante para criar nova solicitação */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setModalVisible(true)}
        label="Nova Solicitação"
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
              <MaterialCommunityIcons name="account-check" size={40} color={getColor('primary')} />
              <Text style={styles.driverTypeTitle}>Motorista Salvo</Text>
              <Text style={styles.driverTypeDescription}>
                Selecione um motorista já cadastrado em seus favoritos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.driverTypeCard}
              onPress={() => handleCreateRequest('new')}
            >
              <MaterialCommunityIcons name="account-plus" size={40} color={getColor('primary')} />
              <Text style={styles.driverTypeTitle}>Novo Motorista</Text>
              <Text style={styles.driverTypeDescription}>
                Adicione os dados de um novo motorista
              </Text>
            </TouchableOpacity>
          </View>
          
          <PaperButton
            mode="outlined"
            onPress={() => setModalVisible(false)}
            style={styles.cancelButton}
          >
            Cancelar
          </PaperButton>
        </Modal>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
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
  pendingSection: {
    backgroundColor: '#F5F5F5',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    color: '#212121',
  },
  pendingRequestCard: {
    margin: 16,
    marginTop: 0,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    elevation: 2,
  },
  pendingActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 12,
  },
  actionButton: {
    marginLeft: 8,
  },
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
  },
  requestContent: {
    padding: 12,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  requestDetails: {
    fontSize: 14,
    color: '#616161',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
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
  errorContainer: {
    padding: 16,
    backgroundColor: '#FFEBEE',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  errorText: {
    color: '#B71C1C',
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
    color: '#212121',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#1E88E5',
  },
  listContainer: {
    padding: 0,
    paddingTop: 8,
    paddingBottom: 80,
    flexGrow: 1,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
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
