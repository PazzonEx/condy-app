// src/screens/condo/CondoReportScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView , Alert} from 'react-native';
import { Text, Card, useTheme, ActivityIndicator, Divider, Title, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../../config/firebase'; // Adicionar importação do auth

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Serviços
import AnalyticsService from '../../services/analytics.service';

// Componentes personalizados
import CustomButton from '../../components/Button'; // Se você tiver um componente Button personalizado


const CondoReportScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState(new Date());
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

 // Função para gerar relatório
 const generateReport = async () => {
  try {
    setLoading(true);
    setError(null);
    
    // Verificar se há um usuário autenticado
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Obter relatório usando o ID do usuário atual
    const reportData = await AnalyticsService.generateAccessReport(
      currentUser.uid,
      startDate,
      endDate
    );
    
    setReport(reportData);
  } catch (error) {
    console.error('Erro ao gerar relatório:', error);
    setError('Não foi possível gerar o relatório. Tente novamente mais tarde.');
    
    // Verificar se é um erro de autenticação
    if (error.message.includes('autenticado')) {
      Alert.alert(
        'Erro de Autenticação',
        'Você precisa estar logado para gerar relatórios. Tente fazer login novamente.',
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

  // Manipuladores para datepickers
  const onStartDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || startDate;
    setShowStartPicker(false);
    setStartDate(currentDate);
  };

  const onEndDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || endDate;
    setShowEndPicker(false);
    setEndDate(currentDate);
  };
  // Função para verificar autenticação e tentar novamente
  const handleRetry = () => {
    // Verificar se o usuário está autenticado
    if (!auth.currentUser) {
      Alert.alert(
        'Erro de Autenticação',
        'Você precisa estar logado para acessar esta tela. Tente fazer login novamente.',
        [
          { 
            text: 'Fazer Login', 
            onPress: () => navigation.navigate('Auth')
          },
          {
            text: 'Cancelar',
            style: 'cancel'
          }
        ]
      );
      return;
    }
    
    // Se estiver autenticado, tentar gerar o relatório novamente
    generateReport();
  };

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Title style={styles.title}>Relatório de Acessos</Title>
          
          <Text style={styles.label}>Período de análise</Text>
          
          <View style={styles.datePickersContainer}>
            <View style={styles.datePickerWrapper}>
              <Text style={styles.datePickerLabel}>Data Inicial</Text>
              <Button
                mode="outlined"
                onPress={() => setShowStartPicker(true)}
                style={styles.datePickerButton}
              >
                {startDate.toLocaleDateString()}
              </Button>
              {showStartPicker && (
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display="default"
                  onChange={onStartDateChange}
                  maximumDate={new Date()}
                />
              )}
            </View>
            
            <View style={styles.datePickerWrapper}>
              <Text style={styles.datePickerLabel}>Data Final</Text>
              <Button
                mode="outlined"
                onPress={() => setShowEndPicker(true)}
                style={styles.datePickerButton}
              >
                {endDate.toLocaleDateString()}
              </Button>
              {showEndPicker && (
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display="default"
                  onChange={onEndDateChange}
                  minimumDate={startDate}
                  maximumDate={new Date()}
                />
              )}
            </View>
          </View>
          
          <Button
            mode="contained"
            onPress={generateReport}
            loading={loading}
            disabled={loading}
            style={styles.generateButton}
          >
            Gerar Relatório
          </Button>
        </Card.Content>
      </Card>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Gerando relatório...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={36} color={theme.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <Button
            mode="contained"
            onPress={handleRetry}
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
      )}
      
      {report && !loading && (
        <View style={styles.reportContainer}>
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Visão Geral</Title>
              
              <View style={styles.statsGrid}>
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{report.totalRequests}</Text>
                  <Text style={styles.statLabel}>Total de Solicitações</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{report.byStatus.authorized}</Text>
                  <Text style={styles.statLabel}>Autorizadas</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{report.byStatus.denied}</Text>
                  <Text style={styles.statLabel}>Negadas</Text>
                </View>
                
                <View style={styles.statItem}>
                  <Text style={styles.statValue}>{report.byStatus.completed}</Text>
                  <Text style={styles.statLabel}>Concluídas</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Distribuição por Período</Title>
              
              <View style={styles.periodGrid}>
                <View style={styles.periodItem}>
                  <MaterialCommunityIcons name="weather-sunset-up" size={24} color="#FFC107" />
                  <Text style={styles.periodValue}>{report.byTimeOfDay.morning}</Text>
                  <Text style={styles.periodLabel}>Manhã (6-12h)</Text>
                </View>
                
                <View style={styles.periodItem}>
                  <MaterialCommunityIcons name="weather-sunny" size={24} color="#FF9800" />
                  <Text style={styles.periodValue}>{report.byTimeOfDay.afternoon}</Text>
                  <Text style={styles.periodLabel}>Tarde (12-18h)</Text>
                </View>
                
                <View style={styles.periodItem}>
                  <MaterialCommunityIcons name="weather-sunset" size={24} color="#F44336" />
                  <Text style={styles.periodValue}>{report.byTimeOfDay.evening}</Text>
                  <Text style={styles.periodLabel}>Noite (18-22h)</Text>
                </View>
                
                <View style={styles.periodItem}>
                  <MaterialCommunityIcons name="weather-night" size={24} color="#3F51B5" />
                  <Text style={styles.periodValue}>{report.byTimeOfDay.night}</Text>
                  <Text style={styles.periodLabel}>Madrugada (22-6h)</Text>
                </View>
              </View>
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Top Motoristas</Title>
              
              {report.topDrivers.length > 0 ? (
                report.topDrivers.map((driver, index) => (
                  <View key={index} style={styles.rankingItem}>
                    <Text style={styles.rankingNumber}>{index + 1}</Text>
                    <Text style={styles.rankingName}>{driver.name}</Text>
                    <Text style={styles.rankingCount}>{driver.count}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyListText}>Nenhum motorista registrado no período</Text>
              )}
            </Card.Content>
          </Card>
          
          <Card style={styles.card}>
            <Card.Content>
              <Title style={styles.title}>Top Unidades</Title>
              
              {report.topUnits.length > 0 ? (
                report.topUnits.map((unit, index) => (
                  <View key={index} style={styles.rankingItem}>
                    <Text style={styles.rankingNumber}>{index + 1}</Text>
                    <Text style={styles.rankingName}>Unidade {unit.unit}</Text>
                    <Text style={styles.rankingCount}>{unit.count}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.emptyListText}>Nenhuma unidade registrada no período</Text>
              )}
            </Card.Content>
          </Card>
          
          <Button
            mode="contained"
            icon="file-export"
            onPress={() => {
              // Exportar relatório (funcionalidade a ser implementada)
              Alert.alert('Exportar', 'Funcionalidade a ser implementada');
            }}
            style={styles.exportButton}
          >
            Exportar Relatório
          </Button>
        </View>
      )}
      
      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 8,
  },
  datePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  datePickerWrapper: {
    width: '48%',
  },
  datePickerLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  datePickerButton: {
    width: '100%',
  },
  generateButton: {
    marginTop: 8,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 8,
    color: '#757575',
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    marginTop: 8,
    color: '#D32F2F',
    textAlign: 'center',
  },
  reportContainer: {
    marginTop: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  periodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  periodItem: {
    width: '48%',
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  periodValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  periodLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
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
  },
  rankingName: {
    flex: 1,
    fontSize: 16,
  }, retryButton: {
    marginTop: 16,
    marginBottom: 8,
  },
  backButton: {
    marginBottom: 16,
  },
  rankingCount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyListText: {
    textAlign: 'center',
    color: '#757575',
    padding: 16,
  },
  exportButton: {
    marginBottom: 16,
  },
  spacer: {
    height: 40,
  },
});

export default CondoReportScreen;