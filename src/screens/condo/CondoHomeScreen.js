import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, FlatList, RefreshControl, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator, Searchbar, Badge, Divider, Card as PaperCard, FAB } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';

// Serviços
import AccessService from '../../services/access.service';

// Utilitários
import { formatDate } from '../../utils/format';

const CondoHomeScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('pending'); // 'pending', 'authorized', 'completed', 'all'
  const [searchQuery, setSearchQuery] = useState('');

  // Carregar solicitações quando a tela receber foco
  useFocusEffect(
    useCallback(() => {
      loadRequests();
    }, [filter])
  );

  // Filtrar solicitações com base na pesquisa
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRequests(requests);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = requests.filter(
        req => 
          req.driverName?.toLowerCase().includes(query) ||
          req.vehiclePlate?.toLowerCase().includes(query) ||
          req.unit?.toString().includes(query) ||
          req.block?.toLowerCase().includes(query)
      );
      setFilteredRequests(filtered);
    }
  }, [searchQuery, requests]);

  // Função para carregar solicitações
  const loadRequests = async () => {
    if (refreshing) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Definir condições baseadas no filtro
      let status = null;
      if (filter === 'pending') {
        status = ['pending'];
      } else if (filter === 'authorized') {
        status = ['authorized', 'arrived'];
      } else if (filter === 'completed') {
        status = ['completed', 'entered', 'denied', 'canceled'];
      }
      
      // Buscar solicitações
      const accessRequests = await AccessService.getAccessRequests(status);
      setRequests(accessRequests);
      setFilteredRequests(accessRequests);
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

  // Função para aprovar uma solicitação
  const handleApproveRequest = (requestId) => {
    Alert.alert(
      'Aprovar Solicitação',
      'Tem certeza que deseja aprovar esta solicitação de acesso?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Aprovar',
          onPress: async () => {
            try {
              await AccessService.updateAccessRequestStatus(requestId, 'authorized');
              Alert.alert('Sucesso', 'Solicitação aprovada com sucesso');
              // Atualizar a lista
              loadRequests();
            } catch (error) {
              console.error('Erro ao aprovar solicitação:', error);
              Alert.alert('Erro', 'Não foi possível aprovar a solicitação');
            }
          },
        },
      ]
    );
  };

  // Função para negar uma solicitação
  const handleDenyRequest = (requestId) => {
    Alert.alert(
      'Negar Solicitação',
      'Tem certeza que deseja negar esta solicitação de acesso?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Negar',
          onPress: async () => {
            try {
              // Pedir motivo da negação (opcional)
              // Pode ser implementado com um modal de input
              await AccessService.updateAccessRequestStatus(requestId, 'denied');
              Alert.alert('Sucesso', 'Solicitação negada com sucesso');
              // Atualizar a lista
              loadRequests();
            } catch (error) {
              console.error('Erro ao negar solicitação:', error);
              Alert.alert('Erro', 'Não foi possível negar a solicitação');
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
      },
      authorized: {
        label: 'Autorizado',
        color: '#4CAF50',
        icon: 'check-circle-outline',
      },
      denied: {
        label: 'Negado',
        color: theme.colors.error,
        icon: 'close-circle-outline',
      },
      arrived: {
        label: 'Na portaria',
        color: '#2196F3',
        icon: 'map-marker',
      },
      entered: {
        label: 'Entrou',
        color: '#9C27B0',
        icon: 'login',
      },
      completed: {
        label: 'Concluído',
        color: '#4CAF50',
        icon: 'check-circle',
      },
      canceled: {
        label: 'Cancelado',
        color: '#757575',
        icon: 'cancel',
      }
    };
    
    const status = statusInfo[item.status] || {
      label: 'Desconhecido',
      color: '#757575',
      icon: 'help-circle-outline',
    };
    
    // Formatar data
    const createdDate = formatDate(item.createdAt, { 
      showTime: true, 
      dateFormat: 'dd/MM/yyyy' 
    });
    
    return (
      <PaperCard 
        style={styles.requestCard}
        onPress={() => navigation.navigate('CondoAccessDetails', { requestId: item.id })}
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
              <Text style={styles.infoText}>
                {item.vehiclePlate ? `Placa: ${item.vehiclePlate}` : 'Sem placa'}
              </Text>
            </View>
          </View>
          
          <View style={styles.unitInfo}>
            <MaterialCommunityIcons name="home" size={20} color="#555" style={styles.icon} />
            <Text style={styles.infoText}>
              Unidade: {item.unit || 'N/A'}
              {item.block ? ` • Bloco ${item.block}` : ''}
            </Text>
          </View>
        </View>
        
        <PaperCard.Actions style={styles.cardActions}>
          {item.status === 'pending' && (
            <>
              <Button 
                mode="contained" 
                compact
                onPress={() => handleApproveRequest(item.id)}
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                labelStyle={styles.actionButtonLabel}
              >
                Aprovar
              </Button>
              <Button 
                mode="contained" 
                compact
                onPress={() => handleDenyRequest(item.id)}
                style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                labelStyle={styles.actionButtonLabel}
              >
                Negar
              </Button>
            </>
          )}
          
          <Button 
            mode="text" 
            compact
            onPress={() => navigation.navigate('CondoAccessDetails', { requestId: item.id })}
            labelStyle={styles.actionButtonLabel}
          >
            Detalhes
          </Button>
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
          filter === 'pending' && { backgroundColor: theme.colors.primary + '20' }
        ]}
        onPress={() => setFilter('pending')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'pending' && { color: theme.colors.primary, fontWeight: 'bold' }
          ]}
        >
          Pendentes
        </Text>
        {requests.filter(req => req.status === 'pending').length > 0 && (
          <Badge style={[styles.filterBadge, { backgroundColor: theme.colors.accent }]}>
            {requests.filter(req => req.status === 'pending').length}
          </Badge>
        )}
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[
          styles.filterButton,
          filter === 'authorized' && { backgroundColor: theme.colors.primary + '20' }
        ]}
        onPress={() => setFilter('authorized')}
      >
        <Text
          style={[
            styles.filterText,
            filter === 'authorized' && { color: theme.colors.primary, fontWeight: 'bold' }
          ]}
        >
          Autorizados
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

  return (
    <View style={styles.container}>
      {/* Cabeçalho */}
      <View style={styles.headerActions}>
          <Button
            mode="outlined"
            icon="chart-bar"
            onPress={() => navigation.navigate('CondoDashboard')}
            style={styles.dashboardButton}
          >
            Dashboard
          </Button>
        </View>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>
            Olá, {userProfile?.displayName?.split(' ')[0] || 'Condomínio'}
          </Text>
          <Text style={styles.subtitle}>
            Gerencie as solicitações de acesso
          </Text>
        </View>
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
      
      {/* Lista de solicitações */}
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
      
      {/* Botão para escanear QR Code */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="qrcode-scan"
        onPress={() => navigation.navigate('CondoQRScanner')}
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
  searchBarContainer: {
    padding: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBar: {
    elevation: 0,
    backgroundColor: '#f0f0f0',
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexWrap: 'wrap',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
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
  actionButton: {
    marginHorizontal: 4,
    marginVertical: 4,
  },
  headerActions: {
    marginTop: 10,
  },
  dashboardButton: {
    alignSelf: 'flex-start',
  },
  actionButtonLabel: {
    fontSize: 12,
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
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CondoHomeScreen;