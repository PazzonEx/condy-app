import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { Card, Divider, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Hooks e serviços
import { useAuth } from '../../hooks/useAuth';
import AccessService from '../../services/access.service';
import { formatDate } from '../../utils/format';
import Button from '../../components/Button';
import { COLORS, globalStyles } from '../../styles/theme';
const AccessHistoryScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Cores padrão (caso o objeto COLORS não esteja disponível)
const defaultColors = {
  primary: '#1E88E5',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
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
  let current = COLORS || defaultColors;
  
  for (const part of parts) {
    if (current[part] === undefined) {
      return defaultColors[parts[0]] || '#1E88E5';
    }
    current = current[part];
  }
  
  return current;
};
  // Carregar histórico quando a tela ganhar foco
  useFocusEffect(
    React.useCallback(() => {
      loadAccessHistory();
    }, [])
  );

  const loadAccessHistory = async () => {
    if (!userProfile?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Buscar histórico de acesso do residente
      const accessHistory = await AccessService.getResidentAccessHistory(userProfile.id);
      
      console.log(`Carregados ${accessHistory.length} registros de histórico`);
      setHistory(accessHistory);
      
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setError('Não foi possível carregar seu histórico de acesso');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadAccessHistory();
  };

  const handleAccessDetails = (requestId) => {
    navigation.navigate('AccessDetails', { requestId });
  };

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
      case 'pending_resident': return 'Aguardando Aprovação';
      case 'authorized': return 'Autorizado';
      case 'arrived': return 'Na portaria';
      case 'entered': return 'Entrou';
      case 'completed': return 'Concluído';
      case 'denied': return 'Negado';
      case 'denied_by_resident': return 'Negado por você';
      case 'canceled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Carregando histórico...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadAccessHistory}>
          Tentar Novamente
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Histórico de Acessos</Text>
      
      <FlatList
        data={history}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Card style={styles.historyCard}>
            <Card.Content>
              <View style={styles.cardHeader}>
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
                  {formatDate(item.createdAt, { showTime: true, dateFormat: 'dd/MM/yyyy' })}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <Text style={styles.driverName}>{item.driverName || 'Motorista'}</Text>
              <Text style={styles.vehicleInfo}>
                {item.vehicleModel ? `${item.vehicleModel} • ` : ''}
                Placa: {item.vehiclePlate || 'Não informada'}
              </Text>
              
              <TouchableOpacity 
                style={styles.detailsButton}
                onPress={() => handleAccessDetails(item.id)}
              >
                <Text style={styles.detailsButtonText}>Ver Detalhes</Text>
              </TouchableOpacity>
            </Card.Content>
          </Card>
        )}
        contentContainerStyle={styles.listContainer}
        refreshing={refreshing}
        onRefresh={handleRefresh}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="history" size={64} color="#BDBDBD" />
            <Text style={styles.emptyTitle}>Nenhum histórico encontrado</Text>
            <Text style={styles.emptySubtext}>
              Seu histórico de solicitações de acesso aparecerá aqui
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  historyCard: {
    marginBottom: 12,
    borderRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
  },
  divider: {
    marginVertical: 8,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  vehicleInfo: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  detailsButton: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  detailsButtonText: {
    color: '#1E88E5',
    fontWeight: 'bold',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    textAlign: 'center',
    color: '#757575',
  },
  listContainer: {
    flexGrow: 1,
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
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
});

export default AccessHistoryScreen;