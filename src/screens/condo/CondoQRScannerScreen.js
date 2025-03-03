import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Animated, Dimensions, TextInput } from 'react-native';
import { Text, useTheme, ActivityIndicator, Portal, Dialog, Button as PaperButton } from 'react-native-paper';
import { Camera, CameraView } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';

// Serviços
import AccessService from '../../services/access.service';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = width * 0.7;

const CondoQRScannerScreen = ({ navigation }) => {
  const theme = useTheme();
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedRequest, setScannedRequest] = useState(null);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [scanCount, setScanCount] = useState(0);
  const [lastScannedId, setLastScannedId] = useState(null);
  
  // Estados para verificação manual por placa
  const [manualPlate, setManualPlate] = useState('');
  const [verifyByPlateLoading, setVerifyByPlateLoading] = useState(false);
  const [multipleRequests, setMultipleRequests] = useState([]);
  const [showRequestSelector, setShowRequestSelector] = useState(false);
  const [manualVerificationMode, setManualVerificationMode] = useState(false);

  // Solicitar permissões da câmera
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
    
    return () => {
      // Limpar qualquer coisa necessária
    };
  }, []);
  
  // Animação de linha de escaneamento
  useEffect(() => {
    const startAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, {
            toValue: SCAN_AREA_SIZE,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanLineAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    
    if (hasPermission === true && !scanned && !loading) {
      startAnimation();
    }
    
    return () => {
      scanLineAnim.stopAnimation();
    };
  }, [hasPermission, scanned, loading, scanLineAnim]);

  // Evitar escaneamento duplicado
  const isDuplicateScan = (requestId) => {
    if (requestId === lastScannedId) {
      // Se for o mesmo ID e dentro de 5 segundos, considerar duplicado
      return true;
    }
    setLastScannedId(requestId);
    return false;
  };
  
  // Função para processar uma solicitação (compartilhada entre QR e verificação manual)
  const handleProcessRequest = async (request) => {
    setScannedRequest(request);
    setDialogVisible(true);
    setLoading(false);
  };
  
  // Verificação manual por placa
  const handleManualPlateVerification = async () => {
    try {
      setVerifyByPlateLoading(true);
      
      if (!manualPlate.trim()) {
        Alert.alert('Erro', 'Por favor, digite uma placa de veículo');
        setVerifyByPlateLoading(false);
        return;
      }
      
      // Limpar formato da placa
      const formattedPlate = manualPlate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
      
      // Buscar solicitações por placa - implementação simplificada
      // Na implementação real, você deve implementar este método no AccessService
      let requests = [];
      try {
        // Verificar se o método existe
        if (typeof AccessService.queryAccessRequestsByPlate === 'function') {
          requests = await AccessService.queryAccessRequestsByPlate(formattedPlate);
        } else {
          // Implementação alternativa usando getAccessRequests
          const allRequests = await AccessService.getAccessRequests(['authorized', 'arrived']);
          requests = allRequests.filter(req => 
            req.vehiclePlate && req.vehiclePlate.toUpperCase() === formattedPlate
          );
        }
      } catch (error) {
        console.error('Erro na busca por placa:', error);
        // Fallback para pesquisa básica
        const allRequests = await AccessService.getAccessRequests(['authorized', 'arrived']);
        requests = allRequests.filter(req => 
          req.vehiclePlate && req.vehiclePlate.toUpperCase() === formattedPlate
        );
      }
      
      if (requests.length === 0) {
        Alert.alert('Nenhuma Solicitação Encontrada', 'Não foram encontradas solicitações de acesso pendentes para esta placa de veículo.');
        setVerifyByPlateLoading(false);
        return;
      }
      
      // Se houver múltiplas solicitações, mostrar um seletor
      if (requests.length > 1) {
        setMultipleRequests(requests);
        setShowRequestSelector(true);
        setVerifyByPlateLoading(false);
        return;
      }
      
      // Se houver uma única solicitação, processá-la
      const request = requests[0];
      handleProcessRequest(request);
    } catch (error) {
      console.error('Erro ao verificar placa:', error);
      Alert.alert('Erro', 'Não foi possível verificar a placa do veículo');
    } finally {
      setVerifyByPlateLoading(false);
    }
  };
  
  // Selecionar uma solicitação da lista (quando há múltiplas)
  const handleSelectRequest = (request) => {
    setShowRequestSelector(false);
    handleProcessRequest(request);
  };

  // Manipulador para QR Code escaneado
  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    
    try {
      // Tenta analisar os dados do QR
      let qrData;
      try {
        qrData = JSON.parse(data);
      } catch (e) {
        // Se não for um JSON válido, usa o dado bruto
        qrData = { rawData: data };
      }
      
      // Verificar se é um QR Code do app
      if (!qrData.requestId) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert('QR Code Inválido', 'Este QR Code não é uma solicitação de acesso válida.');
        return;
      }
      
      // Verificar se é um escaneamento duplicado
      if (isDuplicateScan(qrData.requestId)) {
        console.log('Escaneamento duplicado detectado, ignorando...');
        return;
      }
      
      // Incrementar contador de escaneamentos
      setScanCount(prev => prev + 1);
      
      // Feedback tátil para indicar escaneamento bem-sucedido
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      setScanned(true);
      setLoading(true);
      
      // Validar QR Code
      const result = await AccessService.validateAccessQRCode(data);
      
      if (result.valid) {
        setScannedRequest(result.request);
        setDialogVisible(true);
      } else {
        Alert.alert('QR Code Inválido', result.message || 'Este QR Code não é válido.');
        setScanned(false);
      }
    } catch (error) {
      console.error('Erro ao processar QR Code:', error);
      Alert.alert('Erro', 'Não foi possível processar o QR Code. Tente novamente.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setScanned(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Manipulador para registrar entrada
  const handleEntryConfirmation = async (confirm) => {
    setDialogVisible(false);
    
    if (!confirm) {
      setScanned(false);
      setScannedRequest(null);
      return;
    }
    
    try {
      setLoading(true);
      await AccessService.updateAccessRequestStatus(scannedRequest.id, 'entered');
      
      // Feedback tátil para confirmar entrada
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      Alert.alert(
        'Entrada Registrada', 
        'Entrada do motorista registrada com sucesso!',
        [{ text: 'OK', onPress: () => {
          setScanned(false);
          setScannedRequest(null);
        }}]
      );
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      Alert.alert('Erro', 'Não foi possível registrar a entrada. Tente novamente.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  // Alternar entre verificação por QR code e verificação manual
  const toggleVerificationMode = () => {
    setManualVerificationMode(!manualVerificationMode);
    // Resetar estados ao alternar modos
    setScanned(false);
    setManualPlate('');
  };

  // Renderizar mensagem de permissão
  if (hasPermission === null) {
    return (
      <View style={styles.permissionContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.permissionText}>Solicitando permissão da câmera...</Text>
      </View>
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <MaterialCommunityIcons name="camera-off" size={64} color="#757575" />
        <Text style={styles.permissionText}>Sem acesso à câmera</Text>
        <Text style={styles.permissionSubtext}>
          Para escanear QR Codes, é necessário permitir o acesso à câmera.
        </Text>
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

  return (
    <View style={styles.container}>
      {!manualVerificationMode && (
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        >
          {/* Overlay que escurece a tela exceto pela área de escaneamento */}
          <View style={styles.overlay}>
            <View style={styles.scanAreaContainer}>
              <View style={styles.scanArea} />
              
              {/* Linha de escaneamento animada */}
              {!scanned && !loading && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    {
                      transform: [{ translateY: scanLineAnim }],
                    },
                  ]}
                />
              )}
              
              {/* Cantos da área de escaneamento */}
              <View style={[styles.cornerTL, styles.corner]} />
              <View style={[styles.cornerTR, styles.corner]} />
              <View style={[styles.cornerBL, styles.corner]} />
              <View style={[styles.cornerBR, styles.corner]} />
            </View>
          </View>
          
          {/* Cabeçalho */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
            </TouchableOpacity>
            
            <Text style={styles.headerTitle}>Escanear QR Code</Text>
          </View>
        </CameraView>
      )}
      
      {/* Modo de verificação manual */}
      {manualVerificationMode && (
        <View style={styles.manualModeContainer}>
          <View style={styles.manualHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <MaterialCommunityIcons name="arrow-left" size={28} color={theme.colors.primary} />
            </TouchableOpacity>
            
            <Text style={styles.manualHeaderTitle}>Verificar por Placa</Text>
          </View>
          
          <View style={styles.manualContent}>
            <MaterialCommunityIcons name="car" size={64} color={theme.colors.primary} style={styles.manualIcon} />
            
            <Text style={styles.manualInstructions}>
              Digite a placa do veículo para verificar solicitações ativas
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.plateInput}
                value={manualPlate}
                onChangeText={setManualPlate}
                placeholder="Placa do veículo (AAA0000)"
                autoCapitalize="characters"
                maxLength={7}
              />
              
              <Button
                mode="contained"
                onPress={handleManualPlateVerification}
                loading={verifyByPlateLoading}
                disabled={verifyByPlateLoading || !manualPlate.trim()}
                style={styles.verifyButton}
              >
                Verificar
              </Button>
            </View>
          </View>
        </View>
      )}
      
      {/* Controles inferiores */}
      <View style={styles.controlsContainer}>
        <Text style={styles.instructionsText}>
          {manualVerificationMode
            ? 'Digite a placa do veículo para verificar acesso'
            : 'Posicione o QR Code do motorista dentro da área de escaneamento'}
        </Text>
        
        <View style={styles.statsContainer}>
          <Text style={styles.statsText}>
            {manualVerificationMode ? '' : `QR Codes escaneados: ${scanCount}`}
          </Text>
        </View>
        
        <View style={styles.buttonsContainer}>
          {!manualVerificationMode && (
            <TouchableOpacity
              style={styles.iconButton}
              onPress={() => setTorchOn(!torchOn)}
            >
              <MaterialCommunityIcons
                name={torchOn ? 'flashlight-off' : 'flashlight'}
                size={28}
                color={theme.colors.primary}
              />
              <Text style={styles.iconButtonText}>
                {torchOn ? 'Desligar Flash' : 'Ligar Flash'}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={toggleVerificationMode}
          >
            <MaterialCommunityIcons
              name={manualVerificationMode ? 'qrcode-scan' : 'card-text'}
              size={28}
              color={theme.colors.primary}
            />
            <Text style={styles.iconButtonText}>
              {manualVerificationMode ? 'Usar QR Code' : 'Usar Placa'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons
              name="close"
              size={28}
              color={theme.colors.primary}
            />
            <Text style={styles.iconButtonText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
        
        {scanned && !loading && !dialogVisible && !manualVerificationMode && (
          <Button
            mode="contained"
            onPress={() => setScanned(false)}
            style={styles.scanAgainButton}
          >
            Escanear Novamente
          </Button>
        )}
        
        {loading && !dialogVisible && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processando...</Text>
          </View>
        )}
      </View>
      
      {/* Diálogo de confirmação */}
      <Portal>
        <Dialog
          visible={dialogVisible}
          onDismiss={() => handleEntryConfirmation(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Acesso Autorizado</Dialog.Title>
          <Dialog.Content>
            <View style={styles.dialogContent}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={48} 
                color="#4CAF50" 
                style={styles.dialogIcon} 
              />
              
              <View style={styles.driverInfo}>
                <Text style={styles.driverName}>
                  {scannedRequest?.driverName || 'Motorista'}
                </Text>
                
                <View style={styles.driverDetail}>
                  <MaterialCommunityIcons name="car" size={18} color="#555" />
                  <Text style={styles.driverDetailText}>
                    {scannedRequest?.vehicleModel || 'Veículo não informado'}
                  </Text>
                </View>
                
                <View style={styles.driverDetail}>
                  <MaterialCommunityIcons name="card-text" size={18} color="#555" />
                  <Text style={styles.driverDetailText}>
                    {scannedRequest?.vehiclePlate || 'Placa não informada'}
                  </Text>
                </View>
                
                <View style={styles.driverDetail}>
                  <MaterialCommunityIcons name="home" size={18} color="#555" />
                  <Text style={styles.driverDetailText}>
                    Unidade: {scannedRequest?.unit || 'N/A'}
                    {scannedRequest?.block ? ` • Bloco ${scannedRequest.block}` : ''}
                  </Text>
                </View>
              </View>
            </View>
            
            <Text style={styles.confirmationQuestion}>
              Deseja liberar a entrada deste motorista?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => handleEntryConfirmation(false)}>
              Negar
            </PaperButton>
            <PaperButton onPress={() => handleEntryConfirmation(true)}>
              Liberar Entrada
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Diálogo de seleção de solicitação (quando há múltiplas) */}
      <Portal>
        <Dialog
          visible={showRequestSelector}
          onDismiss={() => setShowRequestSelector(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Múltiplas Solicitações</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.selectorInstructions}>
              Foram encontradas várias solicitações para esta placa. Selecione uma:
            </Text>
            
            {multipleRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestOption}
                onPress={() => handleSelectRequest(request)}
              >
                <View>
                  <Text style={styles.requestOptionTitle}>
                    {request.driverName || 'Motorista'}
                  </Text>
                  <Text style={styles.requestOptionSubtitle}>
                    Unidade: {request.unit || 'N/A'}
                    {request.block ? ` • Bloco ${request.block}` : ''}
                  </Text>
                  <Text style={styles.requestOptionDate}>
                    {request.createdAt && new Date(request.createdAt).toLocaleString()}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#757575" />
              </TouchableOpacity>
            ))}
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setShowRequestSelector(false)}>
              Cancelar
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 8,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  scanAreaContainer: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
  },
  scanArea: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
  scanLine: {
    position: 'absolute',
    height: 2,
    width: SCAN_AREA_SIZE,
    backgroundColor: '#1E88E5',
    zIndex: 2,
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: 'white',
    borderWidth: 3,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 12,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 12,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 12,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 12,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
  },
  instructionsText: {
    textAlign: 'center',
    marginBottom: 16,
    fontSize: 16,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 12,
    height: 20, // Altura fixa para evitar redimensionamento
  },
  statsText: {
    fontSize: 14,
    color: '#757575',
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  iconButton: {
    alignItems: 'center',
  },
  iconButtonText: {
    marginTop: 4,
    color: '#757575',
  },
  scanAgainButton: {
    marginTop: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
  },
  permissionText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  permissionSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 20,
  },
  button: {
    marginTop: 10,
  },
  dialog: {
    backgroundColor: 'white',
    borderRadius: 12,
  },
  dialogContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  dialogIcon: {
    marginBottom: 16,
  },
  driverInfo: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 16,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  driverDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  driverDetailText: {
    marginLeft: 8,
    fontSize: 14,
  },
  confirmationQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  // Estilos para o modo de verificação manual
  manualModeContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  manualHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 40,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  manualHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginLeft: 8,
  },
  manualContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  manualIcon: {
    marginBottom: 20,
  },
  manualInstructions: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#757575',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  plateInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    textAlign: 'center',
  },
  verifyButton: {
    width: '100%',
  },
  // Estilos para o seletor de múltiplas solicitações
  selectorInstructions: {
    marginBottom: 16,
    color: '#757575',
  },
  requestOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  requestOptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  requestOptionSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  requestOptionDate: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 4,
  },
});

export default CondoQRScannerScreen;