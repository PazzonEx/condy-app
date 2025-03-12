// src/components/CondoAddressSearch.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Text,
  Dimensions,
  Platform
} from 'react-native';
import { TextInput, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// Serviços
import FirestoreService from '../services/firestore.service';

const { width } = Dimensions.get('window');
const DEBOUNCE_DELAY = 800;

const CondoAddressSearch = ({ 
  onSelectAddress, 
  initialValue = '', 
  placeholder = 'Buscar endereço do condomínio',
  style 
}) => {
  const theme = useTheme();
  const inputRef = useRef(null);
  
  // Estados
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [error, setError] = useState(null);
  
  // Timer para debounce
  const debounceTimer = useRef(null);

  // Efeito para solicitar permissão de localização
  useEffect(() => {
    requestLocationPermission();

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Solicitar permissão de localização
  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.log('Erro ao obter localização:', error);
    }
  };

  // Busca automática ao digitar
  const handleSearchInputChange = (text) => {
    setSearchQuery(text);
    
    // Limpar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Configurar novo timer para busca automática
    if (text.trim().length >= 3) {
      setLoading(true);
      debounceTimer.current = setTimeout(() => {
        searchPlaces(text);
      }, DEBOUNCE_DELAY);
    } else {
      setSearchResults([]);
      setLoading(false);
    }
  };

  // Limite o número de resultados na função searchPlaces
const searchPlaces = async (query) => {
  try {
    setError(null);
    // Obter API Key do Google Places
    const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
    
    if (!googleApiKey) {
      setError('Configuração de API do Google Places não encontrada');
      setLoading(false);
      return;
    }
    
    // Parâmetros de localização para priorizar resultados próximos
    const locationParam = userLocation ? 
      `&location=${userLocation.latitude},${userLocation.longitude}&radius=5000` : 
      '';
    
    // Filtrar por tipo (edifícios, estabelecimentos)
    const typeParam = '&types=establishment,premise,geocode';
    
    // URL da API
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}${typeParam}${locationParam}&key=${googleApiKey}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      console.warn('Google Places API erro:', data.status);
      setLoading(false);
      setError('Erro na busca de endereços');
      return;
    }
    
    // Formatar resultados com verificações de segurança
    const formattedResults = data.results
      .filter(place => place && place.place_id) // Filtra itens inválidos
      .map(place => ({
        placeId: place.place_id || '',
        name: place.name || 'Local sem nome',
        address: place.formatted_address || 'Endereço não disponível',
        latitude: place.geometry?.location?.lat || null,
        longitude: place.geometry?.location?.lng || null,
        isFromGoogle: true
      }))
      .slice(0, 5); // Limita a 5 resultados
    
    setSearchResults(formattedResults);
  } catch (error) {
    console.error('Erro na busca do Google Places:', error);
    setError('Erro ao buscar endereços');
  } finally {
    setLoading(false);
  }
};
  // Obter detalhes completos do local
  const getPlaceDetails = async (placeId) => {
    try {
      const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey || !placeId) {
        return null;
      }
      
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_component,formatted_address,name,geometry&key=${googleApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.result) {
        return null;
      }
      
      // Extrair componentes do endereço
      const result = data.result;
      const addressComponents = result.address_components || [];
      
      // Função para obter componente por tipo
      const getAddressComponent = (type) => {
        const component = addressComponents.find(comp => comp.types.includes(type));
        return component ? component.long_name : '';
      };
      
      // Função para obter componente abreviado por tipo
      const getShortAddressComponent = (type) => {
        const component = addressComponents.find(comp => comp.types.includes(type));
        return component ? component.short_name : '';
      };
      
      // Montar endereço detalhado
      const addressDetails = {
        street: getAddressComponent('route'),
        number: getAddressComponent('street_number'),
        neighborhood: getAddressComponent('sublocality_level_1') || getAddressComponent('sublocality'),
        city: getAddressComponent('administrative_area_level_2'),
        state: getShortAddressComponent('administrative_area_level_1'),
        postalCode: getAddressComponent('postal_code'),
        country: getAddressComponent('country'),
        formattedAddress: result.formatted_address,
        latitude: result.geometry?.location?.lat,
        longitude: result.geometry?.location?.lng,
        placeId: placeId,
        name: result.name
      };
      
      return addressDetails;
    } catch (error) {
      console.error('Erro ao obter detalhes do local:', error);
      return null;
    }
  };

