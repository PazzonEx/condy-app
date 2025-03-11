// src/screens/admin/AdminUsersListScreen.js
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
  Avatar,
  useTheme,
  IconButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';

// Serviços
import FirestoreService from '../../services/firestore.service';

// Componentes personalizados
import EmptyState from '../../components/EmptyState';

const AdminUsersListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  
  // Parâmetros da rota
  const { userType, status, title } = route.params || {};
  
  // Estados
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState(status || 'all');
  
  // Carregar usuários
  useEffect(() => {
    // Resetar estados antes de carregar
    setUsers([]);
    setFilteredUsers([]);
    setSearchQuery('');
    setActiveFilter(status || 'all');
    
    loadUsers();
  }, [userType, status, route.params?.condoId]);
  
  // Função para carregar usuários
// Em src/screens/admin/AdminUsersListScreen.js
// No método loadUsers

// Função para carregar usuários
const loadUsers = async () => {
  try {
    setLoading(true);
    
    // Determinar coleção com base no tipo
    let collectionName;
    switch (userType) {
      case 'resident':
        collectionName = 'residents';
        break;
      case 'driver':
        collectionName = 'drivers';
        break;
      case 'condo':
        collectionName = 'condos';
        break;
      default:
        collectionName = 'users';
    }
    
    // Verificar se precisa filtrar por condomínio (caso especial para moradores)
    const condoId = route.params?.condoId;
    if (condoId && userType === 'resident') {
      console.log(`Filtrando moradores do condomínio: ${condoId}`);
      
      try {
        // Buscar moradores com base no condomínio
        const usersData = await FirestoreService.queryDocuments(
          'residents',
          [
            { field: 'residenceData.condoId', operator: '==', value: condoId }
          ],
          { field: 'name', direction: 'asc' } // Ordenar por nome
        );
        
        console.log(`Encontrados ${usersData.length} moradores para o condomínio ${condoId}`);
        
        setUsers(usersData);
        filterUsers(usersData, searchQuery, activeFilter);
      } catch (queryError) {
        console.error('Erro ao buscar moradores por condomínio:', queryError);
        
        // Fallback: método alternativo de busca
        const allResidents = await FirestoreService.getCollection('residents');
        const filteredResidents = allResidents.filter(resident => 
          resident.residenceData?.condoId === condoId
        );
        
        console.log(`Filtro manual: Encontrados ${filteredResidents.length} moradores para o condomínio ${condoId}`);
        
        setUsers(filteredResidents);
        filterUsers(filteredResidents, searchQuery, activeFilter);
      }
      
      setLoading(false);
      setRefreshing(false);
      return;
    }
    
    // Condições de consulta para casos normais
    const conditions = [];
    
    // Filtrar por tipo se estiver na coleção 'users'
    if (collectionName === 'users' && userType) {
      conditions.push({ field: 'type', operator: '==', value: userType });
    }
    
    // Filtrar por status se fornecido
    if (status) {
      conditions.push({ field: 'status', operator: '==', value: status });
    }
    
    console.log('Condições de busca:', JSON.stringify(conditions));
    
    // Ordenar por data de criação (mais recentes primeiro)
    const sortBy = { field: 'createdAt', direction: 'desc' };
    
    // Buscar usuários
    const usersData = await FirestoreService.queryDocuments(
      collectionName,
      conditions,
      sortBy,
      null // Sem limite de resultados
    );
    
    console.log(`Encontrados ${usersData.length} ${userType || 'usuários'} com os filtros fornecidos`);
    
    setUsers(usersData);
    filterUsers(usersData, searchQuery, activeFilter);
  } catch (error) {
    console.error('Erro ao carregar usuários:', error);
  } finally {
    setLoading(false);
    setRefreshing(false);
  }
};
  // Filtrar usuários
  const filterUsers = (usersList, query, filter) => {
    if (!usersList) return;
    
    let result = [...usersList];
    
    // Filtrar por texto de busca
    if (query) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(user => {
        // Para diferentes tipos de usuários, buscar em campos diferentes
        switch (userType) {
          case 'resident':
            return (
              (user.name || '').toLowerCase().includes(lowerQuery) ||
              (user.personalData?.name || '').toLowerCase().includes(lowerQuery) ||
              (user.email || '').toLowerCase().includes(lowerQuery)
            );
          case 'condo':
            return (
              (user.name || '').toLowerCase().includes(lowerQuery) ||
              (user.condoData?.name || '').toLowerCase().includes(lowerQuery) ||
              (user.condoData?.cnpj || '').toLowerCase().includes(lowerQuery) ||
              (user.email || '').toLowerCase().includes(lowerQuery) ||
              (user.address || '').toLowerCase().includes(lowerQuery)
            );
          case 'driver':
            return (
              (user.name || '').toLowerCase().includes(lowerQuery) ||
              (user.personalData?.name || '').toLowerCase().includes(lowerQuery) ||
              (user.vehicleData?.plate || '').toLowerCase().includes(lowerQuery) ||
              (user.email || '').toLowerCase().includes(lowerQuery)
            );
          default:
            return (
              (user.name || '').toLowerCase().includes(lowerQuery) ||
              (user.email || '').toLowerCase().includes(lowerQuery)
            );
        }
      });
    }
    
    // Filtrar por status se não for o mesmo da consulta principal
    if (filter !== 'all' && filter !== status) {
      result = result.filter(user => user.status === filter);
    }
    
    setFilteredUsers(result);
  };
  
  // Buscar usuários
  const handleSearch = (query) => {
    setSearchQuery(query);
    filterUsers(users, query, activeFilter);
  };
  
  // Aplicar filtro de status
  const handleFilterChange = (filter) => {
    setActiveFilter(filter);
    filterUsers(users, searchQuery, filter);
  };
  
  // Atualizar lista
  const handleRefresh = () => {
    setRefreshing(true);
    loadUsers();
  };
  
  // Navegar para detalhes do usuário
  const navigateToUserDetails = (user) => {
    navigation.navigate('AdminUserDetails', {
      userId: user.id,
      userType: getUserType(user),
      userName: getUserDisplayName(user)
    });
  };
  
  // Navegar para tela de aprovação
  const navigateToApproval = (user) => {
    navigation.navigate('AdminApproval', {
      userId: user.id,
      userType: getUserType(user),
      userName: getUserDisplayName(user)
    });
  };
  
  // Obter tipo de usuário
  const getUserType = (user) => {
    // Se a rota especificar o tipo, usar ele
    if (userType) return userType;
    
    // Caso contrário, tentar obter do usuário
    return user.type || 'unknown';
  };
  
  // Obter nome de exibição do usuário
  const getUserDisplayName = (user) => {
    const type = getUserType(user);
    
    switch (type) {
      case 'resident':
        return user.name || 
               user.personalData?.name || 
               user.displayName || 
               'Morador sem nome';
      case 'driver':
        return user.name || 
               user.personalData?.name || 
               user.displayName || 
               'Motorista sem nome';
      case 'condo':
        return user.name || 
               user.condoData?.name || 
               user.displayName || 
               'Condomínio sem nome';
      default:
        return user.displayName || user.email || 'Usuário sem nome';
    }
  };
  
  // Obter avatar do usuário
  const getUserAvatar = (user) => {
    // Verificar se há foto de perfil
    const profilePhoto = user.documents?.profilePhoto?.[0]?.thumbnailUrl || 
                         user.documents?.condoLogo?.[0]?.thumbnailUrl || 
                         null;
                         
    return profilePhoto;
  };
  
  // Renderizar item da lista de usuários
  const renderUserItem = ({ item }) => {
    const userName = getUserDisplayName(item);
    const userType = getUserType(item);
    const userStatus = item.status || 'pending_verification';
    const userAvatar = getUserAvatar(item);
    
    return (
      <Surface style={styles.userCard}>
        <TouchableOpacity 
          style={styles.userCardInner}
          onPress={() => navigateToUserDetails(item)}
        >
          <View style={styles.userAvatar}>
            {userAvatar ? (
              <Avatar.Image size={60} source={{ uri: userAvatar }} />
            ) : (
              <Avatar.Icon 
                size={60} 
                icon={getUserTypeIcon(userType)}
                style={{ backgroundColor: getUserTypeColor(userType) + '30' }}
                color={getUserTypeColor(userType)}
              />
            )}
          </View>
          
          <View style={styles.userInfo}>
            <View style={styles.userHeader}>
              <Text style={styles.userName} numberOfLines={1}>
                {userName}
              </Text>
              <View style={[
                styles.statusBadge, 
                { backgroundColor: getStatusColor(userStatus) + '20' }
              ]}>
                <Text style={[
                  styles.statusText, 
                  { color: getStatusColor(userStatus) }
                ]}>
                  {getStatusLabel(userStatus)}
                </Text>
              </View>
            </View>
            
            {userType === 'resident' && (
              <View style={styles.userDetails}>
                <Text style={styles.userDetailsText} numberOfLines={1}>
                  Unidade: {item.residenceData?.unit || 'N/A'} 
                  {item.residenceData?.block ? ` - Bloco ${item.residenceData.block}` : ''}
                </Text>
              </View>
            )}
            
            {userType === 'condo' && (
              <View style={styles.userDetails}>
                <Text style={styles.userDetailsText} numberOfLines={1}>
                  {item.condoData?.address || 'Endereço não informado'}
                </Text>
              </View>
            )}
            
            <Text style={styles.userEmail} numberOfLines={1}>
              {item.email || 'Sem email'}
            </Text>
          </View>
        </TouchableOpacity>
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
  
  // Obter ícone com base no tipo
  const getUserTypeIcon = (type) => {
    switch (type) {
      case 'resident':
        return 'home-account';
      case 'driver':
        return 'car';
      case 'condo':
        return 'office-building';
      default:
        return 'account';
    }
  };
  
  // Obter cor com base no tipo
  const getUserTypeColor = (type) => {
    switch (type) {
      case 'resident':
        return '#2196F3';
      case 'driver':
        return '#FF9800';
      case 'condo':
        return '#4CAF50';
      default:
        return '#9E9E9E';
    }
  };
  
  // Obter label com base no status
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
  
  // Obter cor com base no status
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
  
  // Contar usuários por status
  const countUsersByStatus = () => {
    if (!users.length) return {};
    
    return {
      all: users.length,
      active: users.filter(user => user.status === 'active').length,
      pending: users.filter(user => user.status === 'pending_verification').length,
      rejected: users.filter(user => user.status === 'rejected').length
    };
  };
  
  const counts = countUsersByStatus();
  
  return (
    <View style={styles.container}>
      {/* Barra de pesquisa */}
      <Surface style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar usuários"
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
            count={counts.all}
            active={activeFilter === 'all'}
            onPress={() => handleFilterChange('all')}
          />
          
          <FilterChip
            label="Ativos"
            count={counts.active}
            active={activeFilter === 'active'}
            onPress={() => handleFilterChange('active')}
            color="#4CAF50"
          />
          
          <FilterChip
            label="Pendentes"
            count={counts.pending}
            active={activeFilter === 'pending_verification'}
            onPress={() => handleFilterChange('pending_verification')}
            color="#FF9800"
          />
          
          <FilterChip
            label="Rejeitados"
            count={counts.rejected}
            active={activeFilter === 'rejected'}
            onPress={() => handleFilterChange('rejected')}
            color="#F44336"
          />
        </ScrollView>
      </Surface>
      
      {/* Lista de usuários */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Carregando usuários...</Text>
        </View>
      ) : filteredUsers.length === 0 ? (
        <EmptyState
          icon={getUserTypeIcon(userType) || 'account-group'}
          title="Nenhum usuário encontrado"
          description={
            searchQuery 
              ? 'Tente usar outros termos na busca'
              : 'Não há usuários cadastrados nesta categoria'
          }
          buttonText={searchQuery ? 'Limpar busca' : null}
          onButtonPress={searchQuery ? () => handleSearch('') : null}
        />
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
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
    paddingBottom: 32,
  },
  userCard: {
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  userCardInner: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    marginRight: 12,
  },
  userInfo: {
    flex: 1,
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  userEmail: {
    fontSize: 12,
    color: '#757575',
  },
  userDetails: {
    marginBottom: 4,
  },
  userDetailsText: {
    fontSize: 12,
    color: '#757575',
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  userActions: {
    justifyContent: 'center',
  }
});

export default AdminUsersListScreen;
          
         