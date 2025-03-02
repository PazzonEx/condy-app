import React, { useState, useEffect, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, FAB, useTheme, ActivityIndicator, Badge, Card as PaperCard, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';

// Serviços
import AccessService from '../../services/access.service';
import FirestoreService from '../../services/firestore.service';

// Utilitários
import { formatDate } from '../../utils/format';

const ResidentHomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState('active'); // 'active', 'completed', 'all'

  // Carregar solicitações quando a tela receber foco
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filter])
  );
  // Em ResidentHomeScreen.js - Adicionar filtragem para solicitações pendentes de aprovação
  useEffect(() => {
    const checkPendingRequests = async () => {
      try {
        const conditions = [
          { field: 'residentId', operator: '==', value: userProfile.id },
          { field: 'status', operator: '==', value: 'pending_resident' }
        ];
        
        const pendingRequests = await FirestoreService.queryDocuments(
          'access_requests', 
          conditions
        );
        
        setPendingCount(pendingRequests.length);
      } catch (error) {
        console.error('Erro ao verificar solicitações pendentes:', error);
      }
    };
    
    if (userProfile?.id) {
      checkPendingRequests();
    }
  }, [userProfile]);
// Função para aprovar solicitação de acesso
const handleApproveRequest = async (requestId) => {
  try {
    setLoading(true);
    
    // Atualizar o status para "pending" (aguardando aprovação da portaria)
    await AccessService.updateAccessRequestStatus(requestId, 'pending', {
      residentApproved: true,
      residentApprovedAt: new Date()
    });
    
    Alert.alert('Sucesso', 'Solicitação aprovada. A portaria será notificada.');
    
    // Recarregar solicitações
    loadRequests();
  } catch (error) {
    console.error('Erro ao aprovar solicitação:', error);
    Alert.alert('Erro', 'Não foi possível aprovar a solicitação');
    setLoading(false);
  }
};


const handleRejectRequest = async (requestId) => {
  try {
    setLoading(true);
    
    // Atualizar o status para "denied"
    await AccessService.updateAccessRequestStatus(requestId, 'denied', {
      residentApproved: false,
      residentDeniedAt: new Date()
    });
    
    Alert.alert('Sucesso', 'Solicitação rejeitada.');
    
    // Recarregar solicitações
    loadRequests();
  } catch (error) {
    console.error('Erro ao rejeitar solicitação:', error);
    Alert.alert('Erro', 'Não foi possível rejeitar a solicitação');
    setLoading(false);
  }
};

 // No método loadRequests de ResidentHomeScreen.js
