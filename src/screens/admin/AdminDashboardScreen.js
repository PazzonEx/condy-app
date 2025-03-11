// src/screens/admin/AdminDashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl,TouchableOpacity} from 'react-native';
import { 
  Text, 
  Surface, 
  Card, 
  Chip,
  Button, 
  useTheme, 
  ActivityIndicator,
  Title,
  Divider
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import GooglePlacesCondoSearch from '../../components/GooglePlacesCondoSearch';
// Serviços
import FirestoreService from '../../services/firestore.service';

// Hooks
import { useAuth } from '../../hooks/useAuth';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    userStats: {
      total: 0,
      active: 0,
      pending: 0,
      rejected: 0
    },
    usersByType: {
      resident: 0,
      driver: 0,
      condo: 0
    },
    recentActivity: [],
    pendingApprovals: []
  });
  
  // Carregar estatísticas
  useEffect(() => {
    loadStats();
  }, []);
  // Adicionar ao useEffect principal:
useEffect(() => {
  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar estatísticas gerais
      const userStats = await getUserStats();
      const usersByType = await getUsersByType();
      const pendingApprovals = await getPendingApprovals();
      const residentsByCondos = await getResidentsByCondos(); // Nova função
      
      setStats({
        userStats,
        usersByType,
        pendingApprovals,
        residentsByCondos // Novo campo
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  loadData();
}, []);

  
  // Função para carregar estatísticas
  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Buscar estatísticas gerais de usuários
      const userStats = await getUserStats();
      
      // Buscar estatísticas por tipo de usuário
      const usersByType = await getUsersByType();
      
      // Buscar atividades recentes
      const recentActivity = await getRecentActivity();
      
      // Buscar aprovações pendentes
      const pendingApprovals = await getPendingApprovals();
      
      // Atualizar estado
      setStats({
        userStats,
        usersByType,
        recentActivity,
        pendingApprovals
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
 // Modificar a função getUserStats
const getUserStats = async () => {
  try {
    // Buscar usuários ativos e válidos
    const users = await FirestoreService.queryDocuments('users', [
      { field: 'type', operator: 'in', value: ['resident', 'driver', 'condo'] }
    ]);
    
    // Filtrar usuários reais (remover registros de teste ou inválidos)
    const validUsers = users.filter(user => 
      user.email && 
      user.type && 
      user.createdAt // Garantir que tenha data de criação
    );
    
    // Contadores
    const total = validUsers.length;
    const active = validUsers.filter(user => user.status === 'active').length;
    const pending = validUsers.filter(user => user.status === 'pending_verification').length;
    const rejected = validUsers.filter(user => user.status === 'rejected').length;
    
    return { total, active, pending, rejected };
  } catch (error) {
    console.error('Erro ao obter estatísticas de usuários:', error);
    return { total: 0, active: 0, pending: 0, rejected: 0 };
  }
};
// Adicionar componente para exibir moradores por condomínio
const CondoResidentsCard = ({ condos }) => {
  const navigation = useNavigation();
  
  // Calcular total de residentes
  const totalResidents = condos.reduce((sum, condo) => sum + condo.residentCount, 0);

  // Verificação de condos vazio
  if (!condos || condos.length === 0) {
    return (
      <Surface style={styles.condoResidentsCard}>
        <Text style={styles.sectionTitle}>Moradores por Condomínio</Text>
        <Divider style={styles.divider} />
        
        <GooglePlacesCondoSearch 
          onSelectCondo={(selectedCondo) => {
            // Navegar para lista de moradores do condomínio selecionado
            navigation.navigate('CondosTab', {
              screen: 'AdminUsersList',
              params: {
                userType: 'resident',
                condoId: selectedCondo.id,
                title: `Moradores - ${selectedCondo.name.substring(0, 15)}${selectedCondo.name.length > 15 ? '...' : ''}`
              }
            });
          }}
          style={{ marginBottom: 16 }}
          initialValue=""
          insideScrollView={true}
        />

        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="home-city" size={48} color="#BDBDBD" />
          <Text style={styles.emptyText}>Nenhum condomínio com moradores encontrado</Text>
        </View>
      </Surface>
    );
  }

  // Renderização quando há condomínios
  return (
    <Surface style={styles.condoResidentsCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Moradores por Condomínio</Text>
        <Chip style={styles.totalChip}>
          {totalResidents} total
        </Chip>
      </View>
      <Divider style={styles.divider} />
      
      <GooglePlacesCondoSearch 
        onSelectCondo={(selectedCondo) => {
          // Navegar para lista de moradores do condomínio selecionado
          navigation.navigate('CondosTab', {
            screen: 'AdminUsersList',
            params: {
              userType: 'resident',
              condoId: selectedCondo.id,
              title: `Moradores - ${selectedCondo.name.substring(0, 15)}${selectedCondo.name.length > 15 ? '...' : ''}`
            }
          });
        }}
        style={{ marginBottom: 16 }}
        initialValue=""
        insideScrollView={true}
      />

      {condos.map((condo) => (
        <TouchableOpacity 
          key={condo.id} 
          style={styles.condoItem}
          onPress={() => {
            navigation.navigate('CondosTab', {
              screen: 'AdminUsersList',
              params: {
                condoId: condo.id,
                userType: 'resident',
                title: `Moradores - ${condo.name.substring(0, 15)}${condo.name.length > 15 ? '...' : ''}`
              }
            });
          }}
        >
          <View style={styles.condoInfo}>
            <Text style={styles.condoName} numberOfLines={1}>{condo.name}</Text>
            <Text style={styles.condoAddress} numberOfLines={1}>{condo.address}</Text>
          </View>
          <View style={styles.condoStats}>
            <Text style={[
              styles.residentCount, 
              {color: condo.residentCount > 0 ? '#2196F3' : '#9E9E9E'}
            ]}>
              {condo.residentCount}
            </Text>
            <Text style={styles.residentLabel}>
              {condo.residentCount === 1 ? 'morador' : 'moradores'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
        </TouchableOpacity>
      ))}
      
      <Button 
        mode="outlined" 
        style={styles.viewAllButton}
        onPress={() => {
          navigation.navigate('CondosTab', {
            screen: 'AdminUsersList',
            params: {
              userType: 'resident',
              title: 'Todos os Moradores'
            }
          });
        }}
      >
        Ver Todos os Moradores
      </Button>
    </Surface>
  );
};

// Adicionar uma nova função para obter moradores por condomínio
// Em src/screens/admin/AdminDashboardScreen.js

const getResidentsByCondos = async () => {
  try {
    // Buscar todos os condomínios ativos
    const condos = await FirestoreService.getCollection('condos');
    
    // Filtrar apenas condomínios com dados válidos
    const activeCondos = condos.filter(condo => 
      condo.name || condo.condoData?.name || condo.displayName
    );
    
    // Buscar todos os moradores
    const allResidents = await FirestoreService.getCollection('residents');
    
    // Para cada condomínio, contar seus moradores
    const condoWithResidents = activeCondos.map(condo => {
      // Filtrar moradores que pertencem a este condomínio
      // Importante: verificar a propriedade residenceData.condoId
      const condoResidents = allResidents.filter(resident => 
        resident.residenceData?.condoId === condo.id
      );
      
      console.log(`Condomínio: ${condo.name || condo.condoData?.name || 'Sem nome'}, ID: ${condo.id}, Moradores: ${condoResidents.length}`);
      
      return {
        id: condo.id,
        name: condo.name || condo.condoData?.name || condo.displayName || 'Condomínio sem nome',
        residentCount: condoResidents.length,
        address: condo.address || condo.addressData?.fullAddress || 'Endereço não disponível'
      };
    });
    
    // Ordenar por número de moradores (decrescente)
    return condoWithResidents.sort((a, b) => b.residentCount - a.residentCount);
  } catch (error) {
    console.error('Erro ao obter moradores por condomínio:', error);
    return [];
  }
};

  
  // Estatísticas por tipo de usuário
  const getUsersByType = async () => {
    // Buscar todos os usuários
    const users = await FirestoreService.getCollection('users');
    
    // Contadores por tipo
    const resident = users.filter(user => user.type === 'resident').length;
    const driver = users.filter(user => user.type === 'driver').length;
    const condo = users.filter(user => user.type === 'condo').length;
    
    return { resident, driver, condo };
  };
  
  // Buscar atividades recentes
  const getRecentActivity = async () => {
    // Aqui poderíamos buscar os últimos logins, cadastros, etc.
    // Por enquanto, retornamos um array vazio
    return [];
  };
  
  // Buscar aprovações pendentes
  const getPendingApprovals = async () => {
    const pendingUsers = [];
    
    // Residentes pendentes
    const pendingResidents = await FirestoreService.queryDocuments('residents', [
      { field: 'status', operator: '==', value: 'pending_verification' }
    ], { field: 'createdAt', direction: 'desc' }, 5);
    
    pendingResidents.forEach(user => {
      pendingUsers.push({
        ...user,
        type: 'resident'
      });
    });
    
    // Motoristas pendentes
    const pendingDrivers = await FirestoreService.queryDocuments('drivers', [
      { field: 'status', operator: '==', value: 'pending_verification' }
    ], { field: 'createdAt', direction: 'desc' }, 5);
    
    pendingDrivers.forEach(user => {
      pendingUsers.push({
        ...user,
        type: 'driver'
      });
    });
    
    // Condomínios pendentes
    const pendingCondos = await FirestoreService.queryDocuments('condos', [
      { field: 'status', operator: '==', value: 'pending_verification' }
    ], { field: 'createdAt', direction: 'desc' }, 5);
    
    pendingCondos.forEach(user => {
      pendingUsers.push({
        ...user,
        type: 'condo'
      });
    });
    
    // Ordenar por data de criação (mais recentes primeiro)
    return pendingUsers.sort((a, b) => {
      if (!a.createdAt || !b.createdAt) return 0;
      const dateA = a.createdAt.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dateB = b.createdAt.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dateB - dateA;
    }).slice(0, 5); // Limitar a 5 itens
  };
  
  // Função para puxar para atualizar
  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
  };
  
  // Navegar para tela de aprovação
  
const navigateToApproval = (user) => {
  // Determinar em qual tab está a tela de aprovação baseado no tipo de usuário
  let tabName;
  if (user.type === 'condo') {
    tabName = 'CondosTab';
  } else if (user.type === 'driver') {
    tabName = 'DriversTab';
  } else {
    // Para residentes ou tipos desconhecidos, usar tab de Condomínios por padrão
    tabName = 'CondosTab';
  }

  // Navegar usando o caminho completo com a navegação aninhada
  navigation.navigate(tabName, {
    screen: 'AdminApproval',
    params: {
      userId: user.id,
      userType: user.type,
      userName: user.name || user.displayName || 'Usuário'
    }
  });
};
  
  // Navegar para lista de usuários
  const navigateToUsersList = (type, status) => {
    const title = getTypeTitle(type);
    
    // Usar navegação aninhada corretamente
    if (type === 'condo') {
      navigation.navigate('CondosTab', {
        screen: 'AdminUsersList',
        params: {
          userType: type,
          status: status,
          title: status ? `${title} ${getStatusTitle(status)}` : title
        }
      });
    } else if (type === 'driver') {
      navigation.navigate('DriversTab', {
        screen: 'AdminUsersList',
        params: {
          userType: type,
          status: status,
          title: status ? `${title} ${getStatusTitle(status)}` : title
        }
      });
    } else {
      // Para outros tipos ou quando status é mais importante que tipo
      const targetTab = type === 'resident' ? 'CondosTab' : 'DriversTab';
      navigation.navigate(targetTab, {
        screen: 'AdminUsersList',
        params: {
          userType: type,
          status: status,
          title: status ? (type ? `${title} ${getStatusTitle(status)}` : getStatusTitle(status)) : (type ? title : 'Todos os Usuários')
        }
      });
    }
  };
  
  // Título baseado no tipo
  const getTypeTitle = (type) => {
    switch (type) {
      case 'resident':
        return 'Moradores';
      case 'driver':
        return 'Motoristas';
      case 'condo':
        return 'Condomínios';
      default:
        return 'Usuários';
    }
  };
  
  // Título baseado no status
  const getStatusTitle = (status) => {
    switch (status) {
      case 'active':
        return 'Ativos';
      case 'pending_verification':
        return 'Pendentes';
      case 'rejected':
        return 'Rejeitados';
      default:
        return '';
    }
  };
  
  // Dados para os gráficos
  const getPieChartData = () => {
    const { resident, driver, condo } = stats.usersByType;
    
    return [
      {
        name: 'Moradores',
        population: resident,
        color: '#2196F3',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Motoristas',
        population: driver,
        color: '#FF9800',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      },
      {
        name: 'Condomínios',
        population: condo,
        color: '#4CAF50',
        legendFontColor: '#7F7F7F',
        legendFontSize: 12
      }
    ];
  };
  
  const getLineChartData = () => {
    // Dados fictícios - em um app real, buscaríamos dados históricos
    return {
      labels: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'],
      datasets: [
        {
          data: [20, 45, 78, 100, 143, 162],
          color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ['Usuários Ativos']
    };
  };
  
  // Contagem de aprovações pendentes
  const getPendingCount = () => {
    return stats.userStats.pending;
  };
  
  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
      </View>
    );
  }  
  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl 
          refreshing={refreshing} 
          onRefresh={onRefresh} 
          colors={[theme.colors.primary]}
        />
      }
    >
      {/* Cabeçalho */}
      <Surface style={styles.headerCard}>
        <Title style={styles.headerTitle}>Dashboard do Admin</Title>
        <Text style={styles.headerSubtitle}>Visão geral do sistema</Text>
      </Surface>
      
      {/* Estatísticas Resumidas */}
      <View style={styles.statsGrid}>
        <Surface style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#E3F2FD' }]}>
            <MaterialCommunityIcons name="account-group" size={24} color="#2196F3" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{stats.userStats.total}</Text>
            <Text style={styles.statLabel}>Total de Usuários</Text>
          </View>
        </Surface>
        
        <Surface style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#E8F5E9' }]}>
            <MaterialCommunityIcons name="check-circle" size={24} color="#4CAF50" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{stats.userStats.active}</Text>
            <Text style={styles.statLabel}>Usuários Ativos</Text>
          </View>
        </Surface>
        
        <Surface style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FFF3E0' }]}>
            <MaterialCommunityIcons name="clock" size={24} color="#FF9800" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{stats.userStats.pending}</Text>
            <Text style={styles.statLabel}>Pendentes</Text>
          </View>
        </Surface>
        
        <Surface style={styles.statCard}>
          <View style={[styles.statIconContainer, { backgroundColor: '#FFEBEE' }]}>
            <MaterialCommunityIcons name="close-circle" size={24} color="#F44336" />
          </View>
          <View style={styles.statContent}>
            <Text style={styles.statNumber}>{stats.userStats.rejected}</Text>
            <Text style={styles.statLabel}>Rejeitados</Text>
          </View>
        </Surface>
      </View>
      
      {/* Gráficos */}
      <Surface style={styles.chartCard}>
        <Text style={styles.chartTitle}>Distribuição de Usuários</Text>
        <PieChart
          data={getPieChartData()}
          width={width - 64}
          height={180}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="15"
          absolute
        />
      </Surface>
      
      {/* Gráfico de crescimento */}
      <Surface style={styles.chartCard}>
        <Text style={styles.chartTitle}>Crescimento Mensal</Text>
        <LineChart
          data={getLineChartData()}
          width={width - 64}
          height={220}
          chartConfig={{
            backgroundColor: '#ffffff',
            backgroundGradientFrom: '#ffffff',
            backgroundGradientTo: '#ffffff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',
              strokeWidth: '2',
              stroke: '#2196F3'
            }
          }}
          bezier
          style={{
            marginVertical: 8,
            borderRadius: 16
          }}
        />
      </Surface>
      
      {/* Aprovações Pendentes */}
      <Surface style={styles.pendingApprovalsCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Aprovações Pendentes</Text>
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{getPendingCount()}</Text>
          </View>
        </View>
        <Divider style={styles.divider} />
        
        {stats.pendingApprovals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="check-circle" size={48} color="#4CAF50" />
            <Text style={styles.emptyText}>Não há aprovações pendentes</Text>
          </View>
        ) : (
          stats.pendingApprovals.map((user, index) => (
            <Card key={user.id || index} style={styles.userCard} onPress={() => navigateToApproval(user)}>
              <Card.Content style={styles.userCardContent}>
                <View style={styles.userInfo}>
                  <View style={[styles.userTypeIndicator, { backgroundColor: getUserTypeColor(user.type) }]}>
                    <MaterialCommunityIcons name={getUserTypeIcon(user.type)} size={16} color="#FFFFFF" />
                  </View>
                  <View>
                    <Text style={styles.userName}>{user.name || user.displayName || 'Usuário sem nome'}</Text>
                    <Text style={styles.userMeta}>{getUserTypeLabel(user.type)} • {getTimeAgo(user.createdAt)}</Text>
                  </View>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#BDBDBD" />
              </Card.Content>
            </Card>
          ))
        )}
        
        {stats.pendingApprovals.length > 0 && (
          <Button
            mode="outlined"
            onPress={() => navigateToUsersList(null, 'pending_verification')}
            style={styles.viewAllButton}
          >
            Ver Todos
          </Button>
        )}
      </Surface>
      <CondoResidentsCard condos={stats.residentsByCondos || []} />
      
      {/* Links Rápidos */}
      <Surface style={styles.quickLinksCard}>
        <Text style={styles.sectionTitle}>Links Rápidos</Text>
        <Divider style={styles.divider} />
        
        <View style={styles.quickLinksGrid}>
          <TouchableCard
            icon="home-group"
            title="Condomínios"
            color="#2196F3"
            count={stats.usersByType.condo}
            onPress={() => navigateToUsersList('condo')}
          />
          
          <TouchableCard
            icon="account-group"
            title="Moradores"
            color="#9C27B0"
            count={stats.usersByType.resident}
            onPress={() => navigateToUsersList('resident')}
          />
          
          <TouchableCard
            icon="car"
            title="Motoristas"
            color="#FF9800"
            count={stats.usersByType.driver}
            onPress={() => navigateToUsersList('driver')}
          />
          
          <TouchableCard
            icon="account-check"
            title="Aprovações"
            color="#4CAF50"
            count={getPendingCount()}
            onPress={() => navigateToUsersList(null, 'pending_verification')}
          />
        </View>
      </Surface>
    </ScrollView>
  );
};

// Componente de card tocável
const TouchableCard = ({ icon, title, color, count, onPress }) => {
  return (
    <TouchableOpacity style={styles.quickLinkCard} onPress={onPress}>
      <View style={[styles.quickLinkIconContainer, { backgroundColor: `${color}20` }]}>
        <MaterialCommunityIcons name={icon} size={24} color={color} />
      </View>
      <Text style={styles.quickLinkTitle}>{title}</Text>
      {count !== undefined && (
        <View style={[styles.quickLinkCount, { backgroundColor: color }]}>
          <Text style={styles.quickLinkCountText}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// Funções auxiliares
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

const getUserTypeLabel = (type) => {
  switch (type) {
    case 'resident':
      return 'Morador';
    case 'driver':
      return 'Motorista';
    case 'condo':
      return 'Condomínio';
    default:
      return 'Usuário';
  }
};

const getTimeAgo = (timestamp) => {
  if (!timestamp) return 'Data desconhecida';
  
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  
  if (diffDay > 0) {
    return `${diffDay} dia${diffDay > 1 ? 's' : ''} atrás`;
  } else if (diffHour > 0) {
    return `${diffHour} hora${diffHour > 1 ? 's' : ''} atrás`;
  } else if (diffMin > 0) {
    return `${diffMin} minuto${diffMin > 1 ? 's' : ''} atrás`;
  } else {
    return 'Agora mesmo';
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
  },
  headerCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  condoResidentsCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  condoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  condoInfo: {
    flex: 1,
  },
  condoName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  condoAddress: {
    fontSize: 12,
    color: '#757575',
  },
  condoStats: {
    alignItems: 'center',
    marginRight: 12,
  },
  residentCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  residentLabel: {
    fontSize: 12,
    color: '#757575',
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
  },
  chartCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  pendingApprovalsCard: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  badgeContainer: {
    backgroundColor: '#FF9800',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
  },
  userCard: {
    marginBottom: 8,
    elevation: 1,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userTypeIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userName: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  userMeta: {
    fontSize: 12,
    color: '#757575',
  },
  viewAllButton: {
    marginTop: 8,
  },
  quickLinksCard: {
    padding: 16,
    borderRadius: 8,
  },
  quickLinksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickLinkCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 1,
    alignItems: 'center',
    position: 'relative',
  },
  quickLinkIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickLinkTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  quickLinkCount: {
    position: 'absolute',
    top: 8,
    right: 8,
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  quickLinkCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  }
});

export default AdminDashboardScreen;