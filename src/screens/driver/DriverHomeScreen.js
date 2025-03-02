import React, { useState, useCallback } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Divider, Card as PaperCard, Badge } from 'react-native-paper';
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

const DriverHomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active'); // 'active', 'completed', 'all'
  const [filteredRequests, setFilteredRequests] = useState([]);

  // Carregar solicitações quando a tela receber foco
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filter])
  );

  // Função para carregar solicitações
  const loadRequests = async () => {
    if (refreshing) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Definir condições baseadas no filtro
      let status = null;
      if (filter === 'active') {
        status = ['pending', 'pending_resident', 'authorized', 'arrived']; // Incluir "pending_resident"
      }else if (filter === 'completed') {
        status = ['completed', 'entered', 'denied', 'canceled']; // Status considerados "completados"
      }
      
      // Buscar solicitações
      const accessRequests = await AccessService.getAccessRequests(status);
      console.log('Solicitações carregadas:', accessRequests.length);
      console.log('Dados da primeira solicitação:', accessRequests.length > 0 ? JSON.stringify(accessRequests[0]) : 'Nenhuma');
      console.log("passei por aqui\n--------------------------------------------------------\n----------------------------------------------------\n---------------------------------");
      console.log('Dados da primeira solicitação:', accessRequests.length > 0 ? JSON.stringify(accessRequests) : 'Nenhuma');
      console.log("passei por aqui\n--\n--\n--\n--\n--\n-------");

      // Para cada solicitação, carregar informações do condomínio se não existirem
      const requestsWithCondoInfo = await Promise.all(
        accessRequests.map(async (request) => {
          // Se já tiver as informações do condomínio, retornar como está
          if (request.condo && request.condo.name) {
            return request;
          }
          
          // Se não tiver, buscar informações do condomínio
          try {
            if (request.condoId) {
              const condoDoc = await FirestoreService.getDocument('condos', request.condoId);
              if (condoDoc) {
                return {
                  ...request,
                  condo: condoDoc
                };
              }
            }
          } catch (condoError) {
            console.warn(`Erro ao carregar condomínio para solicitação ${request.id}:`, condoError);
          }
          
          // Se não conseguir carregar o condomínio, retornar com info padrão
          return {
            ...request,
            condo: {
              name: request.condoName || "Condomínio não especificado",
              address: request.condoAddress || "Endereço não disponível"
            }
          };
        })
      );
      
      setRequests(requestsWithCondoInfo);
      setFilteredRequests(requestsWithCondoInfo);
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
  
  // Adicionar o novo status "pending_resident"
  pending_resident: {
    label: 'Aguardando Morador',
    color: '#FF9800', // Laranja para diferenciação
    icon: 'account-clock',
    description: 'Aguardando aprovação do morador'
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
        description: 'Você está na portaria'
      },
      entered: {
        label: 'Entrou',
        color: '#9C27B0',
        icon: 'login',
        description: 'Você entrou no condomínio'
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
    
    return (
      <PaperCard 
        style={styles.requestCard}
        onPress={() => navigation.navigate('DriverAccessDetails', { requestId: item.id })}
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
          <View style={styles.condoInfo}>
            <MaterialCommunityIcons name="office-building" size={24} color="#555" style={styles.icon} />
            <View style={styles.condoDetails}>
              <Text style={styles.condoName}>{item.condo?.name || item.condoName || 'Condomínio não especificado'}</Text>
              <Text style={styles.infoText}>{status.description}</Text>
            </View>
          </View>
          
          {(item.condo?.address || item.condoAddress) && (
            <View style={styles.addressInfo}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#555" style={styles.icon} />
              <Text style={styles.infoText}>
                {item.condo?.address || item.condoAddress}
              </Text>
            </View>
          )}
          
          <View style={styles.unitInfo}>
            <MaterialCommunityIcons name="home" size={20} color="#555" style={styles.icon} />
            <Text style={styles.infoText}>
              Unidade: {item.unit || 'N/A'}
              {item.block ? ` • Bloco ${item.block}` : ''}
            </Text>
          </View>
        </View>
        
        <PaperCard.Actions style={styles.cardActions}>
          <Button 
            mode="text" 
            onPress={() => navigation.navigate('DriverAccessDetails', { requestId: item.id })}
          >
            Detalhes
          </Button>
          
          {item.status === 'authorized' && (
            <Button 
              mode="contained" 
              icon="qrcode"
              onPress={() => navigation.navigate('DriverAccessDetails', { requestId: item.id, showQR: true })}
              style={[styles.qrButton, { backgroundColor: theme.colors.primary }]}
            >
              Mostrar QR Code
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
          Ativos
        </Text>
        {requests.filter(req => ['pending', 'authorized', 'arrived'].includes(req.status)).length > 0 && (
          <Badge style={[styles.filterBadge, { backgroundColor: theme.colors.accent }]}>
            {requests.filter(req => ['pending', 'authorized', 'arrived'].includes(req.status)).length}
          </Badge>
        )}
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
          Concluídos
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
          Todos
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
          : 'Você ainda não recebeu nenhuma solicitação'}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>
            Olá, {userProfile?.displayName?.split(' ')[0] || 'Motorista'}
          </Text>
          <Text style={styles.subtitle}>
            Gerencie suas solicitações de acesso
          </Text>
        </View>
      </View>
      
      {/* Filtros */}
      {renderFilters()}
      
      {/* Lista de solicitações */}
      {requests.filter(req => req.status === 'pending_resident').length > 0 && (
          <PaperCard style={styles.pendingApprovalCard}>
            <PaperCard.Content>
              <View style={styles.pendingApprovalHeader}>
                <MaterialCommunityIcons name="clock-alert" size={24} color="#FF9800" />
                <Text style={styles.pendingApprovalTitle}>Aguardando Aprovação</Text>
              </View>
              
              <Text style={styles.pendingApprovalText}>
                Você tem {requests.filter(req => req.status === 'pending_resident').length} solicitação(ões) 
                aguardando aprovação do morador. Você será notificado quando houver uma resposta.
              </Text>
            </PaperCard.Content>
          </PaperCard>
        )}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
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
              colors={[theme.colors.primary]}
            />
          }
          ListEmptyComponent={renderEmptyList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  pendingApprovalCard: {
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  pendingApprovalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingApprovalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#FF9800',
  },
  pendingApprovalText: {
    fontSize: 14,
    color: '#555',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    color: '#757575',
  },
  filterBadge: {
    marginLeft: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 20,
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
  condoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  condoDetails: {
    flex: 1,
  },
  condoName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addressInfo: {
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
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  qrButton: {
    borderRadius: 4,
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
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default DriverHomeScreen;