const loadRequests = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Buscar solicitações de acesso do morador
    const conditions = [
      { field: 'residentId', operator: '==', value: userProfile.id }
    ];
    
    // Adicionar status se filtro ativo
    if (filter === 'active') {
      conditions.push({ 
        field: 'status', 
        operator: 'in', 
        value: ['pending', 'pending_resident', 'authorized', 'arrived'] 
      });
    } else if (filter === 'completed') {
      conditions.push({ 
        field: 'status', 
        operator: 'in', 
        value: ['completed', 'entered', 'denied', 'canceled'] 
      });
    }
    
    // Buscar todas as solicitações que correspondem ao morador
    const requestsData = await FirestoreService.queryDocuments(
      'access_requests', 
      conditions,
      { field: 'createdAt', direction: 'desc' }
    );
    
    console.log(`Encontradas ${requestsData.length} solicitações para o morador`);
    
    setRequests(requestsData);
  } catch (error) {
    console.error('Erro ao carregar solicitações:', error);
    setError('Não foi possível carregar as solicitações');
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};

  // Função para atualizar a lista ao puxar para baixo
  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests();
  };

  // Função para cancelar uma solicitação
  const handleCancelRequest = (requestId) => {
    Alert.alert(
      'Cancelar Solicitação',
      'Tem certeza que deseja cancelar esta solicitação?',
      [
        {
          text: 'Não',
          style: 'cancel',
        },
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
          },
        },
      ]
    );
  };

  // Renderizar um item da lista de solicitações
  const renderRequestItem = ({ item }) => {
    // Informações de status e cores
    const statusInfo = {
      pending: {
        label: 'Pendente',
        color: theme.colors.accent,
        icon: 'clock-outline',
        description: 'Aguardando aprovação'
      },
      pending_resident: {
        label: 'Aprovação Pendente',
        color: '#FF9800', // Laranja
        icon: 'account-clock',
        description: 'Requer sua aprovação'
      },
      authorized: {
        label: 'Autorizado',
        color: '#4CAF50',
        icon: 'check-circle-outline',
        description: 'Acesso autorizado'
      },
      denied: {
        label: 'Negado',
        color: theme.colors.error,
        icon: 'close-circle-outline',
        description: 'Acesso negado'
      },
      arrived: {
        label: 'Na portaria',
        color: '#2196F3',
        icon: 'map-marker',
        description: 'Motorista na portaria'
      },
      entered: {
        label: 'Entrou',
        color: '#9C27B0',
        icon: 'login',
        description: 'Motorista entrou'
      },
      completed: {
        label: 'Concluído',
        color: '#4CAF50',
        icon: 'check-circle',
        description: 'Acesso concluído'
      },
      canceled: {
        label: 'Cancelado',
        color: '#757575',
        icon: 'cancel',
        description: 'Solicitação cancelada'
      }
    };
    
    const status = statusInfo[item.status] || {
      label: 'Desconhecido',
      color: '#757575',
      icon: 'help-circle-outline',
      description: 'Status desconhecido'
    };
    
    // Formatar data
    const createdDate = formatDate(item.createdAt, { 
      showTime: true, 
      dateFormat: 'dd/MM/yyyy' 
    });
    // Componente para exibir solicitações pendentes de aprovação do morador
// Componente adicional em ResidentHomeScreen.js para solicitações pendentes de aprovação
const PendingApprovalItem = ({ request, onApprove, onReject }) => {
  return (
    <PaperCard style={styles.pendingRequestCard}>
      <PaperCard.Content>
        <View style={styles.pendingHeader}>
          <MaterialCommunityIcons name="alert-circle" size={24} color="#FF9800" />
          <Text style={styles.pendingTitle}>Aprovação Pendente</Text>
        </View>
        
        <Text style={styles.pendingText}>
          O motorista <Text style={styles.highlightText}>{request.driverName}</Text> 
          está solicitando acesso à sua unidade.
        </Text>
        
        <View style={styles.driverDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="car" size={18} color="#555" />
            <Text style={styles.detailText}>
              {request.vehicleModel || 'Veículo não informado'}
            </Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="card-account-details" size={18} color="#555" />
            <Text style={styles.detailText}>
              {request.vehiclePlate || 'Placa não informada'}
            </Text>
          </View>
        </View>
        
        <View style={styles.actionButtons}>
          <Button 
            mode="contained" 
            onPress={() => onApprove(request.id)}
            style={[styles.actionButton, {backgroundColor: '#4CAF50'}]}
          >
            Aprovar
          </Button>
          
          <Button 
            mode="contained" 
            onPress={() => onReject(request.id)}
            style={[styles.actionButton, {backgroundColor: '#F44336'}]}
          >
            Recusar
          </Button>
        </View>
      </PaperCard.Content>
    </PaperCard>
  );
};

// Adicionar à renderização condicional na lista de solicitações
{requests.filter(req => req.status === 'pending_resident' && req.flowType === 'driver_initiated').map(request => (
  <PendingApprovalItem
    key={request.id}
    request={request}
    onApprove={handleApproveRequest}
    onReject={handleRejectRequest}
  />
))};
    
    return (
      <PaperCard 
        style={styles.requestCard}
        onPress={() => navigation.navigate('AccessDetails', { requestId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons name={status.icon} size={24} color={status.color} />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.label}
            </Text>
          </View>
          <Text style={styles.dateText}>{createdDate}</Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.cardContent}>
          <View style={styles.driverInfo}>
            <MaterialCommunityIcons name="account" size={24} color="#555" style={styles.icon} />
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{item.driverName || 'Não informado'}</Text>
              <Text style={styles.infoText}>{status.description}</Text>
            </View>
          </View>
          
          <View style={styles.vehicleInfo}>
            <MaterialCommunityIcons name="car" size={20} color="#555" style={styles.icon} />
            <Text style={styles.infoText}>
              {item.vehiclePlate || 'Não informado'} 
              {item.vehicleModel ? ` · ${item.vehicleModel}` : ''}
            </Text>
          </View>
          
          {item.unit && (
            <View style={styles.unitInfo}>
              <MaterialCommunityIcons name="home" size={20} color="#555" style={styles.icon} />
              <Text style={styles.infoText}>
                Unidade: {item.unit}
                {item.block ? ` · Bloco ${item.block}` : ''}
              </Text>
            </View>
          )}
        </View>
        
        <PaperCard.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('AccessDetails', { requestId: item.id })}
          >
            Detalhes
          </Button>
          
          {(item.status === 'pending' || item.status === 'authorized') && (
            <Button 
              mode="text" 
              onPress={() => handleCancelRequest(item.id)}
              style={{ marginLeft: 8 }}
            >
              Cancelar
            </Button>
          )}
          
          {item.status === 'authorized' && (
            <Button 
              mode="text" 
              onPress={() => navigation.navigate('AccessDetails', { requestId: item.id, showQR: true })}
              style={{ marginLeft: 8 }}
              icon="qrcode"
            >
              QR Code
            </Button>
          )}
        </PaperCard.Actions>
      </PaperCard>
    );
  };

  // Renderizar filtros
  const renderFilters = () => (
    <View style={styles.filtersContainer}>
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'active' && { backgroundColor: theme.colors.primary + '20' }
        ]}
        onPress={() => setFilter('active')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'active' && { color: theme.colors.primary, fontWeight: 'bold' }
          ]}
        >
          Ativas
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'completed' && { backgroundColor: theme.colors.primary + '20' }
        ]}
        onPress={() => setFilter('completed')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'completed' && { color: theme.colors.primary, fontWeight: 'bold' }
          ]}
        >
          Concluídas
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'all' && { backgroundColor: theme.colors.primary + '20' }
        ]}
        onPress={() => setFilter('all')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'all' && { color: theme.colors.primary, fontWeight: 'bold' }
          ]}
        >
          Todas
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Renderizar mensagem de lista vazia
  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="clipboard-text-outline" size={64} color="#BDBDBD" />
      <Text style={styles.emptyTitle}>Nenhuma solicitação encontrada</Text>
      <Text style={styles.emptyText}>
        {filter === 'active'
          ? 'Você não tem solicitações ativas no momento'
          : filter === 'completed'
          ? 'Você não tem solicitações concluídas'
          : 'Você ainda não fez nenhuma solicitação'}
      </Text>
      <Button
        mode="contained"
        onPress={() => navigation.navigate('NewAccessRequest')}
        style={styles.newRequestButton}
      >
        Nova Solicitação
      </Button>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
  <View style={styles.headerContent}>
    <Text style={styles.greeting}>
      Olá, {userProfile?.displayName?.split(' ')[0] || 'Morador'}
    </Text>
    <Text style={styles.subtitle}>
      Gerencie o acesso ao seu condomínio
    </Text>
  </View>
  <TouchableOpacity 
    style={styles.notificationButton}
    onPress={() => navigation.navigate('ResidentNotifications')}
  >
    <MaterialCommunityIcons name="bell" size={24} color={theme.colors.primary} />
    {pendingCount > 0 && (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationBadgeText}>{pendingCount}</Text>
      </View>
    )}
  </TouchableOpacity>
