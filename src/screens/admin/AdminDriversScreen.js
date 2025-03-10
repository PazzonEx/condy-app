// src/screens/admin/AdminDriversScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TouchableOpacity, 
  RefreshControl,
  ActivityIndicator,
  Image
} from 'react-native';
import { 
  Text, 
  Surface, 
  Searchbar, 
  Chip, 
  Button, 
  Divider, 
  FAB,
  useTheme,
  Avatar
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Serviços
import FirestoreService from '../../services/firestore.service';

// Componentes personalizados
import EmptyState from '../../components/EmptyState';

const AdminDriversScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  
  // Estados
  const [drivers, setDrivers] = useState([]);
  const [filteredDrivers, setFilteredDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Carregar motoristas
  useEffect(() => {
    loadDrivers();
  }, []);
  
  // Função para carregar motoristas
  const loadDrivers = async () => {
    try {
      setLoading(true);
      
      // Buscar todos os motoristas
      const driversData = await FirestoreService.getCollection('drivers');
      
      // Ordenar por nome
      const sortedDrivers = driversData.sort((a, b) => {
        const nameA = a.name || a.personalData?.name || '';
        const nameB = b.name || b.personalData?.name || '';
        return nameA.localeCompare(nameB);
      });
      
      setDrivers(sortedDrivers);
      filterDrivers(sortedDrivers, searchQuery, activeFilter);
    } catch (error) {
      console.error('Erro ao carregar motoristas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  // Filtrar motoristas
  const filterDrivers = (driversList, query, filter) => {
    if (!driversList) return;
    
    let result = [...driversList];
    
    // Filtrar por texto de busca
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(driver => {
        const name = (driver.name || driver.personalData?.name || '').toLowerCase();
        const plateNumber = (driver.vehiclePlate || driver.vehicleData?.plate || '').toLowerCase();
        const cpf = (driver.cpf || driver.personalData?.cpf || '').toLowerCase();
        
        return name.includes(lowerQuery) || 
               plateNumber.includes(lowerQuery) || 
               cpf.includes(lowerQuery);
      });
    }
    
    // Filtrar por status
    if (filter !== 'all') {
      result = result.filter(driver => driver.status === filter);
    }
    
    setFilteredDrivers(result);
  };
  
  // Buscar motoristas
  const handleSearch = (query) => {
    setSearchQuery(query);
    filterDrivers(drivers, query, activeFilter);
  };
  
  // Aplicar filtro de status
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterDrivers(drivers, searchQuery, filter);
  };
  
  // Atualizar lista
  const handleRefresh = () => {
    setRefreshing(true);
    loadDrivers();
  };
  
  // Navegar para detalhes do motorista
  const navigateToDriverDetails = (driver) => {
    navigation.navigate('AdminUserDetails', {
      userId: driver.id,
      userType: 'driver',
      userName: driver.name || driver.personalData?.name || 'Motorista'
    });
  };
  
  // Navegar para tela de aprovação
  const navigateToApproval = (driver) => {
    navigation.navigate('AdminApproval', {
      userId: driver.id,
      userType: 'driver',
      userName: driver.name || driver.personalData?.name || 'Motorista'
    });
  };
  
  // Renderizar item da lista de motoristas
  const renderDriverItem = ({ item }) => {
    const driverName = item.name || item.personalData?.name || 'Motorista sem nome';
    const driverPlate = item.vehiclePlate || item.vehicleData?.plate || 'Sem placa';
    const driverStatus = item.status || 'pending_verification';
    const vehicleInfo = getVehicleDescription(item);
    const profilePhoto = item.documents?.profilePhoto?.[0]?.thumbnailUrl;
    
    return (
      <Surface style={styles.driverCard}>
        <TouchableOpacity 
          style={styles.driverCardInner}
          onPress={() => navigateToDriverDetails(item)}
        >
          <View style={styles.driverAvatar}>
            {profilePhoto ? (
              <Avatar.Image size={60} source={{ uri: profilePhoto }} />
            ) : (
              <Avatar.Icon size={60} icon="account" />
            )}
          </View>
          
          <View style={styles.driverInfo}>
            <View style={styles.driverHeader}>
              <Text style={styles.driverName} numberOfLines={1}>{driverName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(driverStatus) + '20' }]}>
                <Text style={[styles.statusText, { color: getStatusColor(driverStatus) }]}>
                  {getStatusLabel(driverStatus)}
                </Text>
              </View>
            </View>
            
            <View style={styles.driverDetails}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="car" size={16} color="#757575" />
                <Text style={styles.detailText}>{vehicleInfo}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="car-estate" size={16} color="#757575" />
                <Text style={styles.detailText}>{driverPlate}</Text>
              </View>
              
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="calendar" size={16} color="#757575" />
                <Text style={styles.detailText}>{getFormattedDate(item.createdAt)}</Text>
              </View>
            </View>
            
            <View style={styles.serviceChips}>
              {item.workData?.appServices?.map((service, index) => (
                <Chip 
                  key={index} 
                  style={styles.serviceChip}
                  textStyle={styles.serviceChipText}
                  mode="outlined"
                >
                  {service}
                </Chip>
              ))}
            </View>
          </View>
          
          <View style={styles.driverActions}>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
          </View>
        </TouchableOpacity>
        
        {driverStatus === 'pending_verification' && (
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
  
  // Obter descrição do veículo
  const getVehicleDescription = (driver) => {
    const make = driver.vehicleMake || driver.vehicleData?.make || '';
    const model = driver.vehicleModel || driver.vehicleData?.model || '';
    const color = driver.vehicleColor || driver.vehicleData?.color || '';
    
    if (make && model) {
      return `${make} ${model}${color ? ` ${color}` : ''}`;
    }
    
    return 'Veículo não informado';
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
  
  // Contar motoristas por status
  const countDriversByStatus = (status) => {
    if (!drivers.length) return 0;
    
    if (status === 'all') {
      return drivers.length;
    }
    
    return drivers.filter(driver => driver.status === status).length;
  };
  
  return (
    <View style={styles.container}>
      {/* Barra de pesquisa */}
      <Surface style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar motoristas"
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
            count={countDriversByStatus('all')}
            active={activeFilter === 'all'}
            onPress={() => handleFilterChange('all')}
          />
          
          <FilterChip
            label="Ativos"
            count={countDriversByStatus('active')}
            active={activeFilter === 'active'}
            onPress={() => handleFilterChange('active')}
            color="#4CAF50"
          />
          
          <FilterChip
            label="Pendentes"
            count={countDriversByStatus('pending_verification')}
            active={activeFilter === 'pending_verification'}
            onPress={() => handleFilterChange('pending_verification')}
            color="#FF9800"
          />
          
          <FilterChip
            label="Rejeitados"
            count={countDriversByStatus('rejected')}
            active={activeFilter === 'rejected'}
            onPress={() => handleFilterChange('rejected')}
            color="#F44336"
          />
        </ScrollView>
      </Surface>
      
      {/* Lista de motoristas */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando motoristas...</Text>
        </View>
      ) : filteredDrivers.length === 0 ? (
        <EmptyState
          icon="car"
          title="Nenhum motorista encontrado"
          description={
            searchQuery 
              ? 'Tente usar outros termos na busca'
              : 'Não há motoristas cadastrados nesta categoria'
          }
          buttonText={searchQuery ? 'Limpar busca' : null}
          onButtonPress={searchQuery ? () => handleSearch('') : null}
        />
      ) : (
        <FlatList
          data={filteredDrivers}
          renderItem={renderDriverItem}
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
  driverCard: {
    borderRadius: 8,
    marginBottom: 16,
    overflow: 'hidden',
  },
  driverCardInner: {
    padding: 16,
    flexDirection: 'row',
  },
  driverAvatar: {
    marginRight: 16,
  },
  driverInfo: {
    flex: 1,
  },
  driverHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  driverName: {
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
  driverDetails: {
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailText: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
  },
  serviceChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  serviceChip: {
    marginRight: 4,
    marginBottom: 4,
    height: 24,
  },
  serviceChipText: {
    fontSize: 10,
  },
  driverActions: {
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
  }
});

export default AdminDriversScreen;