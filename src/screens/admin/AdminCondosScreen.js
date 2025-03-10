// src/screens/admin/AdminCondosScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { 
  Text, 
  Surface, 
  Searchbar, 
  Chip, 
  Button, 
  Divider, 
  FAB,
  useTheme 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Serviços
import FirestoreService from '../../services/firestore.service';

// Componentes personalizados
import EmptyState from '../../components/EmptyState';

const AdminCondosScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  
  // Estados
  const [condos, setCondos] = useState([]);
  const [filteredCondos, setFilteredCondos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Carregar condomínios
  useEffect(() => {
    loadCondos();
  }, []);
  
  // Função para carregar condomínios
  const loadCondos = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os condomínios
      const condosData = await FirestoreService.getCollection('condos');
      
      // Ordenar por nome
      const sortedCondos = condosData.sort((a, b) => {
        const nameA = a.name || a.condoData?.name || '';
        const nameB = b.name || b.condoData?.name || '';
        return nameA.localeCompare(nameB);
      });
      
      setCondos(sortedCondos);
      filterCondos(sortedCondos, searchQuery, activeFilter);
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Filtrar condomínios
  const filterCondos = (condosList, query, filter) => {
    if (!condosList) return;
    
    let result = [...condosList];
    
    // Filtrar por texto de busca
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(condo => {
        const name = (condo.name || condo.condoData?.name || '').toLowerCase();
        const address = (condo.address || condo.addressData?.fullAddress || '').toLowerCase();
        const cnpj = (condo.cnpj || condo.condoData?.cnpj || '').toLowerCase();
        
        return name.includes(lowerQuery) || 
               address.includes(lowerQuery) || 
               cnpj.includes(lowerQuery);
      });
    }
    
    // Filtrar por status
    if (filter !== 'all') {
      result = result.filter(condo => condo.status === filter);
    }
    
    setFilteredCondos(result);
  };
  
  // Buscar condomínios
  const handleSearch = (query) => {
    setSearchQuery(query);
    filterCondos(condos, query, activeFilter);
  };
  
  // Aplicar filtro de status
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterCondos(condos, searchQuery, filter);
  };
  
  // Atualizar lista
  const handleRefresh = () => {
    setRefreshing(true);
    loadCondos();
  };
  
  // Navegar para detalhes do condomínio
  const navigateToCondoDetails = (condo) => {
    navigation.navigate('AdminUserDetails', {
      userId: condo.id,
      userType: 'condo',
      userName: condo.name || condo.condoData?.name || 'Condomínio'
    });
  };
  
  // Navegar para tela de aprovação
  const navigateToApproval = (condo) => {
    navigation.navigate('AdminApproval', {
      userId: condo.id,
      userType: 'condo',
      userName: condo.name || condo.condoData?.name || 'Condomínio'
    });
  };
  
  // Renderizar item da lista de condomínios
  const renderCondoItem = ({ item }) => {
    const condoName = item.name || item.condoData?.name || 'Condomínio sem nome';
    const condoAddress = item.address || item.addressData?.fullAddress || 'Endereço não informado';
    const condoStatus = item.status || 'pending_verification';
    
    return (
      <Surface style={styles.condoCard}>
        <TouchableOpacity 
          style={styles.condoCardInner}
          onPress={() => navigateToCondoDetails(item)}
        >
          <View style={styles.condoInfo}>
            <View style={styles.condoHeader}>
              <Text style={styles.condoName} numberOfLines={1}>{condoName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(condoStatus) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(condoStatus) }]}>
                  {getStatusLabel(condoStatus)}
                </Text>
              </View>
            </View>
            
            <Text style={styles.condoAddress} numberOfLines={2}>{condoAddress}</Text>
            
            <View style={styles.condoStats}>
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="home" size={16} color="#757575" />
                <Text style={styles.statText}>
                  {item.totalUnits || item.condoInfo?.totalUnits || 0} unidades
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="office-building" size={16} color="#757575" />
                <Text style={styles.statText}>
                  {item.totalBlocks || item.condoInfo?.totalBlocks || 0} blocos
                </Text>
              </View>
              
              <View style={styles.statItem}>
                <MaterialCommunityIcons name="calendar" size={16} color="#757575" />
                <Text style={styles.statText}>
                  {getFormattedDate(item.createdAt)}
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.condoActions}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
          </View>
        </TouchableOpacity>
        
        {condoStatus === 'pending_verification' && (
          <View style={styles.approvalActions}>
            <Button 
              mode="text" 
              compact 
              icon="close" 
              color="#F44336"
              onPress={() => navigateToApproval(item)}
              style={styles.rejectButton}
            >
              Rejeitar
            </Button>
            
            <Button 
              mode="text" 
              compact 
              icon="check" 
              color="#4CAF50"
              onPress={() => navigateToApproval(item)}
              style={styles.approveButton}
            >
              Aprovar
            </Button>
          </View>
        )}
      </Surface>
    );
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
  
  // Título baseado no status
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
  
  // Cor baseada no status
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
  
  // Contar condomínios por status
  const countCondosByStatus = (status) => {
    if (!condos.length) return 0;
    
    if (status === 'all') {
      return condos.length;
    }
    
    return condos.filter(condo => condo.status === status).length;
  };
  
  return (
    <View style={styles.container}>
      {/* Barra de pesquisa */}
      <Surface style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar condomínios"
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={theme.colors.primary}
        />
      </Surface>
      
      {/* Filtros */}
      <Surface style={styles.filtersContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          <FilterChip
            label="Todos"
            count={countCondosByStatus('all')}
            active={activeFilter === 'all'}
            onPress={() => handleFilterChange('all')}
          />
          
          <FilterChip
            label="Ativos"
            count={countCondosByStatus('active')}
            active={activeFilter === 'active'}
            onPress={() => handleFilterChange('active')}
            color="#4CAF50"
          />
          
          <FilterChip
            label="Pendentes"
            count={countCondosByStatus('pending_verification')}
            active={activeFilter === 'pending_verification'}
            onPress={() => handleFilterChange('pending_verification')}
            color="#FF9800"
          />
          
          <FilterChip
            label="Rejeitados"
            count={countCondosByStatus('rejected')}
            active={activeFilter === 'rejected'}
            onPress={() => handleFilterChange('rejected')}
            color="#F44336"
          />
        </ScrollView>
      </Surface>
      
      {/* Lista de condomínios */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando condomínios...</Text>
        </View>
      ) : filteredCondos.length === 0 ? (
        <EmptyState
          icon="office-building"
          title="Nenhum condomínio encontrado"
          description={
            searchQuery 
              ? 'Tente usar outros termos na busca'
              : 'Não há condomínios cadastrados nesta categoria'
          }
          buttonText={searchQuery ? 'Limpar busca' : null}
          onButtonPress={searchQuery ? () => handleSearch('') : null}
        />
      ) : (
        <FlatList
          data={filteredCondos}
          renderItem={renderCondoItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]} 
            />
          }
        />
      )}
      
      {/* Botão flutuante para adicionar */}
      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => {
          // Navegar para tela de criação de condomínio
          // Ou mostrar modal com opções
          console.log('Adicionar condomínio');
        }}
      />
    </View>
  );
};

