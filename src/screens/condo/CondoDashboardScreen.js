// src/screens/condo/CondoDashboardScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Dimensions ,Alert} from 'react-native';
import { Text, Card, useTheme, ActivityIndicator, Divider, Title } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import { auth } from '../../config/firebase'; // Adicionar importação do auth


// Hooks
import { useAuth } from '../../hooks/useAuth';

// Serviços
import AnalyticsService from '../../services/analytics.service';

// Componentes
import Button from '../../components/Button';

const CondoDashboardScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const screenWidth = Dimensions.get('window').width - 32;

  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (!auth.currentUser) {
      setError('Você precisa estar autenticado para acessar esta tela');
      setLoading(false);
      return;
    }
    
    loadStats();
  }, []);

  // Carregar estatísticas
  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar se há um usuário autenticado
      if (!auth.currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Obter estatísticas usando o ID do usuário atual
      const quickStats = await AnalyticsService.getQuickStats(auth.currentUser.uid);
      setStats(quickStats);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setError('Não foi possível carregar as estatísticas. Tente novamente mais tarde.');
      
      // Verificar especificamente se é um erro de autenticação
      if (error.message.includes('autenticado')) {
        Alert.alert(
          'Erro de Autenticação',
          'Você precisa estar logado para acessar esta tela. Tente fazer login novamente.',
          [
            { 
              text: 'OK', 
              onPress: () => navigation.navigate('Auth')
            }
          ]
        );
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando estatísticas...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <Button 
          mode="contained" 
          onPress={loadStats} 
          style={styles.retryButton}
        >
          Tentar Novamente
        </Button>
        <Button 
          mode="outlined" 
          onPress={() => navigation.goBack()} 
          style={styles.backButton}
        >
          Voltar
        </Button>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="clipboard-text-off" size={48} color="#757575" />
        <Text style={styles.errorText}>Nenhuma estatística disponível.</Text>
      </View>
    );
  }

  // Prepara dados para os gráficos
  const lineChartData = {
    labels: stats.lastSevenDays.map(day => day.date.substring(5)), // Mostra apenas mês e dia (MM-DD)
    datasets: [
      {
        data: stats.lastSevenDays.map(day => day.count),
        color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
        strokeWidth: 2
      }
    ],
    legend: ['Solicitações nos últimos 7 dias']
  };

  const pieChartData = [
    {
      name: 'Aprovado',
      count: stats.byStatus.authorized + stats.byStatus.entered + stats.byStatus.completed,
      color: '#4CAF50',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Negado',
      count: stats.byStatus.denied,
      color: '#F44336',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Pendente',
      count: stats.byStatus.pending,
      color: '#FFC107',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    },
    {
      name: 'Cancelado',
      count: stats.byStatus.canceled,
      color: '#9E9E9E',
      legendFontColor: '#7F7F7F',
      legendFontSize: 12
    }
  ];

  const barChartData = {
    labels: ['Manhã', 'Tarde', 'Noite', 'Madrugada'],
    datasets: [
      {
        data: [
          stats.byTimeOfDay.morning,
          stats.byTimeOfDay.afternoon,
          stats.byTimeOfDay.evening,
          stats.byTimeOfDay.night
        ]
      }
    ]
  };

  const chartConfig = {
    backgroundGradientFrom: '#FFFFFF',
    backgroundGradientTo: '#FFFFFF',
    color: (opacity = 1) => `rgba(30, 136, 229, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    decimalPlaces: 0
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Text style={styles.headerSubtitle}>
          Estatísticas do último mês
        </Text>
      </View>
      
      {/* Cartões de estatísticas rápidas */}
      <View style={styles.statsCards}>
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Total de Solicitações</Text>
            <Text style={styles.statValue}>{stats.totalRequests}</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Taxa de Aprovação</Text>
            <Text style={styles.statValue}>{stats.approvalRate}%</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Taxa de Negação</Text>
            <Text style={styles.statValue}>{stats.denialRate}%</Text>
          </Card.Content>
        </Card>
        
        <Card style={styles.statsCard}>
          <Card.Content>
            <Text style={styles.statLabel}>Pendentes</Text>
            <Text style={styles.statValue}>{stats.byStatus.pending}</Text>
          </Card.Content>
        </Card>
      </View>
      
      {/* Gráfico de linha - tendência dos últimos 7 dias */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Solicitações Diárias</Title>
          <LineChart
            data={lineChartData}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            bezier
            style={styles.chart}
          />
        </Card.Content>
      </Card>
      
      {/* Gráfico de pizza - distribuição por status */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Distribuição por Status</Title>
          <PieChart
            data={pieChartData}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            accessor={'count'}
            backgroundColor={'transparent'}
            paddingLeft={'15'}
            center={[10, 0]}
            absolute
          />
        </Card.Content>
      </Card>
      
      {/* Gráfico de barras - distribuição por período do dia */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Distribuição por Período</Title>
          <BarChart
            data={barChartData}
            width={screenWidth}
            height={220}
            chartConfig={chartConfig}
            style={styles.chart}
            verticalLabelRotation={0}
          />
        </Card.Content>
      </Card>
      
      {/* Top motoristas e unidades */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Title style={styles.chartTitle}>Top Motoristas</Title>
          
          {stats.topDrivers.length > 0 ? (
            stats.topDrivers.map((driver, index) => (
              <View key={index} style={styles.rankingItem}>
                <Text style={styles.rankingNumber}>{index + 1}</Text>
                <Text style={styles.rankingName}>{driver.name}</Text>
                <Text style={styles.rankingCount}>{driver.count}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyListText}>Nenhum motorista registrado</Text>
          )}
          
          <Divider style={styles.divider} />
          
          <Title style={styles.chartTitle}>Top Unidades</Title>
          
          {stats.topUnits.length > 0 ? (
            stats.topUnits.map((unit, index) => (
              <View key={index} style={styles.rankingItem}>
                <Text style={styles.rankingNumber}>{index + 1}</Text>
                <Text style={styles.rankingName}>Unidade {unit.unit}</Text>
                <Text style={styles.rankingCount}>{unit.count}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyListText}>Nenhuma unidade registrada</Text>
          )}
        </Card.Content>
      </Card>
      <Button
            mode="contained"
            icon="file-chart"
            onPress={() => navigation.navigate('CondoReport')}
            style={styles.reportButton}
            >
            Gerar Relatório Detalhado
            </Button>   
      
      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#757575',
  },
  reportButton: {
    margin: 16,
    marginBottom: 8,
  },
  statsCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  statsCard: {
    width: '48%',
    margin: '1%',
    borderRadius: 8,
  },
  statLabel: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  chartCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  chartTitle: {
    fontSize: 18,
    marginBottom: 16,
  },
  chart: {
    borderRadius: 8,
    marginVertical: 8,
  },
  rankingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  rankingNumber: {
    width: 30,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#757575',
  },retryButton: {
    marginTop: 20,
    marginBottom: 10,
  },
  backButton: {
    marginBottom: 20,
  },
  rankingName: {
    flex: 1,
    fontSize: 16,
  },
  rankingCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 16,
  },
  emptyListText: {
    textAlign: 'center',
    color: '#757575',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
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
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  spacer: {
    height: 40,
  },
});

export default CondoDashboardScreen;