</View>
      
      {/* Filtros */}
      {renderFilters()}
      {requests.filter(req => req.status === 'pending_resident').length > 0 && (
  <View style={styles.pendingSection}>
    <Text style={styles.pendingSectionTitle}>Solicitações Aguardando Sua Aprovação</Text>
    
    {requests.filter(req => req.status === 'pending_resident').map(request => (
      <PaperCard 
        key={request.id}
        style={[styles.requestCard, styles.pendingRequestCard]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons name="account-clock" size={24} color="#FF9800" />
            <Text style={[styles.statusText, { color: '#FF9800' }]}>
              Aguardando Sua Aprovação
            </Text>
          </View>
          <Text style={styles.dateText}>
            {formatDate(request.createdAt, { showTime: true, dateFormat: 'dd/MM/yyyy' })}
          </Text>
        </View>
        
        <Divider style={styles.divider} />
        
        <View style={styles.cardContent}>
          <View style={styles.driverInfo}>
            <MaterialCommunityIcons name="account" size={24} color="#555" style={styles.icon} />
            <View style={styles.driverDetails}>
              <Text style={styles.driverName}>{request.driverName || 'Motorista'}</Text>
              <Text style={styles.infoText}>Solicitando acesso à sua unidade</Text>
            </View>
          </View>
          
          <View style={styles.vehicleInfo}>
            <MaterialCommunityIcons name="car" size={20} color="#555" style={styles.icon} />
            <Text style={styles.infoText}>
              {request.vehiclePlate ? `Placa: ${request.vehiclePlate}` : 'Placa não informada'} 
              {request.vehicleModel ? ` • ${request.vehicleModel}` : ''}
            </Text>
          </View>
        </View>
        
        <PaperCard.Actions style={styles.cardActions}>
          <Button 
            mode="contained" 
            onPress={() => handleApproveRequest(request.id)}
            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
          >
            Aprovar
          </Button>
          
          <Button 
            mode="contained" 
            onPress={() => handleRejectRequest(request.id)}
            style={[styles.actionButton, { backgroundColor: '#F44336' }]}
          >
            Recusar
          </Button>
        </PaperCard.Actions>
      </PaperCard>
    ))}
  </View>
)}
      
      {/* Lista de solicitações */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando solicitações...</Text>
        </View>
      ) : (
        <FlatList
          data={requests}
          renderItem={renderRequestItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}
      
      {/* Botão para nova solicitação */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => navigation.navigate('NewAccessRequest')}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerContent: {
    flexDirection: 'column',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#757575',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Espaço para o FAB
  },
  requestCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
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
  divider: {
    marginVertical: 0,
  },
  cardContent: {
    padding: 16,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  vehicleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  unitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#555',
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    justifyContent: 'flex-end',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    minHeight: 300,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  pendingSection: {
    marginBottom: 20,
  },
  pendingSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#FF9800',
  },
  pendingRequestCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  actionButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  newRequestButton: {
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  // Adicionar estes estilos
notificationButton: {
  position: 'absolute',
  right: 16,
  top: 16,
},
notificationBadge: {
  position: 'absolute',
  right: -6,
  top: -6,
  backgroundColor: 'red',
  borderRadius: 10,
  width: 20,
  height: 20,
  justifyContent: 'center',
  alignItems: 'center',
},
notificationBadgeText: {
  color: 'white',
  fontSize: 12,
  fontWeight: 'bold',
},
});

export default ResidentHomeScreen;