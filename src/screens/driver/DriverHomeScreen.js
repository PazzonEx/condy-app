import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Image, TouchableOpacity, Alert } from 'react-native';
import { Text, FAB, Chip, ActivityIndicator, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import LottieView from 'lottie-react-native';
// Hooks e serviços
import { useAuth } from '../../hooks/useAuth';
import AccessService from '../../services/access.service';

// Cores padrão (caso o objeto COLORS não esteja disponível)
const defaultColors = {
  primary: '#1E88E5',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  secondary: '#FF9800',
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
  let current = defaultColors;
  
  for (const part of parts) {
    if (current[part] === undefined) {
      return defaultColors[parts[0]] || '#1E88E5';
    }
    current = current[part];
  }
  
  return current;
};

const DriverHomeScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  
  // Estados
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const [showPromo, setShowPromo] = useState(true);
  
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
      
      // Determinar filtro de status baseado na seleção
      let statusFilter = null;
      
      if (filter === 'active') {
        statusFilter = ['pending', 'pending_resident', 'authorized', 'arrived'];
      } else if (filter === 'completed') {
        statusFilter = ['completed', 'entered', 'denied', 'denied_by_resident', 'canceled'];
      }
      
      // Buscar solicitações usando o serviço existente
      const accessRequests = await AccessService.getAccessRequests(statusFilter);
      setRequests(accessRequests);
      
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
    navigation.navigate('DriverAccessDetails', { requestId });
  };
  
  // Mostrar QR Code
  const handleShowQR = (requestId) => {
    navigation.navigate('DriverAccessDetails', { requestId, showQR: true });
  };
  
  // Componente de promoção
  const PromoBanner = ({ onPress, onDismiss }) => (
    <View style={styles.promoBanner}>
      <View style={styles.promoContent}>
        <MaterialCommunityIcons name="star" size={24} color={getColor('secondary')} style={styles.promoIcon} />
        <Text style={styles.promoText}>
          Tenha acesso ilimitado por apenas R$19,90/mês. Economize tempo e dinheiro!
        </Text>
      </View>
      <View style={styles.promoActions}>
        <TouchableOpacity 
          style={[styles.promoButton, styles.subscribeButton]}
          onPress={onPress}
        >
          <Text style={styles.subscribeButtonText}>Assinar</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dismissButton}
          onPress={onDismiss}
        >
          <MaterialCommunityIcons name="close" size={20} color={getColor('grey.600')} />
        </TouchableOpacity>
      </View>
    </View>
  );
  
  // Componente para mostrar solicitações pendentes de aprovação do morador
  const PendingResidentApproval = () => {
    const pendingResidentRequests = requests.filter(req => req.status === 'pending_resident');
    
    if (pendingResidentRequests.length === 0) return null;
    
    return (
      <View style={styles.pendingSection}>
        <Text style={styles.sectionTitle}>Aguardando Aprovação</Text>
        {pendingResidentRequests.map(request => (
          <View key={request.id} style={styles.pendingRequestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.statusContainer}>
                <MaterialCommunityIcons 
                  name="account-clock" 
                  size={24} 
                  color={getColor('secondary')} 
                />
                <Text style={[styles.statusText, { color: getColor('secondary') }]}>
                  Aguardando Morador
                </Text>
              </View>
              <Text style={styles.dateText}>
                {request.createdAt ? new Date(request.createdAt).toLocaleDateString('pt-BR') : ''}
              </Text>
            </View>
            
            <View style={styles.requestContent}>
              <Text style={styles.unitInfo}>
                <MaterialCommunityIcons name="home" size={16} color={getColor('grey.600')} />
                {' '}Unidade: {request.unit}
                {request.block ? ` • Bloco ${request.block}` : ''}
              </Text>
              <Text style={styles.residentName}>
                {request.residentName || 'Morador'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={styles.detailsButton}
              onPress={() => handleRequestDetails(request.id)}
            >
              <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
            </TouchableOpacity>
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

      <LottieView
                source={require('../../assets/animations/empty-state.json')}
                autoPlay
                loop
                style={styles.emptyAnimation}
              />
      <Text style={styles.emptyTitle}>Nenhuma solicitação encontrada</Text>
      <Text style={styles.emptyDescription}>
        {filter === 'active'
          ? 'Você não tem solicitações ativas no momento'
          : filter === 'completed'
          ? 'Você não tem solicitações concluídas'
          : 'Você ainda não recebeu nenhuma solicitação'}
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.navigate('Search')}
      >
        <Text style={styles.emptyButtonText}>Buscar Condomínio</Text>
      </TouchableOpacity>
      
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
  
  // Filtrar solicitações (excluindo as pendentes de morador que já são mostradas em seção separada)
  const filteredRequests = requests.filter(req => {
    if (req.status === 'pending_resident') return false;
    
    if (filter === 'all') return true;
    if (filter === 'active') return ['pending', 'authorized', 'arrived'].includes(req.status);
    if (filter === 'completed') return ['completed', 'entered', 'denied', 'denied_by_resident', 'canceled'].includes(req.status);
    
    return true;
  });
  
  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.profileHeader}>
        <View style={styles.profileInfo}>
          <Text style={styles.greeting}>
            Olá, {userProfile?.displayName?.split(' ')[0] || 'Motorista'}
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
      
      {/* Promoção (pode ser escondida) */}
      {showPromo && (
        <PromoBanner 
          onPress={() => navigation.navigate('DriverSubscription')}
          onDismiss={() => setShowPromo(false)}
        />
      )}
      
      {/* Filtros */}
      {renderFilterButtons()}
      
      {/* Mensagem de erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Solicitações pendentes de aprovação de morador */}
      <PendingResidentApproval />

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
  {item.createdAt 
    ? (() => {
        // Verifica se é um timestamp do Firestore
        if (item.createdAt && item.createdAt.toDate) {
          return item.createdAt.toDate().toLocaleDateString('pt-BR');
        }
        
        // Verifica se é uma data ISO ou timestamp em milissegundos
        const date = new Date(item.createdAt);
        return isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR');
      })()
    : ''}
</Text>
              </View>

              <View style={styles.requestContent}>
                <Text style={styles.unitInfo}>
                  <MaterialCommunityIcons name="home" size={16} color={getColor('grey.600')} />
                  {' '}Unidade: {item.unit}
                  {item.block ? ` • Bloco ${item.block}` : ''}
                </Text>
                <Text style={styles.residentName}>
                  {item.residentName || 'Morador'}
                </Text>
                <Text style={styles.condoName}>
                  {item.condoName || 'Condomínio'}
                </Text>
              </View>

              <View style={styles.requestActions}>
                {item.status === 'authorized' && (
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.qrButton]}
                    onPress={() => handleShowQR(item.id)}
                  >
                    <MaterialCommunityIcons name="qrcode" size={20} color={getColor('white')} />
                    <Text style={styles.qrButtonText}>QR Code</Text>
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
     
      {/* Botão flutuante para solicitar acesso */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate('Search')}
        label="Solicitar Acesso"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  profileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 35,
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
  promoBanner: {
    backgroundColor: '#FFF8E1',
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoIcon: {
    marginRight: 12,
  },
  promoText: {
    flex: 1,
    fontSize: 14,
    color: '#212121',
  },
  promoActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  promoButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  subscribeButton: {
    backgroundColor: '#FF9800',
    marginRight: 12,
  },
  subscribeButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  dismissButton: {
    padding: 4,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    borderLeftWidth: 3,
    borderLeftColor: '#FF9800',
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
  unitInfo: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 4,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  condoName: {
    fontSize: 14,
    color: '#616161',
  },
  detailsButton: {
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  detailsButtonText: {
    color: '#1E88E5',
    fontWeight: '500',
  },
  requestCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
  },
  requestActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
   emptyAnimation: {
    width: 150,
    height: 150,
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  qrButton: {
    backgroundColor: '#1E88E5',
  },
  qrButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 4,
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
  emptyButton: {
    backgroundColor: '#1E88E5',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
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

export default DriverHomeScreen;