// Selecionar um endereço
const handleSelectAddress = async (item) => {
  // Verificação de segurança
  if (!item || !item.placeId) {
    console.error('Item de endereço inválido:', item);
    return;
  }
  
  setLoading(true);
  
  try {
    // Obter detalhes completos do endereço selecionado
    const addressDetails = await getPlaceDetails(item.placeId);
    
    // Verificar se o condomínio já existe no sistema
    let existingCondo = null;
    
    // Buscar por placeId primeiro (mais preciso)
    if (item.placeId) {
      const condosByPlaceId = await FirestoreService.queryDocuments('condos', [
        { field: 'placeId', operator: '==', value: item.placeId }
      ]);
      
      if (condosByPlaceId && condosByPlaceId.length > 0) {
        existingCondo = condosByPlaceId[0];
      }
    }
    
    // Se não encontrou por placeId, tentar por coordenadas
    if (!existingCondo && addressDetails?.latitude && addressDetails?.longitude) {
      // Buscar condomínios com coordenadas similares (margem de erro pequena)
      const latPrecision = 0.0001; // Aproximadamente 10 metros
      const lonPrecision = 0.0001;
      
      const condosByLocation = await FirestoreService.queryDocuments('condos', [
        { field: 'address.latitude', operator: '>=', value: addressDetails.latitude - latPrecision },
        { field: 'address.latitude', operator: '<=', value: addressDetails.latitude + latPrecision },
        { field: 'address.longitude', operator: '>=', value: addressDetails.longitude - lonPrecision },
        { field: 'address.longitude', operator: '<=', value: addressDetails.longitude + lonPrecision }
      ]);
      
      if (condosByLocation && condosByLocation.length > 0) {
        existingCondo = condosByLocation[0];
      }
    }
    
    // Determinar o melhor nome para o condomínio
    let condoName = '';
    
    // Preferência 1: Usar o nome do local fornecido pelo Google (provavelmente o nome do condomínio)
    if (item.name && item.name.length > 3 && 
        !item.name.includes("R.") && 
        !item.name.includes("Rua") && 
        !item.name.includes("Av.") && 
        !item.name.includes("Avenida")) {
      condoName = item.name;
    } 
    // Preferência 2: Usar o nome do local dos detalhes
    else if (addressDetails?.name && addressDetails.name.length > 3 && 
             !addressDetails.name.includes("R.") && 
             !addressDetails.name.includes("Rua") && 
             !addressDetails.name.includes("Av.") && 
             !addressDetails.name.includes("Avenida")) {
      condoName = addressDetails.name;
    }
    // Preferência 3: Gerar nome baseado no endereço "Condomínio + (Rua/Bairro)"
    else {
      if (addressDetails?.street) {
        condoName = `Condomínio ${addressDetails.street}`;
        if (addressDetails.number) {
          condoName += `, ${addressDetails.number}`;
        }
      } else if (addressDetails?.neighborhood) {
        condoName = `Condomínio ${addressDetails.neighborhood}`;
      } else if (item.address) {
        // Extrair o primeiro componente do endereço (normalmente a rua)
        const addressParts = item.address.split(',');
        if (addressParts.length > 0) {
          condoName = `Condomínio ${addressParts[0].trim()}`;
        }
      }
    }
    
    // Se todas as tentativas falharem, usar um nome genérico
    if (!condoName || condoName.length < 4) {
      condoName = "Novo Condomínio";
    }
    
    // Montar objeto com todas as informações
    const result = {
      ...addressDetails,
      existingCondo: existingCondo,
      isNewCondo: !existingCondo,
      originalItem: item,
      suggestedName: condoName // Nome sugerido para o condomínio
    };
    
    // Chamar callback com o resultado
    if (onSelectAddress) {
      onSelectAddress(result);
    }
    
    // Limpar resultados e atualizar campo de busca
    setSearchResults([]);
    
    // Manter texto de busca com o endereço formatado para referência
    const displayText = item.address || addressDetails?.formattedAddress || '';
    setSearchQuery(displayText);
    
    // Force focus and blur to ensure the TextInput updates
    if (inputRef.current) {
      inputRef.current.blur();
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.blur();
        }
      }, 50);
    }
  } catch (error) {
    console.error('Erro ao selecionar endereço:', error);
  } finally {
    setLoading(false);
  }
};

  // Limpar busca
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    inputRef.current?.focus();
  };

  const renderResultItem = (item, index) => {
    // Verificação de segurança para evitar acessar propriedades de undefined
    if (!item) return null;
    
    return (
      <TouchableOpacity 
        style={styles.resultItem}
        onPress={() => handleSelectAddress(item)}
      >
        <MaterialCommunityIcons 
          name="map-marker" 
          size={24} 
          color={theme.colors.primary} 
          style={styles.resultIcon}
        />
        <View style={styles.resultTextContainer}>
          <Text style={styles.resultTitle} numberOfLines={1}>
            {item.name || 'Local sem nome'}
          </Text>
          <Text style={styles.resultAddress} numberOfLines={2}>
            {item.address || 'Endereço não disponível'}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };
  
  return (
    <View style={[styles.container, style]}>
      {/* Barra de busca */}
      <View style={styles.searchBarContainer}>
        <TextInput
          ref={inputRef}
          value={searchQuery}
          onChangeText={handleSearchInputChange}
          placeholder={placeholder}
          mode="outlined"
          left={<TextInput.Icon icon="magnify" color={theme.colors.primary} />}
          right={
            searchQuery ? (
              <TextInput.Icon 
                icon="close" 
                color="#757575" 
                onPress={clearSearch} 
              />
            ) : null
          }
          style={styles.searchInput}
        />
      </View>
      
      {/* Mensagem de erro */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      
      {/* Container para resultados da busca - mantém espaço mesmo quando vazio */}
      <View style={[
        styles.resultsWrapper,
        { minHeight: (searchResults.length > 0 || loading) ? 'auto' : 0 }
      ]}>
        {/* Indicador de carregamento */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Buscando endereços...</Text>
          </View>
        ) : (
          /* Resultados da busca */
          searchResults.length > 0 && (
            <View style={styles.resultsContainer}>
              {searchResults.map((item, index) => (
                <React.Fragment key={item.placeId || `result-${index}`}>
                  <TouchableOpacity 
                    style={styles.resultItem}
                    onPress={() => handleSelectAddress(item)}
                  >
                    <MaterialCommunityIcons 
                      name="map-marker" 
                      size={24} 
                      color={theme.colors.primary} 
                      style={styles.resultIcon}
                    />
                    <View style={styles.resultTextContainer}>
                      <Text style={styles.resultTitle} numberOfLines={1}>
                        {item.name || 'Local sem nome'}
                      </Text>
                      <Text style={styles.resultAddress} numberOfLines={2}>
                        {item.address || 'Endereço não disponível'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {index < searchResults.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </View>
          )
        )}
      </View>
      
      {/* Dicas de busca */}
      {searchQuery && searchResults.length === 0 && !loading && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Dicas de Busca:</Text>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="office-building" size={16} color={theme.colors.primary} />
            <Text style={styles.tipText}>Nome do condomínio + cidade</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
            <Text style={styles.tipText}>Endereço completo com número</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="map-search" size={16} color={theme.colors.primary} />
            <Text style={styles.tipText}>CEP do condomínio</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16, // Espaço abaixo do componente
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  resultsWrapper: {
    width: '100%',
    // Altura dinâmica baseada no conteúdo
    marginBottom: 8,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    elevation: 3,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    elevation: 3,
    // Sem position: absolute
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Máximo de 5 resultados
    maxHeight: 300,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  resultIcon: {
    marginRight: 12,
  },
  resultTextContainer: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  resultAddress: {
    fontSize: 14,
    color: '#757575',
  },
  tipsContainer: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginTop: 8,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#424242',
  }
});

export default CondoAddressSearch;