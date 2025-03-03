import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, Chip, ActivityIndicator, Searchbar, FAB, Button, Dialog, Portal } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Hooks e serviços
import { useAuth } from '../../hooks/useAuth';
import AccessService from '../../services/access.service';

const statusColors = {
  pending: '#FF9800',
  pending_resident: '#FF9800',
  authorized: '#4CAF50',
  arrived: '#2196F3',
  entered: '#9C27B0',
  completed: '#4CAF50',
  denied: '#F44336',
  denied_by_resident: '#F44336',
  canceled: '#757575'
};

const statusIcons = {
  pending: 'clock-outline',
  pending_resident: 'account-clock',
  authorized: 'check-circle-outline',
  arrived: 'map-marker',
  entered: 'login',
  completed: 'check-circle',
  denied: 'close-circle-outline',
  denied_by_resident: 'close-circle-outline',
  canceled: 'cancel'
};

const statusLabels = {
  pending: 'Pendente',
  pending_resident: 'Aguardando Morador',
  authorized: 'Autorizado',
  arrived: 'Na portaria',
  entered: 'Entrou',
  completed: 'Concluído',
  denied: 'Negado',
  denied_by_resident: 'Negado pelo Morador',
  canceled: 'Cancelado'
};

const CondoRequestsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  
  // Estados
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    authorized: 0,
    completed: 0,
    denied: 0
  });
  
  // Estado para o diálogo de confirmação de status
  const [dialogVisible, setDialogVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [statusAction, setStatusAction] = useState(null);
  
  // Carregar solicitações
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filter])
  );
  
  // Efeito para filtrar com base na pesquisa
  useEffect(() => {
    filterRequestsBySearch();
  }, [searchQuery, requests]);
  
  // Função para filtrar solicitações por termo de busca
  const filterRequestsBySearch = () => {
    if (!searchQuery.trim()) {
      setFilteredRequests(requests);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = requests.filter(req => 
      req.driverName?.toLowerCase().includes(query) ||
      req.vehiclePlate?.toLowerCase().includes(query) ||
      req.unit?.toString().includes(query) ||
      req.block?.toLowerCase().includes(query) ||
      req.residentName?.toLowerCase().includes(query)
    );
    
    setFilteredRequests(filtered);
  };
  
  // Carregar dados do servidor
  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Definir condições baseadas no filtro
      let statusFilter = null;
      
      if (filter === 'pending') {
        statusFilter = ['pending'];
      } else if (filter === 'authorized') {
        statusFilter = ['authorized', 'arrived'];
      } else if (filter === 'completed') {
        statusFilter = ['completed', 'entered'];
      } else if (filter === 'denied') {
        statusFilter = ['denied', 'denied_by_resident', 'canceled'];
      }
      
      // Buscar solicitações
      const accessRequests = await AccessService.getAccessRequests(statusFilter);
      
      // Calcular estatísticas
      const statsData = {
        total: accessRequests.length,
        pending: accessRequests.filter(req => req.status === 'pending').length,
        authorized: accessRequests.filter(req => ['authorized', 'arrived'].includes(req.status)).length,
        completed: accessRequests.filter(req => ['completed', 'entered'].includes(req.status)).length,
        denied: accessRequests.filter(req => ['denied', 'denied_by_resident', 'canceled'].includes(req.status)).length
      };
      
      setStats(statsData);
      setRequests(accessRequests);
      
      // Aplicar filtro de pesquisa
      if (searchQuery.trim()) {
        filterRequestsBySearch();
      } else {
        setFilteredRequests(accessRequests);
      }
      
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
  
  // Abrir diálogo para confirmar ação de status
  const openStatusDialog = (request, action) => {
    setSelectedRequest(request);
    setStatusAction(action);
    setDialogVisible(true);
  };
  
  // Executar ação de mudança de status
  const handleStatusAction = async () => {
    if (!selectedRequest || !statusAction) {
      setDialogVisible(false);
      return;
    }
    
    try {
      setDialogVisible(false);
      setLoading(true);
      
      let newStatus;
      let actionText;
      
      switch (statusAction) {
        case 'approve':
          newStatus = 'authorized';
          actionText = 'aprovada';
          break;
        case 'deny':
          newStatus = 'denied';
          actionText = 'negada';
          break;
        case 'arrived':
          newStatus = 'arrived';
          actionText = 'marcada como chegada';
          break;
        case 'entered':
          newStatus = 'entered';
          actionText = 'marcada como entrada';
          break;
        case 'complete':
          newStatus = 'completed';
          actionText = 'marcada como concluída';
          break;
        default:
          throw new Error('Ação inválida');
      }
      
      await AccessService.updateAccessRequestStatus(selectedRequest.id, newStatus);
      
      Alert.alert(
        'Sucesso',
        `Solicitação ${actionText} com sucesso!`,
        [{ text: 'OK' }]
      );
      
      // Atualizar lista
      loadRequests();
      
    } catch (error) {
      console.error(`Erro ao ${statusAction} solicitação:`, error);
      Alert.alert('Erro', `Não foi possível atualizar o status da solicitação: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Ir para detalhes da solicitação
  const handleRequestDetails = (requestId) => {
    navigation.navigate('CondoAccessDetails', { requestId });
  };
  
  // Renderizar filtros
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Chip
        selected={filter === 'pending'}
        onPress={() => setFilter('pending')}
        style={styles.filterChip}
      >
        Pendentes {stats.pending > 0 ? `(${stats.pending})` : ''}
      </Chip>
      
      <Chip
        selected={filter === 'authorized'}
        onPress={() => setFilter('authorized')}
        style={styles.filterChip}
      >
        Autorizados {stats.authorized > 0 ? `(${stats.authorized})` : ''}
      </Chip>
      
      <Chip
        selected={filter === 'completed'}
        onPress={() => setFilter('completed')}
        style={styles.filterChip}
      >
        Concluídos {stats.completed > 0 ? `(${stats.completed})` : ''}
      </Chip>
      
      <Chip
        selected={filter === 'denied'}
        onPress={() => setFilter('denied')}
        style={styles.filterChip}
      >
        Negados {stats.denied > 0 ? `(${stats.denied})` : ''}
      </Chip>
      
      <Chip
        selected={filter === 'all'}
        onPress={() => setFilter('all')}
        style={styles.filterChip}
      >
        Todos {stats.total > 0 ? `(${stats.total})` : ''}
      </Chip>
    </View>
  );
  
  // Renderizar estado vazio
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#BDBDBD" />
      <Text style={styles.emptyTitle}>Nenhuma solicitação encontrada</Text>
      <Text style={styles.emptyDescription}>
        {filter === 'pending'
          ? 'Não há solicitações pendentes para aprovação'
          : filter === 'authorized'
          ? 'Não há solicitações autorizadas no momento'
          : filter === 'completed'
          ? 'Não há solicitações concluídas'
          : filter === 'denied'
          ? 'Não há solicitações negadas'
          : 'Não há solicitações registradas'}
      </Text>
    </View>
  );
  
  // Renderizar uma solicitação
  const renderRequestItem = ({ item }) => {
    const statusColor = statusColors[item.status] || '#757575';
    const statusIcon = statusIcons[item.status] || 'help-circle-outline';
    const statusLabel = statusLabels[item.status] || 'Desconhecido';
    
    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons 
              name={statusIcon} 
              size={24} 
              color={statusColor} 
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
          <Text style={styles.dateText}>
            {item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : ''}
          </Text>
        </View>

        <View style={styles.requestContent}>
          <View style={styles.driverInfo}>
            <MaterialCommunityIcons name="account" size={20} color="#757575" style={styles.icon} />
            <Text style={styles.driverName}>{item.driverName || 'Não informado'}</Text>
            {item.vehiclePlate && (
              <Text style={styles.plateInfo}>
                <MaterialCommunityIcons name="car" size={16} color="#757575" />
                {' '}{item.vehiclePlate}
              </Text>
            )}
          </View>
          
          <View style={styles.unitInfo}>
            <MaterialCommunityIcons name="home" size={20} color="#757575" style={styles.icon} />
            <Text style={styles.infoText}>
              Unidade: {item.unit || 'N/A'}
              {item.block ? ` • Bloco ${item.block}` : ''}
            </Text>
            <Text style={styles.residentName}>
              {item.residentName || 'Morador não identificado'}
            </Text>
          </View>
        </View>

        <View style={styles.requestActions}>
          {item.status === 'pending' && (
            <>
              <TouchableOpacity 
                style={[styles.actionButton, styles.denyButton]}
                onPress={() => openStatusDialog(item, 'deny')}
              >
                <Text style={styles.denyButtonText}>Negar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButton, styles.approveButton]}
                onPress={() => openStatusDialog(item, 'approve')}
              >
                <Text style={styles.approveButtonText}>Aprovar</Text>
              </TouchableOpacity>
            </>
          )}
          
          {item.status === 'authorized' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.arrivedButton]}
              onPress={() => openStatusDialog(item, 'arrived')}
            >
              <Text style={styles.arrivedButtonText}>Marcar Chegada</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'arrived' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.enteredButton]}
              onPress={() => openStatusDialog(item, 'entered')}
            >
              <Text style={styles.enteredButtonText}>Marcar Entrada</Text>
            </TouchableOpacity>
          )}
          
          {item.status === 'entered' && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.completeButton]}
              onPress={() => openStatusDialog(item, 'complete')}
            >
              <Text style={styles.completeButtonText}>Concluir</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.detailsButton}
            onPress={() => handleRequestDetails(item.id)}
          >
            <Text style={styles.detailsButtonText}>Detalhes</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  
  // Texto para o diálogo de confirmação
  const getDialogText = () => {
    if (!statusAction || !selectedRequest) return { title: '', content: '' };
    
    const driverName = selectedRequest.driverName || 'o motorista';
    
    switch (statusAction) {
      case 'approve':
        return {
          title: 'Aprovar Solicitação',
          content: `Deseja aprovar a solicitação de acesso para ${driverName}?`
        };
      case 'deny':
        return {
          title: 'Negar Solicitação',
          content: `Deseja negar a solicitação de acesso para ${driverName}?`
        };
      case 'arrived':
        return {
          title: 'Marcar Chegada',
          content: `Confirmar que ${driverName} chegou à portaria?`
        };
      case 'entered':
        return {
          title: 'Marcar Entrada',
          content: `Confirmar que ${driverName} entrou no condomínio?`
        };
      case 'complete':
        return {
          title: 'Concluir Solicitação',
          content: `Marcar a solicitação de ${driverName} como concluída?`
        };
      default:
        return { title: 'Confirmar Ação', content: 'Deseja continuar?' };
    }
  };
  
  const dialogText = getDialogText();
  
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitações de Acesso</Text>
      </View>
      
      {/* Barra de pesquisa */}
      <View style={styles.searchBarContainer}>
        <Searchbar
          placeholder="Buscar por nome, placa ou unidade"
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          icon="magnify"
          clearIcon="close"
        />
      </View>
      
      {/* Filtros */}
      {renderFilters()}
      
      {/* Mensagem de erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Lista de solicitações */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E88E5" />
          <Text style={styles.loadingText}>Carregando solicitações...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={["#1E88E5"]}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* FAB para escanear QR */}
      <FAB
        style={styles.fab}
        icon="qrcode-scan"
        onPress={() => navigation.navigate('CondoQRScanner')}
        label="Escanear QR"
      />
      
      {/* Diálogo de confirmação */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => setDialogVisible(false)}
        >
          <Dialog.Title>{dialogText.title}</Dialog.Title>
          <Dialog.Content>
            <Text>{dialogText.content}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancelar</Button>
            <Button onPress={handleStatusAction}>Confirmar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    height: 40,
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
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
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
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  plateInfo: {
    fontSize: 14,
    color: '#616161',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  unitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  icon: {
    marginRight: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#616161',
    marginRight: 8,
  },
  residentName: {
    fontSize: 14,
    color: '#616161',
    fontStyle: 'italic',
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
    marginLeft: 8,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  denyButton: {
    backgroundColor: '#F44336',
  },
  denyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  arrivedButton: {
    backgroundColor: '#2196F3',
  },
  arrivedButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  enteredButton: {
    backgroundColor: '#9C27B0',
  },
  enteredButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#4CAF50',
  },
  completeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  detailsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  detailsButtonText: {
    color: '#1E88E5',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#1E88E5',
  },
});

export default CondoRequestsScreen;