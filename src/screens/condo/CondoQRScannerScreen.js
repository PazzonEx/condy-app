import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, ActivityIndicator } from 'react-native-paper';
import { Camera, CameraView } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';

// Serviços
import AccessService from '../../services/access.service';

const CondoQRScannerScreen = ({ navigation }) => {
  const theme = useTheme();
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [scannedRequest, setScannedRequest] = useState(null);

  // Solicitar permissões da câmera
  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Manipulador para QR Code escaneado
  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned || loading) return;
    
    setScanned(true);
    setLoading(true);
    
    try {
      // Validar QR Code
      const result = await AccessService.validateAccessQRCode(data);
      
      if (result.valid) {
        setScannedRequest(result.request);
        
        // Mostrar alerta com opções
        Alert.alert(
          'Acesso Autorizado',
          `Motorista: ${result.request.driverName || 'Não informado'}\nPlaca: ${result.request.vehiclePlate || 'Não informada'}\nUnidade: ${result.request.unit || 'Não informada'}${result.request.block ? ` Bloco ${result.request.block}` : ''}`,
          [
            {
              text: 'Liberar Entrada',
              onPress: async () => {
                try {
                  await AccessService.updateAccessRequestStatus(result.request.id, 'entered');
                  Alert.alert('Sucesso', 'Entrada liberada com sucesso!');
                  navigation.goBack();
                } catch (error) {
                  console.error('Erro ao atualizar status:', error);
                  Alert.alert('Erro', 'Não foi possível atualizar o status');
                }
              }
            },
            {
              text: 'Negar Entrada',
              style: 'cancel',
              onPress: () => {
                setScanned(false);
                setScannedRequest(null);
                setLoading(false);
              }
            }
          ]
        );
      } else {
        Alert.alert('QR Code Inválido', result.message || 'Este QR Code não é válido.');
        setScanned(false);
      }
    } catch (error) {
      console.error('Erro ao processar QR Code:', error);
      Alert.alert('Erro', 'Não foi possível processar o QR Code. Tente novamente.');
    } finally {
      setLoading(false);
    }
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
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          <View style={styles.scanArea} />
        </View>
      </CameraView>
      
      <View style={styles.controlsContainer}>
        <Text style={styles.instructionsText}>
          Posicione o QR Code do motorista dentro da área de escaneamento
        </Text>
        
        <View style={styles.buttonsContainer}>
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
        
        {scanned && !loading && !scannedRequest && (
          <Button
            mode="contained"
            onPress={() => setScanned(false)}
            style={styles.scanAgainButton}
          >
            Escanear Novamente
          </Button>
        )}
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Processando QR Code...</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  scanArea: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: 'white',
    backgroundColor: 'transparent',
    borderRadius: 12,
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
    marginBottom: 20,
    fontSize: 16,
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
});

export default CondoQRScannerScreen;