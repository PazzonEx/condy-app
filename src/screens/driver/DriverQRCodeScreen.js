import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  Share,
  Dimensions
} from 'react-native';
import { 
  Text, 
  Card, 
  useTheme, 
  ActivityIndicator, 
  Button as PaperButton 
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Serviços
import AccessService from '../../services/access.service';

// Componentes personalizados
import Button from '../../components/Button';

const { width } = Dimensions.get('window');

const DriverQRCodeScreen = ({ navigation, route }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const qrCodeRef = useRef(null);

  // Estados para gerenciamento de QR Code
  const [activeRequests, setActiveRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [qrExpiration, setQrExpiration] = useState(null);

  // Carregar solicitações ativas ao montar a tela
  useEffect(() => {
    loadActiveRequests();
  }, []);

  // Carregar solicitações ativas do motorista
  const loadActiveRequests = async () => {
    try {
      setLoading(true);
      const requests = await AccessService.getAccessRequests(['authorized']);
      setActiveRequests(requests);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      Alert.alert('Erro', 'Não foi possível carregar solicitações ativas');
    } finally {
      setLoading(false);
    }
  };

  // Gerar QR Code para solicitação
  const generateQRCode = async (request) => {
    try {
      setLoading(true);
      const qrData = await AccessService.generateAccessQRCode(request.id);
      setSelectedRequest(request);
      setQrCodeData(qrData);
    } catch (error) {
      console.error('Erro ao gerar QR Code:', error);
      Alert.alert('Erro', 'Não foi possível gerar o QR Code');
    } finally {
      setLoading(false);
    }
  };

  // Gerenciar expiração do QR Code
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
              setQrCodeData(null);
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

  // Compartilhar QR Code
  const shareQRCode = async () => {
    try {
      if (!qrCodeData || !selectedRequest) return;
      
      const qrData = JSON.parse(qrCodeData);
      
      const message = `Solicitação de Acesso Condy\n` +
        `Condomínio: ${selectedRequest.condo?.name || 'Não informado'}\n` +
        `Unidade: ${selectedRequest.unit || 'Não informada'}` +
        `${selectedRequest.block ? ` • Bloco ${selectedRequest.block}` : ''}\n` +
        `Válido até: ${timeLeft || 'alguns minutos'}`;
      
      await Share.share({
        message,
        title: 'QR Code de Acesso Condy',
      });
    } catch (error) {
      console.error('Erro ao compartilhar QR Code:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o QR Code');
    }
  };

  // Copiar detalhes do QR Code
  const copyQRCodeDetails = async () => {
    try {
      if (!qrCodeData || !selectedRequest) return;
      
      const qrData = JSON.parse(qrCodeData);
      
      const details = 
        `Solicitação de Acesso Condy\n` +
        `ID: ${selectedRequest.id}\n` +
        `Condomínio: ${selectedRequest.condo?.name || 'Não informado'}\n` +
        `Unidade: ${selectedRequest.unit || 'Não informada'}` +
        `${selectedRequest.block ? ` • Bloco ${selectedRequest.block}` : ''}\n` +
        `Válido até: ${timeLeft || 'alguns minutos'}`;
      
      await Clipboard.setStringAsync(details);
      
      Alert.alert('Sucesso', 'Detalhes copiados para área de transferência');
    } catch (error) {
      console.error('Erro ao copiar detalhes:', error);
      Alert.alert('Erro', 'Não foi possível copiar os detalhes');
    }
  };

  // Renderizar cartão de solicitação
  const renderRequestCard = (request) => (
    <Card 
      key={request.id} 
      style={styles.requestCard}
      onPress={() => generateQRCode(request)}
    >
      <Card.Content>
        <View style={styles.requestCardHeader}>
          <MaterialCommunityIcons 
            name="office-building" 
            size={24} 
            color={theme.colors.primary} 
          />
          <View style={styles.requestCardDetails}>
            <Text style={styles.requestCardTitle}>
              {request.condo?.name || 'Condomínio não informado'}
            </Text>
            <Text style={styles.requestCardSubtitle}>
              Unidade: {request.unit || 'N/A'}
              {request.block ? ` • Bloco ${request.block}` : ''}
            </Text>
          </View>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meus QR Codes</Text>
        <Text style={styles.headerSubtitle}>
          Selecione uma solicitação autorizada para gerar QR Code
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator 
          animating={true} 
          color={theme.colors.primary} 
          style={styles.loader} 
        />
      ) : activeRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="gate" 
            size={64} 
            color="#BDBDBD" 
          />
          <Text style={styles.emptyTitle}>Sem solicitações ativas</Text>
          <Text style={styles.emptySubtitle}>
            Você não possui solicitações de acesso autorizadas no momento
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('DriverCondoSearch')}
            style={styles.searchCondoButton}
          >
            Buscar Condomínios
          </Button>
        </View>
      ) : (
        <View style={styles.requestsList}>
          {activeRequests.map(renderRequestCard)}
        </View>
      )}

      {qrCodeData && selectedRequest && (
        <Card style={styles.qrCodeCard}>
          <Card.Title 
            title="QR Code de Acesso" 
            subtitle={`Condomínio: ${selectedRequest.condo?.name || 'Não informado'}`}
          />
          <Card.Content style={styles.qrCodeContainer}>
            <QRCode
              value={qrCodeData}
              size={width * 0.6}
              color="black"
              backgroundColor="white"
              getRef={(ref) => (qrCodeRef.current = ref)}
            />
            
            {timeLeft && (
              <Text style={styles.expirationText}>
                Expira em: {timeLeft}
              </Text>
            )}
            
            <View style={styles.qrCodeActions}>
              <PaperButton 
                mode="outlined" 
                onPress={shareQRCode}
                style={styles.qrCodeActionButton}
              >
                Compartilhar
              </PaperButton>
              
              <PaperButton 
                mode="outlined" 
                onPress={copyQRCodeDetails}
                style={styles.qrCodeActionButton}
              >
                Copiar Detalhes
              </PaperButton>
            </View>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
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
  loader: {
    marginTop: 20,
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
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  searchCondoButton: {
    marginTop: 10,
  },
  requestsList: {
    padding: 16,
  },
  requestCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  requestCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestCardDetails: {
    marginLeft: 16,
    flex: 1,
  },
  requestCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  requestCardSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  qrCodeCard: {
    margin: 16,
    borderRadius: 8,
  },
  qrCodeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  expirationText: {
    marginTop: 16,
    fontSize: 14,
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  qrCodeActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  qrCodeActionButton: {
    marginHorizontal: 8,
  },
});

export default DriverQRCodeScreen;