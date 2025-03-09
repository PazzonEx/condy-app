// src/components/AddressAutocomplete.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator, 
  Modal, 
  Text,
  Keyboard,
  Animated
} from 'react-native';
import { 
  TextInput, 
  Surface, 
  useTheme,
  Divider 
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// Utilitários
import { getAddressFromCoordinates } from '../utils/location';

const AddressAutocomplete = ({ 
  value = '', 
  onSelect, 
  placeholder = 'Digite um endereço',
  label = 'Endereço',
  error = null,
  disabled = false,
  style,
  required = false
}) => {
  const theme = useTheme();
  
  // Estados
  const [query, setQuery] = useState(value);
  const [predictions, setPredictions] = useState([]);
  const [showPredictions, setShowPredictions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Debounce timer para otimizar chamadas à API
  const debounceTimerRef = useRef(null);
  const sessionTokenRef = useRef(null);
  
  // Gerar token de sessão para agrupar requisições do Google Places
  useEffect(() => {
    sessionTokenRef.current = Math.random().toString(36).substring(2, 15);
    
    // Limpar timer ao desmontar
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Efeito para atualizar o valor interno quando o valor externo mudar
  useEffect(() => {
    setQuery(value);
  }, [value]);
  
  // Efeito para animar a lista de previsões
  useEffect(() => {
    if (showPredictions && predictions.length > 0) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true
      }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [showPredictions, predictions]);
  
  // Buscar endereços no Google Places API
  const fetchPredictions = async (input) => {
    if (!input || input.length < 3) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }
    
    try {
      setLoading(true);
      
      // Obter API key
      const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!apiKey) {
        console.warn('Google Places API Key não configurada');
        return;
      }
      
      // Usar o token de sessão para agrupar requisições
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=address&language=pt_BR&key=${apiKey}&sessiontoken=${sessionTokenRef.current}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        setPredictions(data.predictions);
        setShowPredictions(true);
      } else {
        setPredictions([]);
        setShowPredictions(false);
        console.warn('Google Places API erro:', data.status);
      }
    } catch (error) {
      console.error('Erro ao buscar endereços:', error);
      setPredictions([]);
      setShowPredictions(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Obter detalhes do endereço selecionado
  const getPlaceDetails = async (placeId) => {
    try {
      setLoading(true);
      
      // Obter API key
      const apiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!apiKey) {
        console.warn('Google Places API Key não configurada');
        return null;
      }
      
      // Usar o mesmo token de sessão da busca anterior
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_component,geometry,formatted_address&key=${apiKey}&sessiontoken=${sessionTokenRef.current}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        // Gerar novo token para a próxima busca
        sessionTokenRef.current = Math.random().toString(36).substring(2, 15);
        
        return {
          placeId,
          formattedAddress: data.result.formatted_address,
          latitude: data.result.geometry?.location?.lat,
          longitude: data.result.geometry?.location?.lng,
          components: formatGoogleAddressComponents(data.result.address_components || [])
        };
      } else {
        console.warn('Google Places Details API erro:', data.status);
        return null;
      }
    } catch (error) {
      console.error('Erro ao obter detalhes do endereço:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };
  
  // Formatar componentes de endereço
  const formatGoogleAddressComponents = (components) => {
    const result = {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      postalCode: '',
      country: ''
    };
    
    // Mapeamento de tipos do Google para nosso formato
    const componentMap = {
      route: 'street',
      street_number: 'number',
      sublocality_level_1: 'neighborhood',
      sublocality: 'neighborhood',
      administrative_area_level_2: 'city',
      administrative_area_level_1: 'state',
      postal_code: 'postalCode',
      country: 'country'
    };
    
    // Preencher resultados
    components.forEach(component => {
      for (const type of component.types) {
        if (componentMap[type]) {
          result[componentMap[type]] = component.long_name;
          break;
        }
      }
    });
    
    return result;
  };
  
  // Manipular mudança de texto no input
  const handleChangeText = (text) => {
    setQuery(text);
    
    // Limpar timeout anterior
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Configurar novo timeout (debounce)
    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(text);
    }, 300);
  };
  
  // Selecionar um local nas previsões
  const handleSelectPlace = async (prediction) => {
    setShowPredictions(false);
    Keyboard.dismiss();
    
    const placeDetails = await getPlaceDetails(prediction.place_id);
    
    if (placeDetails) {
      setQuery(placeDetails.formattedAddress);
      if (onSelect) onSelect(placeDetails);
    } else {
      // Fallback se não conseguir obter detalhes
      setQuery(prediction.description);
      if (onSelect) onSelect({ formattedAddress: prediction.description, placeId: prediction.place_id });
    }
  };
  
  // Obter localização atual
  const handleGetCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      
      // Verificar permissões
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setModalVisible(true);
        return;
      }
      
      // Obter coordenadas
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      // Obter endereço com as coordenadas
      const address = await getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );
      
      if (address) {
        setQuery(address.formattedAddress);
        if (onSelect) {
          onSelect({
            formattedAddress: address.formattedAddress,
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            components: address
          });
        }
      } else {
        console.warn('Não foi possível obter endereço para localização atual');
      }
    } catch (error) {
      console.error('Erro ao obter localização atual:', error);
    } finally {
      setLocationLoading(false);
    }
  };
  
  // Limpar o campo
  const handleClear = () => {
    setQuery('');
    setPredictions([]);
    setShowPredictions(false);
    if (onSelect) onSelect(null);
  };
  
  // Renderizar item na lista de previsões
  const renderPredictionItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.predictionItem}
      onPress={() => handleSelectPlace(item)}
    >
      <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
      <Text style={styles.predictionText} numberOfLines={2}>
        {item.description}
      </Text>
    </TouchableOpacity>
  );
  
  // Render
  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        {/* Input de endereço */}
        <TextInput
          label={label + (required ? ' *' : '')}
          value={query}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          mode="outlined"
          disabled={disabled || locationLoading}
          error={!!error}
          style={styles.input}
          onFocus={() => {
            if (predictions.length > 0) {
              setShowPredictions(true);
            }
          }}
          right={
            query ? (
              <TextInput.Icon 
                icon="close-circle" 
                color="#757575" 
                onPress={handleClear}
                disabled={disabled || locationLoading}
              />
            ) : null
          }
          left={
            <TextInput.Icon 
              icon="map-marker" 
              color={theme.colors.primary}
            />
          }
        />
        
        {/* Botão de localização atual */}
        <TouchableOpacity 
          style={[
            styles.locationButton,
            disabled && styles.locationButtonDisabled
          ]}
          onPress={handleGetCurrentLocation}
          disabled={disabled || locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <MaterialCommunityIcons 
              name="crosshairs-gps" 
              size={24} 
              color={disabled ? "#BDBDBD" : theme.colors.primary} 
            />
          )}
        </TouchableOpacity>
      </View>
      
      {/* Mensagem de erro */}
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {/* Lista de sugestões */}
      {showPredictions && predictions.length > 0 && (
        <Animated.View 
          style={[
            styles.predictionsContainer,
            { opacity: fadeAnim }
          ]}
        >
          <Surface style={styles.predictionsCard}>
            {loading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
            
            <FlatList
              data={predictions}
              renderItem={renderPredictionItem}
              keyExtractor={(item) => item.place_id}
              ItemSeparatorComponent={() => <Divider />}
              keyboardShouldPersistTaps="handled"
              style={styles.predictionsList}
            />
          </Surface>
        </Animated.View>
      )}
      
      {/* Modal de permissão de localização */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Surface style={styles.permissionModal}>
            <MaterialCommunityIcons name="map-marker-off" size={48} color="#F44336" style={styles.modalIcon} />
            <Text style={styles.modalTitle}>Permissão Necessária</Text>
            <Text style={styles.modalMessage}>
              Para usar sua localização atual, é necessário conceder permissão de acesso à localização.
            </Text>
            <Button
              mode="contained"
              onPress={() => setModalVisible(false)}
              style={styles.modalButton}
              labelStyle={styles.modalButtonLabel}
            >
              Entendi
            </Button>
          </Surface>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
  },
  locationButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    marginTop: 6,
  },
  locationButtonDisabled: {
    opacity: 0.5,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  predictionsContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  predictionsCard: {
    borderRadius: 4,
    elevation: 4,
    maxHeight: 200,
  },
  loadingContainer: {
    padding: 8,
    alignItems: 'center',
  },
  predictionsList: {
    maxHeight: 200,
  },
  predictionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  predictionText: {
    marginLeft: 12,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionModal: {
    padding: 24,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  modalIcon: {
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  modalButton: {
    width: '100%',
    borderRadius: 4,
  },
  modalButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
  }
});

export default AddressAutocomplete;