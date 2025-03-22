import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Text, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import LottieView from 'lottie-react-native';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Card from '../../components/Card';
import Button from '../../components/Button';
import Input from '../../components/Input';
import GooglePlacesCondoSearch from '../../components/GooglePlacesCondoSearch';

// Serviços
import AccessService from '../../services/access.service';
import FirestoreService from '../../services/firestore.service';

const DriverCondoSearchScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  
  // Estados
  const [selectedCondo, setSelectedCondo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [initialLocation, setInitialLocation] = useState(null);
  const [requestDetails, setRequestDetails] = useState({
    unit: '',
    block: '',
    comment: ''
  });
  const [formErrors, setFormErrors] = useState({});

  // Obter localização ao iniciar
  useEffect(() => {
    getLocationAsync();
  }, []);

  // Obter localização atual para melhorar a busca
  const getLocationAsync = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setInitialLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Erro ao obter localização:', error);
    }
  };

  // Selecionar condomínio
  const handleSelectCondo = (condo) => {
    // Verificar explicitamente se o condomínio pode ser selecionado
    // O componente GooglePlacesCondoSearch já impede a seleção de condomínios não registrados,
    // mas esta é uma verificação adicional de segurança
    if (condo.fromGoogle && !condo.inSystem) {
      Alert.alert(
        'Condomínio não cadastrado',
        'Este condomínio ainda não está cadastrado no nosso aplicativo. No momento só atendemos condomínios já cadastrados.',
        [{ text: 'Entendi' }]
      );
      return;
    }
    
    // Condomínio válido, pode prosseguir
    setSelectedCondo(condo);
    setFormErrors({});
    
    // Limpar detalhes da solicitação
    setRequestDetails({
      unit: '',
      block: '',
      comment: ''
    });
  };

  // Validar formulário
  const validateForm = () => {
    const errors = {};
    
    if (!selectedCondo) {
      errors.condo = 'Selecione um condomínio';
    }
    
    if (!requestDetails.unit.trim()) {
      errors.unit = 'Informe a unidade';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Enviar solicitação de acesso
  const handleSubmitRequest = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Preparar dados da solicitação
      const requestData = {
        condoId: selectedCondo.id,
        unit: requestDetails.unit.trim(),
        block: requestDetails.block.trim(),
        comment: requestDetails.comment || '',
        driverId: userProfile.id,
        driverName: userProfile.name || '',
        condoName: selectedCondo.name || '',
        status: 'pending',
        createdAt: new Date() 
      };
      
      // Enviar solicitação
      const requestId = await AccessService.createAccessRequest(requestData, 'driver');
      
      Alert.alert(
        'Solicitação Enviada',
        `Solicitação de acesso para ${selectedCondo.name} enviada com sucesso. Aguarde a aprovação do morador.`,
        [{ 
          text: 'OK', 
          onPress: () => {
            navigation.goBack();
          } 
        }]
      );
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      Alert.alert('Erro', error.message || 'Não foi possível enviar a solicitação');
    } finally {
      setLoading(false);
    }
  };

  // Cancelar e voltar
  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : null}
      style={styles.container}
    >
      <View style={styles.mainContainer}>
       
      <ScrollView style={styles.formScrollView}>
        {/* Componente de busca de condomínios */}
        {!selectedCondo &&(
          <><Card style={styles.searchCard}>
          
          
           <GooglePlacesCondoSearch
            onSelectCondo={handleSelectCondo}
            style={styles.searchInput}
            initialLocation={initialLocation}
          />
          
          {formErrors.condo && (
            <Text style={styles.errorText}>{formErrors.condo}</Text>
          )}
        </Card>
        <View style={styles.emptyAnimationCenter} >
         <LottieView
         source={require('../../assets/animations/empty-state.json')}
         autoPlay
         loop
         style={styles.emptyAnimation}
            />
            </View>
            </>
      )}
        
        {/* Formulário de solicitação - exibido apenas após selecionar condomínio */}
        {selectedCondo && (
          
            <Card style={styles.formCard}>
              <View style={styles.selectedCondoHeader}>
                <MaterialCommunityIcons 
                  name="office-building" 
                  size={24} 
                  color={theme.colors.primary} 
                />
                <View style={styles.selectedCondoInfo}>
                  <Text style={styles.selectedCondoName}>{selectedCondo.name}</Text>
                  <Text style={styles.selectedCondoAddress}>{selectedCondo.address}</Text>
                  {selectedCondo.distance && (
                    <Text style={styles.condoDistance}>
                      <MaterialCommunityIcons name="map-marker-distance" size={14} color="#1E88E5" />
                      {' '}{selectedCondo.distance.toFixed(1)} km
                    </Text>
                  )}
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <Text style={styles.sectionTitle}>Detalhes do Acesso</Text>
              
              <Input
                label="Número da Unidade *"
                value={requestDetails.unit}
                onChangeText={(text) => setRequestDetails(prev => ({...prev, unit: text}))}
                placeholder="Ex: 101"
                keyboardType="numeric"
                error={formErrors.unit}
              />
              
              <Input
                label="Bloco (opcional)"
                value={requestDetails.block}
                onChangeText={(text) => setRequestDetails(prev => ({...prev, block: text}))}
                placeholder="Ex: A"
                autoCapitalize="characters"
              />
              
              <Input
                label="Observações (opcional)"
                value={requestDetails.comment}
                onChangeText={(text) => setRequestDetails(prev => ({...prev, comment: text}))}
                placeholder="Informações adicionais para o morador"
                multiline
                numberOfLines={3}
              />
              
              <View style={styles.infoContainer}>
                <MaterialCommunityIcons 
                  name="information-outline" 
                  size={20} 
                  color={theme.colors.primary}
                  style={styles.infoIcon}
                />
                <Text style={styles.infoText}>
                  Sua solicitação será enviada para aprovação do morador. 
                  Você receberá uma notificação quando for aprovada.
                </Text>
              </View>
              
              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleSubmitRequest}
                  loading={loading}
                  disabled={loading}
                  style={styles.submitButton}
                >
                  Solicitar Acesso
                </Button>
                
                <Button
                  mode="outlined"
                  onPress={() => setSelectedCondo(null)}
                  disabled={loading}
                >
                  Escolher outro condomínio
                </Button>
                
                <Button
                  mode="text"
                  onPress={handleCancel}
                  disabled={loading}
                  style={styles.cancelButton}
                >
                  Cancelar
                </Button>
              </View>
            </Card>
          
        )}
        
        
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Enviando solicitação...</Text>
          </View>
        )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  mainContainer: {
    flex: 1,
    padding: 16,
    paddingVertical:35,
  },
  header: {
    marginBottom: 16,
    
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
  },
  searchCard: {
    marginBottom: 16,
    padding: 16,
  },
  formScrollView: {
    flex: 1,
  },
  formCard: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyAnimation: {
    width: 100,
    height: 150,
    marginBottom: 16,
    
    
  },
  emptyAnimationCenter:{
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    width: '100%',
    
    marginBottom: 0,
  },
  selectedCondoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedCondoInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedCondoName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  selectedCondoAddress: {
    fontSize: 14,
    color: '#757575',
  },
  condoDistance: {
    fontSize: 12,
    color: '#1E88E5',
    marginTop: 2,
  },
  divider: {
    marginVertical: 16,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginVertical: 16,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#2196F3',
  },
  buttonContainer: {
    marginTop: 16,
  },
  submitButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginTop: 8,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
  },
  loadingOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
    color: '#757575',
  },
});

export default DriverCondoSearchScreen;