import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator, Modal, FlatList } from 'react-native';
import { TextInput, Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

// Utilitários
import { formatGoogleAddress, getAddressFromCoordinates } from '../utils/location';

const AddressInput = ({ 
  value, 
  onChange, 
  placeholder = 'Digite o endereço',
  label = 'Endereço',
  error,
  style,
  disabled = false
}) => {
  const theme = useTheme();
  
  // Estados
  const [inputValue, setInputValue] = useState(value || '');
  const [predictions, setPredictions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  
  // Efeito para sincronizar o valor externo com o interno
  useEffect(() => {
    setInputValue(value || '');
  }, [value]);
  
  // Atualizar o endereço quando o valor do input muda
  const handleInputChange = (text) => {
    setInputValue(text);
    
    if (text.length > 2) {
      // Se tiver mais de 2 caracteres, buscar sugestões
      fetchAddressSuggestions(text);
    } else {
      setPredictions([]);
      setShowSuggestions(false);
    }
  };
  
  // Buscar sugestões de endereço da API do Google
  const fetchAddressSuggestions = async (text) => {
    try {
      setLoading(true);
      
      // Verificar se temos API key do Google configurada
      const googleApiKey = Constants.manifest?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey) {
        console.warn('Google Places API Key não configurada. Sugestões de endereço não disponíveis.');
        return;
      }
      
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&types=address&language=pt_BR&key=${googleApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        setPredictions(data.predictions);
        setShowSuggestions(true);
      } else {
        setPredictions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões de endereço:', error);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Selecionar um endereço das sugestões
  const handleSelectAddress = async (prediction) => {
    try {
      setLoading(true);
      
      // Obter detalhes do endereço selecionado
      const googleApiKey = Constants.manifest?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey) {
        // Se não tem API key, apenas usar a descrição
        setInputValue(prediction.description);
        onChange(prediction.description);
        setShowSuggestions(false);
        return;
      }
      
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=address_component,geometry&key=${googleApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        // Formatar endereço
        const addressComponents = data.result.address_components;
        const geometry = data.result.geometry;
        
        // Atualizar input com endereço formatado
        setInputValue(prediction.description);
        
        // Passar dados completos para o callback
        onChange({
          formattedAddress: prediction.description,
          components: formatGoogleAddress(addressComponents),
          placeId: prediction.place_id,
          latitude: geometry?.location?.lat,
          longitude: geometry?.location?.lng
        });
      } else {
        // Fallback para descrição simples
        setInputValue(prediction.description);
        onChange(prediction.description);
      }
      
      // Fechar sugestões
      setShowSuggestions(false);
    } catch (error) {
      console.error('Erro ao selecionar endereço:', error);
      // Fallback para descrição simples
      setInputValue(prediction.description);
      onChange(prediction.description);
      setShowSuggestions(false);
    } finally {
      setLoading(false);
    }
  };
  
  // Obter endereço atual usando geolocalização
  const handleGetCurrentLocation = async () => {
    try {
      setGettingLocation(true);
      
      // Verificar permissões
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        alert('Precisamos de permissão para acessar sua localização');
        return;
      }
      
      // Obter localização atual
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced
      });
      
      // Converter coordenadas em endereço
      const address = await getAddressFromCoordinates(
        location.coords.latitude,
        location.coords.longitude
      );
      
      if (address) {
        // Atualizar input com endereço formatado
        const formattedAddress = address.formattedAddress;
        setInputValue(formattedAddress);
        
        // Passar dados completos para o callback
        onChange({
          formattedAddress,
          components: address,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      } else {
        alert('Não foi possível obter o endereço para sua localização');
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
      alert('Erro ao obter sua localização');
    } finally {
      setGettingLocation(false);
    }
  };
  
  // Renderizar item da lista de sugestões
  const renderSuggestionItem = ({ item }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleSelectAddress(item)}
    >
      <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} />
      <Text style={styles.suggestionText}>{item.description}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, style]}>
      <View style={styles.inputContainer}>
        <TextInput
          mode="outlined"
          label={label}
          value={inputValue}
          onChangeText={handleInputChange}
          placeholder={placeholder}
          error={!!error}
          disabled={disabled || gettingLocation}
          style={styles.input}
          onFocus={() => {
            if (inputValue.length > 2) {
              setShowSuggestions(true);
            }
          }}
          right={
            <TextInput.Icon
              icon={gettingLocation ? 'loading' : 'map-marker-circle'}
              color={theme.colors.primary}
              disabled={disabled || gettingLocation}
              onPress={handleGetCurrentLocation}
            />
          }
        />
        
        {loading && (
          <ActivityIndicator 
            style={styles.loadingIndicator} 
            size={20} 
            color={theme.colors.primary} 
          />
        )}
      </View>
      
      {error && <Text style={styles.errorText}>{error}</Text>}
      
      {/* Lista de sugestões */}
      <Modal
        visible={showSuggestions && predictions.length > 0}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuggestions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowSuggestions(false)}
        >
          <View style={styles.suggestionsList}>
            <FlatList
              data={predictions}
              renderItem={renderSuggestionItem}
              keyExtractor={(item) => item.place_id}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </TouchableOpacity>
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
  loadingIndicator: {
    position: 'absolute',
    right: 45,
    top: 20,
  },
  errorText: {
    color: '#F44336',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  suggestionsList: {
    backgroundColor: 'white',
    width: '90%',
    marginTop: 120,
    borderRadius: 8,
    elevation: 5,
    maxHeight: '70%',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  suggestionText: {
    marginLeft: 10,
    flex: 1,
  },
});

export default AddressInput;