// Componente de chip de filtro
const FilterChip = ({ label, count, active, onPress, color }) => {
  return (
    <Chip
      mode={active ? 'flat' : 'outlined'}
      selected={active}
      onPress={onPress}
      style={[
        styles.filterChip,
        active && color ? { backgroundColor: color + '20' } : null
      ]}
      textStyle={[
        styles.filterChipText,
        active && color ? { color: color } : null
      ]}
    >
      {label} {count !== undefined && `(${count})`}
    </Chip>
  );
};

// Componente de ScrollView horizontal
const ScrollView = ({ children, ...props }) => {
  return (
    <FlatList
      horizontal
      data={[{ key: 'filters' }]}
      renderItem={() => <View>{children}</View>}
      keyExtractor={item => item.key}
      {...props}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    elevation: 1,
  },
  searchbar: {
    elevation: 0,
    backgroundColor: '#F5F5F5',
  },
  filtersContainer: {
    elevation: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filtersScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  filterChip: {
    marginRight: 8,
  },
  filterChipText: {
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#757575',
  },
  listContent: {
    padding: 16,
    paddingBottom: 80, // para o FAB não cobrir o último item
  },
  condoCard: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  condoCardInner: {
    padding: 16,
    flexDirection: 'row',
  },
  condoInfo: {
    flex: 1,
  },
  condoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  condoName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  condoAddress: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  condoStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  statText: {
    fontSize: 12,
    color: '#757575',
    marginLeft: 4,
  },
  condoActions: {
    justifyContent: 'center',
  },
  approvalActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  rejectButton: {
    flex: 1,
    borderRadius: 0,
  },
  approveButton: {
    flex: 1,
    borderRadius: 0,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  }
});

export default AdminCondosScreen;