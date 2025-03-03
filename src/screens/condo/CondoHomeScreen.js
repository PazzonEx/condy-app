import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, FAB, Chip, ActivityIndicator, Searchbar } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Hooks e serviços
import { useAuth } from '../../hooks/useAuth';
import AccessService from '../../services/access.service';

// Cores padrão (caso o objeto COLORS não esteja disponível)
const defaultColors = {
  primary: '#1E88E5',
  primaryLight: '#E3F2FD',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  grey: {
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575'
  },
  white: '#FFFFFF',
  dark: '#212121',
  light: '#F5F5F5'
};

// Usar as cores do tema ou as cores padrão
const getColor = (colorPath) => {
  const parts = colorPath.split('.');
  let current = defaultColors;
  
  for (const part of parts) {
    if (current[part] === undefined) {
      return defaultColors[parts[0]] || '#1E88E5';
    }
    current = current[part];
  }
  
  return current;
};

const CondoHomeScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  
  // Estados
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [quickStatsVisible, setQuickStatsVisible] = useState(true);
  const [quickStats, setQuickStats] = useState({
    pending: 0,
    authorized: 0,
    today: 0
  });
  
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
      
      // Buscar estatísticas rápidas (implementação simplificada)
      let todayCount = 0;
      let pendingCount = 0;
      let authorizedCount = 0;
      
      // Definir condições baseadas no filtro
      let statusFilter = null;
      
      if (filter === 'pending') {
        statusFilter = ['pending'];
      } else if (filter === 'authorized') {
        statusFilter = ['authorized', 'arrived'];
      } else if (filter === 'completed') {
        statusFilter = ['completed', 'entered', 'denied', 'denied_by_resident', 'canceled'];
      }
      
      // Buscar solicitações
      const accessRequests = await AccessService.getAccessRequests(statusFilter);
      
      // Calcular estatísticas com base nas solicitações
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      accessRequests.forEach(req => {
        // Contar solicitações de hoje
        if (req.createdAt && new Date(req.createdAt) >= today) {
          todayCount++;
        }
        
        // Contar por status
        if (req.status === 'pending') {
          pendingCount++;
        } else if (req.status === 'authorized' || req.status === 'arrived') {
          authorizedCount++;
        }
      });
      
      // Atualizar estatísticas
      setQuickStats({
        pending: pendingCount,
        authorized: authorizedCount,
        today: todayCount
      });
      
      // Atualizar lista de solicitações
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
  
  // Aprovar uma solicitação
  const handleApproveRequest = async (requestId) => {
    try {
      await AccessService.updateAccessRequestStatus(requestId, 'authorized');
      Alert.alert('Sucesso', 'Solicitação aprovada com sucesso');
      // Atualizar a lista
      loadRequests();
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      Alert.alert('Erro', 'Não foi possível aprovar a solicitação');
    }
  };
  
  // Negar uma solicitação
  const handleDenyRequest = async (requestId) => {
    try {
      await AccessService.updateAccessRequestStatus(requestId, 'denied');
      Alert.alert('Sucesso', 'Solicitação negada com sucesso');
      // Atualizar a lista
      loadRequests();
    } catch (error) {
      console.error('Erro ao negar solicitação:', error);
      Alert.alert('Erro', 'Não foi possível negar a solicitação');
    }
  };
  
  // Ir para detalhes da solicitação
  const handleRequestDetails = (requestId) => {
    navigation.navigate('CondoAccessDetails', { requestId });
  };
  
  // Marcar motorista como chegado
  const handleMarkAsArrived = async (requestId) => {
    try {
      await AccessService.updateAccessRequestStatus(requestId, 'arrived');
      Alert.alert('Sucesso', 'Motorista marcado como chegado');
      loadRequests();
    } catch (error) {
      console.error('Erro ao marcar chegada:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status');
    }
  };
  
  // Marcar motorista como entrou
  const handleMarkAsEntered = async (requestId) => {
    try {
      await AccessService.updateAccessRequestStatus(requestId, 'entered');
      Alert.alert('Sucesso', 'Motorista marcado como entrou');
      loadRequests();
    } catch (error) {
      console.error('Erro ao marcar entrada:', error);
      Alert.alert('Erro', 'Não foi possível atualizar o status');
    }
  };
  
  // Função para alternar visibilidade das estatísticas rápidas
  const toggleQuickStats = () => {
    setQuickStatsVisible(!quickStatsVisible);
  };
  
  // Renderizar seção de estatísticas rápidas
  const renderQuickStats = () => {
    if (!quickStatsVisible) {
      return (
        <TouchableOpacity 
          style={styles.expandButton}
          onPress={toggleQuickStats}
        >
          <MaterialCommunityIcons name="chevron-down" size={24} color={getColor('grey.600')} />
          <Text style={styles.expandButtonText}>Mostrar estatísticas</Text>
        </TouchableOpacity>
      );
    }
    
    return (
      <View style={styles.quickStatsContainer}>
        <View style={styles.quickStatsTitleRow}>
          <Text style={styles.quickStatsTitle}>Resumo do Dia</Text>
          <TouchableOpacity onPress={toggleQuickStats}>
            <MaterialCommunityIcons name="chevron-up" size={24} color={getColor('grey.600')} />
          </TouchableOpacity>
        </View>
        
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{quickStats.pending}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{quickStats.authorized}</Text>
            <Text style={styles.statLabel}>Autorizados</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{quickStats.today}</Text>
            <Text style={styles.statLabel}>Hoje</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.dashboardButton}
          onPress={() => navigation.navigate('CondoDashboard')}
        >
          <MaterialCommunityIcons name="chart-bar" size={20} color={getColor('primary')} />
          <Text style={styles.dashboardButtonText}>Dashboard Completo</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Renderizar filtros
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <Chip
        selected={filter === 'pending'}
        onPress={() => setFilter('pending')}
        style={styles.filterChip}
      >
        Pendentes {quickStats.pending > 0 ? `(${quickStats.pending})` : ''}
      </Chip>
      
      <Chip
        selected={filter === 'authorized'}
        onPress={() => setFilter('authorized')}
        style={styles.filterChip}
      >
        Autorizados
      </Chip>
      
      <Chip
        selected={filter === 'completed'}
        onPress={() => setFilter('completed')}
        style={styles.filterChip}
      >
        Concluídos
      </Chip>
      
      <Chip
        selected={filter === 'all'}
        onPress={() => setFilter('all')}
        style={styles.filterChip}
      >
        Todos
      </Chip>
    </View>
  );
  
  // Renderizar estado vazio
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={64} color={getColor('grey.400')} />
      <Text style={styles.emptyTitle}>Nenhuma solicitação encontrada</Text>
      <Text style={styles.emptyDescription}>
        {filter === 'pending'
          ? 'Não há solicitações pendentes para aprovação'
          : filter === 'authorized'
          ? 'Não há solicitações autorizadas no momento'
          : filter === 'completed'
          ? 'Não há solicitações concluídas'
          : 'Não há solicitações registradas'}
      </Text>
    </View>
  );
  
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
      case 'pending_resident': return 'Aguardando Morador';
      case 'authorized': return 'Autorizado';
      case 'arrived': return 'Na portaria';
      case 'entered': return 'Entrou';
      case 'completed': return 'Concluído';
      case 'denied': return 'Negado';
      case 'denied_by_resident': return 'Negado pelo Morador';
      case 'canceled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };
  
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>
            Olá, {userProfile?.displayName?.split(' ')[0] || 'Portaria'}
          </Text>
          <Text style={styles.subtitle}>
            {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.profileAvatar} 
          onPress={() => navigation.navigate('CondoProfile')}
        >
          {userProfile?.photoURL ? (
            <Image 
              source={{ uri: userProfile.photoURL }} 
              style={styles.avatarImage} 
            />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialCommunityIcons name="office-building" size={24} color={getColor('white')} />
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      {/* Estatísticas rápidas */}
      {renderQuickStats()}
      
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
          <ActivityIndicator size="large" color={getColor('primary')} />
          <Text style={styles.loadingText}>Carregando solicitações...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={({item}) => (
            <View style={[
              styles.requestCard,
              item.status === 'pending' && styles.pendingRequestCard
            ]}>
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
                <View style={styles.driverInfo}>
                  <MaterialCommunityIcons name="account" size={20} color={getColor('grey.600')} style={styles.icon} />
                  <Text style={styles.driverName}>{item.driverName || 'Não informado'}</Text>
                  {item.vehiclePlate && (
                    <Text style={styles.plateInfo}>
                      <MaterialCommunityIcons name="car" size={16} color={getColor('grey.600')} />
                      {' '}{item.vehiclePlate}
                    </Text>
                  )}
                </View>
                
                <View style={styles.unitInfo}>
                  <MaterialCommunityIcons name="home" size={20} color={getColor('grey.600')} style={styles.icon} />
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
                      onPress={() => handleDenyRequest(item.id)}
                    >
                      <Text style={styles.denyButtonText}>Negar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.actionButton, styles.approveButton]}
                      onPress={() => handleApproveRequest(item.id)}
                    >
                      <Text style={styles.approveButtonText}>Aprovar</Text>
                    </TouchableOpacity>
                  </>
                )}
                
                {item.status === 'authorized' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.arrivedButton]}
                    onPress={() => handleMarkAsArrived(item.id)}
                  >
                    <Text style={styles.arrivedButtonText}>Marcar como Chegou</Text>
                  </TouchableOpacity>
                )}
                
                {item.status === 'arrived' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.enteredButton]}
                    onPress={() => handleMarkAsEntered(item.id)}
                  >
                    <Text style={styles.enteredButtonText}>Marcar como Entrou</Text>
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
      
      {/* Botão flutuante para escanear QR Code */}
      <FAB
        style={styles.fab}
        icon="qrcode-scan"
        onPress={() => navigation.navigate('CondoQRScanner')}
        label="Escanear QR"
      />
    </View>
  );
};

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
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  headerContent: {
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
  quickStatsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  quickStatsTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  quickStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1E88E5',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1E88E5',
    borderRadius: 4,
  },
  dashboardButtonText: {
    marginLeft: 8,
    color: '#1E88E5',
    fontWeight: '500',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  expandButtonText: {
    marginLeft: 8,
    color: '#757575',
    fontSize: 14,
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
  pendingRequestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
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
  detailsButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  detailsButtonText: {
    color: '#1E88E5',
    fontWeight: '500',
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
});

export default CondoHomeScreen;