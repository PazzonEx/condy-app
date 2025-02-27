import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Divider, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';

// Serviços
import AccessService from '../../services/access.service';

// Utilitários
import { formatDate, formatVehiclePlate } from '../../utils/format';

const CondoAccessDetailsScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { requestId } = route.params || {};
  const { userProfile } = useAuth();
  
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Status com formatação e cores
  const statusDetails = {
    pending: {
      label: 'Pendente',
      color: theme.colors.accent,
      icon: 'clock-outline',
      description: 'Aguardando aprovação da portaria'
    },
    authorized: {
      label: 'Autorizado',
      color: '#4CAF50',
      icon: 'check-circle-outline',
      description: 'Autorizado pela portaria, aguardando chegada'
    },
    denied: {
      label: 'Negado',
      color: theme.colors.error,
      icon: 'close-circle-outline',
      description: 'Solicitação negada pela portaria'
    },
    arrived: {
      label: 'Na portaria',
      color: '#2196F3',
      icon: 'map-marker',
      description: 'Motorista chegou e está na portaria'
    },
    entered: {
      label: 'Entrou',
      color: '#9C27B0',
      icon: 'login',
      description: 'Motorista entrou no condomínio'
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
  
  // Carregar detalhes da solicitação quando a tela receber foco
  useFocusEffect(
    React.useCallback(() => {
      if (requestId) {
        loadRequestDetails();
      }
    }, [requestId])
  );
  
  // Carregar detalhes da solicitação
  const loadRequestDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const details = await AccessService.getAccessRequestDetails(requestId);
      setRequestDetails(details);
    } catch (error) {
      console.error('Erro ao carregar detalhes da solicitação:', error);
      setError('Não foi possível carregar os detalhes da solicitação');
    } finally {
      setLoading(false);
    }
  };
  
  // Aprovar solicitação
  const handleApproveRequest = () => {
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
              setLoading(true);
              await AccessService.updateAccessRequestStatus(requestId, 'authorized');
              Alert.alert('Sucesso', 'Solicitação aprovada com sucesso');
              // Atualizar detalhes
              loadRequestDetails();
            } catch (error) {
              console.error('Erro ao aprovar solicitação:', error);
              Alert.alert('Erro', 'Não foi possível aprovar a solicitação');
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // Negar solicitação
  const handleDenyRequest = () => {
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
              setLoading(true);
              await AccessService.updateAccessRequestStatus(requestId, 'denied');
              Alert.alert('Sucesso', 'Solicitação negada com sucesso');
              // Atualizar detalhes
              loadRequestDetails();
            } catch (error) {
              console.error('Erro ao negar solicitação:', error);
              Alert.alert('Erro', 'Não foi possível negar a solicitação');
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // Registrar entrada
  const handleEnteredRequest = () => {
    Alert.alert(
      'Registrar Entrada',
      'Tem certeza que deseja registrar a entrada do motorista?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Registrar',
          onPress: async () => {
            try {
              setLoading(true);
              await AccessService.updateAccessRequestStatus(requestId, 'entered');
              Alert.alert('Sucesso', 'Entrada registrada com sucesso');
              // Atualizar detalhes
              loadRequestDetails();
            } catch (error) {
              console.error('Erro ao registrar entrada:', error);
              Alert.alert('Erro', 'Não foi possível registrar a entrada');
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  // Concluir solicitação
  const handleCompleteRequest = () => {
    Alert.alert(
      'Concluir Solicitação',
      'Tem certeza que deseja marcar esta solicitação como concluída?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Concluir',
          onPress: async () => {
            try {
              setLoading(true);
              await AccessService.updateAccessRequestStatus(requestId, 'completed');
              Alert.alert('Sucesso', 'Solicitação concluída com sucesso');
              // Atualizar detalhes
              loadRequestDetails();
            } catch (error) {
              console.error('Erro ao concluir solicitação:', error);
              Alert.alert('Erro', 'Não foi possível concluir a solicitação');
              setLoading(false);
            }
          },
        },
      ]
    );
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando detalhes...</Text>
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
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Voltar
        </Button>
      </View>
    );
  }
  
  if (!requestDetails) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="file-search" size={48} color="#757575" />
        <Text style={styles.errorText}>Solicitação não encontrada</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.button}
        >
          Voltar
        </Button>
      </View>
    );
  }
  
  const status = statusDetails[requestDetails.status] || {
    label: requestDetails.status || 'Desconhecido',
    color: '#757575',
    icon: 'help-circle-outline',
    description: 'Status desconhecido'
  };
  
  const createdAt = formatDate(requestDetails.createdAt, { 
    showTime: true,
    dateFormat: 'dd/MM/yyyy'
  });
  
  const updatedAt = formatDate(requestDetails.updatedAt, { 
    showTime: true,
    dateFormat: 'dd/MM/yyyy'
  });
  
  return (
    <ScrollView style={styles.container}>
      {/* Card de Status */}
      <Card style={styles.card}>
        <View style={styles.statusHeaderContainer}>
          <View style={styles.statusContainer}>
            <MaterialCommunityIcons name={status.icon} size={36} color={status.color} />
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusTitle, { color: status.color }]}>
                {status.label}
              </Text>
              <Text style={styles.statusDescription}>
                {status.description}
              </Text>
            </View>
          </View>
          
          <Chip
            mode="outlined"
            style={styles.idChip}
            textStyle={styles.idChipText}
          >
            ID: {requestDetails.id.slice(0, 8)}
          </Chip>
        </View>
      </Card>
      
      {/* Informações do Motorista */}
      <Card style={styles.card}>
        <Card.Title title="Motorista" />
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nome</Text>
              <Text style={styles.infoValue}>
                {requestDetails.driverName || 'Não informado'}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="car" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Veículo</Text>
              <Text style={styles.infoValue}>
                {requestDetails.vehicleModel || 'Não informado'}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="car-side" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Placa</Text>
              <Text style={styles.infoValue}>
                {requestDetails.vehiclePlate ? 
                  formatVehiclePlate(requestDetails.vehiclePlate) : 
                  'Não informada'}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Informações do Morador */}
      <Card style={styles.card}>
        <Card.Title title="Morador" />
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="account" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Nome</Text>
              <Text style={styles.infoValue}>
                {requestDetails.resident?.name || (requestDetails.resident?.displayName) || 'Não informado'}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="home" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Unidade</Text>
              <Text style={styles.infoValue}>
                {requestDetails.unit || (requestDetails.resident?.unit) || 'Não informada'}
                {requestDetails.block || (requestDetails.resident?.block) ? 
                  ` • Bloco ${requestDetails.block || requestDetails.resident?.block}` : ''}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Informações da Solicitação */}
      <Card style={styles.card}>
        <Card.Title title="Detalhes da Solicitação" />
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Criado em</Text>
              <Text style={styles.infoValue}>{createdAt || 'N/A'}</Text>
            </View>
          </View>
          
          {updatedAt && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="update" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Atualizado em</Text>
                  <Text style={styles.infoValue}>{updatedAt}</Text>
                </View>
              </View>
            </>
          )}
          
          {requestDetails.comment && (
            <>
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="comment-text-outline" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Observações</Text>
                  <Text style={styles.infoValue}>{requestDetails.comment}</Text>
                </View>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Botões de Ação */}
      <View style={styles.actionsContainer}>
        {/* Aprovar / Negar (apenas para pendentes) */}
        {requestDetails.status === 'pending' && (
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              icon="check"
              onPress={handleApproveRequest}
              style={[styles.actionButton, styles.approveButton]}
            >
              Aprovar
            </Button>
            
            <Button
              mode="contained"
              icon="close"
              onPress={handleDenyRequest}
              style={[styles.actionButton, styles.denyButton]}
              color={theme.colors.error}
            >
              Negar
            </Button>
          </View>
        )}
        
        {/* Registrar Entrada (apenas para autorizados/chegados) */}
        {(requestDetails.status === 'authorized' || requestDetails.status === 'arrived') && (
          <Button
            mode="contained"
            icon="login"
            onPress={handleEnteredRequest}
            style={styles.actionButton}
          >
            Registrar Entrada
          </Button>
        )}
        
        {/* Concluir (apenas para entrados) */}
        {requestDetails.status === 'entered' && (
          <Button
            mode="contained"
            icon="check-circle"
            onPress={handleCompleteRequest}
            style={styles.actionButton}
          >
            Concluir Acesso
          </Button>
        )}
        
        {/* Botão Escanear (para autorizados) */}
        {requestDetails.status === 'authorized' && (
          <Button
            mode="outlined"
            icon="qrcode-scan"
            onPress={() => navigation.navigate('CondoQRScanner')}
            style={styles.actionButton}
          >
            Escanear QR Code
          </Button>
        )}
        
        <Button
          mode="outlined"
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.actionButton}
        >
          Voltar
        </Button>
      </View>
      
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
    elevation: 2,
  },
  statusHeaderContainer: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  statusTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: '#757575',
  },
  idChip: {
    height: 28,
    marginLeft: 8,
  },
  idChipText: {
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  icon: {
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
  },
  infoValue: {
    fontSize: 16,
  },
  divider: {
    marginVertical: 4,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  actionButton: {
    marginBottom: 12,
  },
  approveButton: {
    flex: 1,
    marginRight: 8,
    backgroundColor: '#4CAF50',
  },
  denyButton: {
    flex: 1,
    marginLeft: 8,
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
  button: {
    marginTop: 20,
  },
  spacer: {
    height: 40,
  },
});

export default CondoAccessDetailsScreen;