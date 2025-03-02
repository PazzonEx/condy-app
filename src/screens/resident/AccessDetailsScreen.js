import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, Share } from 'react-native';
import { Text, Card, Divider, ActivityIndicator, useTheme, Chip } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as Clipboard from 'expo-clipboard';
import { useFocusEffect } from '@react-navigation/native';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';

// Serviços
import AccessService from '../../services/access.service';

// Utilitários
import { formatDate, formatVehiclePlate } from '../../utils/format';

const AccessDetailsScreen = ({ route, navigation }) => {
  const theme = useTheme();
  const { requestId, showQR = false } = route.params || {};
  const { userProfile } = useAuth();
  
  const [requestDetails, setRequestDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loadingQR, setLoadingQR] = useState(false);
  const [error, setError] = useState(null);
  const [qrExpiration, setQrExpiration] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);
  
  // Status com formatação e cores
  const statusDetails = {
    pending: {
      label: 'Pendente',
      color: theme.colors.accent,
      icon: 'clock-outline',
      description: 'Aguardando aprovação da portaria'
    },
    pending_resident: {
      label: 'Aguardando Morador',
      color: '#FF9800', // Laranja
      icon: 'account-clock',
      description: 'Aguardando aprovação do morador'
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
      
      // Limpar timer ao sair da tela
      return () => {
        if (qrExpiration) {
          clearInterval(qrExpiration);
        }
      };
    }, [requestId])
  );
  
  // Mostrar QR Code automaticamente se parâmetro de rota indicar
  useEffect(() => {
    if (showQR && requestDetails && requestDetails.status === 'authorized' && !qrCodeData) {
      handleGenerateQRCode();
    }
  }, [showQR, requestDetails]);
  
  // Atualizar timer de expiração do QR Code
  useEffect(() => {
    if (qrCodeData) {
      try {
        const qrData = JSON.parse(qrCodeData);
        if (qrData.expiresAt) {
          // Configurar timer para atualizar a cada segundo
          const intervalId = setInterval(() => {
            const now = Date.now();
            const expiry = qrData.expiresAt;
            const remaining = expiry - now;
            
            if (remaining <= 0) {
              // QR Code expirado
              setTimeLeft('Expirado');
              clearInterval(intervalId);
              setQrCodeData(null); // Limpar QR Code expirado
            } else {
              // Calcular tempo restante
              const minutes = Math.floor(remaining / 60000);
              const seconds = Math.floor((remaining % 60000) / 1000);
              setTimeLeft(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
            }
          }, 1000);
          
          setQrExpiration(intervalId);
          
          // Limpar timer ao desmontar
          return () => clearInterval(intervalId);
        }
      } catch (error) {
        console.error('Erro ao processar dados do QR Code:', error);
      }
    }
  }, [qrCodeData]);
  
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
  const handleShareQRCodeWithDriver = async () => {
    try {
      if (!qrCodeData || !requestDetails) return;
      
      // Create a sharable message with relevant details
      const message = 
        `Access Request for ${requestDetails.condo?.name || 'Condominium'}\n` +
        `Unit: ${requestDetails.unit || 'Not specified'}${requestDetails.block ? ` Block ${requestDetails.block}` : ''}\n` +
        `Vehicle Plate: ${requestDetails.vehiclePlate || 'Not specified'}\n` +
        `Valid until: ${timeLeft || 'a few minutes'}\n\n` +
        `Show this QR code to the gatehouse when you arrive.`;
      
      // Share the message - ideally, we would generate a shareable image with the QR code
      await Share.share({
        message,
        title: 'Condy Access Code',
      });
    } catch (error) {
      console.error('Error sharing QR Code:', error);
      Alert.alert('Error', 'Could not share the QR Code');
    }
  };
  
  // Gerar QR Code para solicitação
  const handleGenerateQRCode = async () => {
    try {
      setLoadingQR(true);
      setError(null);
      
      const qrData = await AccessService.generateAccessQRCode(requestId);
      setQrCodeData(qrData);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      Alert.alert('Erro', 'Não foi possível gerar o QR Code para esta solicitação');
    } finally {
      setLoadingQR(false);
    }
  };
  
  // Compartilhar QR Code
  const handleShareQRCode = async () => {
    try {
      if (!qrCodeData) return;
      
      // Obter informações de identificação
      const vehicleInfo = requestDetails.vehiclePlate
        ? `${requestDetails.vehicleModel || 'Veículo'} - Placa: ${requestDetails.vehiclePlate}`
        : 'Informações do veículo não disponíveis';
      
      const message = `Solicitação de acesso para ${requestDetails.driverName || 'Motorista'}\n${vehicleInfo}\n\nEste código expira em ${timeLeft || 'alguns minutos'}.`;
      
      await Share.share({
        message,
        title: 'Acesso Condy',
      });
    } catch (error) {
      console.error('Erro ao compartilhar QR Code:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o QR Code');
    }
  };
  
  // Copiar detalhes para área de transferência
  const handleCopyDetails = async () => {
    try {
      const details = `
        Solicitação de Acesso Condy
        ID: ${requestDetails.id}
        Motorista: ${requestDetails.driverName || 'Não informado'}
        Veículo: ${requestDetails.vehicleModel || 'Não informado'}
        Placa: ${requestDetails.vehiclePlate || 'Não informada'}
        Status: ${statusDetails[requestDetails.status]?.label || requestDetails.status}
        Criado em: ${formatDate(requestDetails.createdAt, { showTime: true })}
      `;
      
      await Clipboard.setStringAsync(details.trim());
      Alert.alert('Sucesso', 'Detalhes copiados para a área de transferência');
    } catch (error) {
      console.error('Erro ao copiar para área de transferência:', error);
      Alert.alert('Erro', 'Não foi possível copiar os detalhes');
    }
  };
  
  // Cancelar solicitação
  const handleCancelRequest = () => {
    Alert.alert(
      'Cancelar Solicitação',
      'Tem certeza que deseja cancelar esta solicitação?',
      [
        {
          text: 'Não',
          style: 'cancel',
        },
        {
          text: 'Sim',
          onPress: async () => {
            try {
              setLoading(true);
              await AccessService.updateAccessRequestStatus(requestId, 'canceled');
              Alert.alert('Sucesso', 'Solicitação cancelada com sucesso');
              // Atualizar detalhes
              loadRequestDetails();
            } catch (error) {
              console.error('Erro ao cancelar solicitação:', error);
              Alert.alert('Erro', 'Não foi possível cancelar a solicitação');
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
      
      {/* QR Code para solicitações autorizadas */}
      {requestDetails.status === 'authorized' && (
        <Card style={styles.card}>
          <Card.Title title="QR Code de Acesso" />
          <Card.Content>
            {qrCodeData ? (
              <View style={styles.qrCodeContainer}>
                <QRCode
                  value={qrCodeData}
                  size={200}
                  color="black"
                  backgroundColor="white"
                />
                
                <View style={styles.qrInfoContainer}>
                  <Text style={styles.qrInstructions}>
                    Apresente este QR Code na portaria
                  </Text>
                  
                  {timeLeft && (
                    <Text style={styles.expirationText}>
                      Expira em: <Text style={{ fontWeight: 'bold' }}>{timeLeft}</Text>
                    </Text>
                  )}
                  
                  <View style={styles.qrActionsContainer}>
                    <Button
                      mode="outlined"
                      icon="refresh"
                      onPress={handleGenerateQRCode}
                      style={styles.qrActionButton}
                    >
                      Renovar
                    </Button>
                    
                    <Button
                      mode="outlined"
                      icon="share"
                      onPress={handleShareQRCode}
                      style={styles.qrActionButton}
                    >
                      Compartilhar
                    </Button>
                  </View>
                </View>
              </View>
            ) : (
              <Button
                mode="contained"
                onPress={handleGenerateQRCode}
                loading={loadingQR}
                disabled={loadingQR}
                style={styles.generateQrButton}
              >
                Gerar QR Code
              </Button>
            )}
          </Card.Content>
        </Card>
      )}
      
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
      
      {/* Informações do Local */}
      <Card style={styles.card}>
        <Card.Title title="Local" />
        <Card.Content>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="office-building" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Condomínio</Text>
              <Text style={styles.infoValue}>
                {requestDetails.condo?.name || 'Não informado'}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="home" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Unidade</Text>
              <Text style={styles.infoValue}>
                {requestDetails.unit || 'Não informada'}
                {requestDetails.block ? ` • Bloco ${requestDetails.block}` : ''}
              </Text>
            </View>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="map-marker" size={24} color="#555" style={styles.icon} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Endereço</Text>
              <Text style={styles.infoValue}>
                {requestDetails.condo?.address || 'Não informado'}
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
        {/* Mostrar botão de Cancelar apenas para pendente e autorizado */}
        {(requestDetails.status === 'pending' || requestDetails.status === 'authorized') && (
          <Button
            mode="outlined"
            icon="cancel"
            onPress={handleCancelRequest}
            style={styles.actionButton}
            color={theme.colors.error}
          >
            Cancelar Solicitação
          </Button>
        )}
        
        {/* Mostrar botão de QR Code apenas para autorizado */}
        {requestDetails.status === 'authorized' && !qrCodeData && (
          <Button
            mode="contained"
            icon="qrcode"
            onPress={handleGenerateQRCode}
            style={styles.actionButton}
          >
            Gerar QR Code
          </Button>
        )}
        
        <Button
          mode="outlined"
          icon="content-copy"
          onPress={handleCopyDetails}
          style={styles.actionButton}
        >
          Copiar Detalhes
        </Button>
        
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
  qrCodeContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  qrInfoContainer: {
    alignItems: 'center',
    marginTop: 16,
    width: '100%',
  },
  qrInstructions: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 8,
  },
  expirationText: {
    fontSize: 14,
    color: '#D32F2F',
    marginBottom: 16,
  },
  qrActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  qrActionButton: {
    marginHorizontal: 4,
    marginTop: 8,
  },
  generateQrButton: {
    marginVertical: 16,
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
  actionButton: {
    marginBottom: 12,
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

export default AccessDetailsScreen;