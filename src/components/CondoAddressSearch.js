// src/components/CondoAddressSearch.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Text,
  Dimensions,
  Platform,
  Alert
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
  const [hasSearched, setHasSearched] = useState(false);
  
  // Timer para debounce
  const debounceTimer = useRef(null);

  // Efeito para solicitar permissão de localização
  useEffect(() => {
    requestLocationPermission();

    // Limpar timer ao desmontar
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
        
        console.log("Localização obtida:", location.coords);
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      } else {
        console.log("Permissão de localização negada");
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
    }
  };

  // Limpar busca
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setHasSearched(false);
    inputRef.current?.focus();
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

  // Busca no Google Places API
  const searchPlaces = async (query) => {
    try {
      setError(null);
      console.log("Iniciando busca de endereço para:", query);
      
      // Obter API Key do Google Places
      const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey) {
        console.warn('Configuração de API do Google Places não encontrada');
        setError('Configuração de API não encontrada');
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
      
      console.log("Buscando em:", url);
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.warn('Google Places API erro:', data.status);
        setError('Erro na busca de endereços');
        setLoading(false);
        return;
      }
      
      console.log(`${data.results.length} resultados encontrados`);
      
      // Verificar se há condomínios existentes no Firestore com esses endereços
      const results = await Promise.all(data.results.map(async (place) => {
        // Verificar se já existe um condomínio com este placeId
        const existingCondo = await checkExistingCondo(place.place_id);
        
        return {
          placeId: place.place_id || '',
          name: place.name || 'Local sem nome',
          formattedAddress: place.formatted_address || 'Endereço não disponível',
          latitude: place.geometry?.location?.lat || null,
          longitude: place.geometry?.location?.lng || null,
          existingCondo: !!existingCondo,
          // Extrair componentes do endereço
          ...extractAddressComponents(place.formatted_address)
        };
      }));
      
      setSearchResults(results);
      setHasSearched(true);
    } catch (error) {
      console.error('Erro na busca do Google Places:', error);
      setError('Erro ao buscar endereços. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  // Verificar se já existe um condomínio cadastrado com este placeId
  const checkExistingCondo = async (placeId) => {
    try {
      if (!placeId) return null;
      
      const condos = await FirestoreService.queryDocuments(
        'condos', 
        [{ field: 'placeId', operator: '==', value: placeId }]
      );
      
      return condos.length > 0 ? condos[0] : null;
    } catch (error) {
      console.error('Erro ao verificar condomínio existente:', error);
      return null;
    }
  };

  // Extrair componentes do endereço formatado
  const extractAddressComponents = (formattedAddress) => {
    if (!formattedAddress) return {};
    
    let components = {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      postalCode: '',
      suggestedName: ''
    };
    
    try {
      // Dividir o endereço por vírgulas
      const parts = formattedAddress.split(',').map(part => part.trim());
      
      // Lógica para Brasil
      if (parts.length >= 3) {
        // Primeira parte geralmente é Rua e número
        const streetPart = parts[0];
        
        // Tentar extrair o número
        const numberMatch = streetPart.match(/,?\s*(\d+)\s*$/);
        if (numberMatch) {
          components.number = numberMatch[1];
          components.street = streetPart.replace(numberMatch[0], '').trim();
        } else {
          components.street = streetPart;
        }
        
        // Segunda parte geralmente é o bairro
        if (parts.length > 1) {
          components.neighborhood = parts[1];
        }
        
        // Cidade, Estado e CEP geralmente estão nas últimas partes
        if (parts.length > 2) {
          // Verificar se a última parte contém o CEP
          const lastPart = parts[parts.length - 1];
          const cepMatch = lastPart.match(/(\d{5}[-\s]?\d{3})/);
          
          if (cepMatch) {
            components.postalCode = cepMatch[1].replace(/\s/g, '-');
            parts[parts.length - 1] = lastPart.replace(cepMatch[0], '').trim();
          }
          
          // A penúltima parte geralmente é Cidade - Estado
          if (parts.length > 2) {
            const cityStatePart = parts[parts.length - 2];
            const stateMatch = cityStatePart.match(/\s([A-Z]{2})$/);
            
            if (stateMatch) {
              components.state = stateMatch[1];
              components.city = cityStatePart.replace(stateMatch[0], '').trim();
            } else {
              components.city = cityStatePart;
            }
          }
        }
        
        // Sugerir nome do condomínio baseado no endereço
        if (components.street) {
          const streetParts = components.street.split(' ');
          if (streetParts.length > 2) {
            // Remover prefixos comuns de rua
            const prefixes = ['Rua', 'Avenida', 'Av.', 'Alameda', 'Al.', 'Travessa', 'Rodovia', 'Rod.'];
            if (prefixes.includes(streetParts[0])) {
              components.suggestedName = `Cond. ${streetParts.slice(1).join(' ')}`;
            } else {
              components.suggestedName = `Cond. ${components.street}`;
            }
          } else {
            components.suggestedName = `Condomínio ${components.street}`;
          }
        }
      }
      
      return components;
    } catch (error) {
      console.error('Erro ao extrair componentes do endereço:', error);
      return components;
    }
  };

  // Selecionar um endereço
  const handleSelectAddress = async (address) => {
    try {
      console.log("Endereço selecionado:", address);
      
      // Verificar se já existe um condomínio cadastrado neste endereço
      if (address.existingCondo) {
        Alert.alert(
          "Condomínio já cadastrado",
          "Este endereço já está registrado como um condomínio no nosso sistema.",
          [{ text: "OK" }]
        );
        return;
      }
      
      // Se tiver placeId, obter detalhes completos
      if (address.placeId) {
        console.log("Obtendo detalhes completos para placeId:", address.placeId);
        const details = await getPlaceDetails(address.placeId);
        
        if (details) {
          console.log("Detalhes obtidos:", details);
          
          // Mesclar os detalhes com os dados do endereço atual
          const completeAddress = {
            ...address,
            ...details,
            formattedAddress: details.formattedAddress || address.formattedAddress
          };
          
          // Chamar o callback com os dados completos
          onSelectAddress(completeAddress);
          
          // Limpar a busca
          setSearchQuery('');
          setSearchResults([]);
          return;
        }
      }
      
      // Se não conseguir obter detalhes completos, usar os dados disponíveis
      onSelectAddress(address);
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Erro ao selecionar endereço:', error);
      setError('Erro ao selecionar endereço');
    }
  };

  // Obter detalhes completos do lugar pelo placeId
  const getPlaceDetails = async (placeId) => {
    try {
      const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey || !placeId) {
        return null;
      }
      
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=address_component,formatted_address,name,geometry&key=${googleApiKey}`;
      
      console.log("Buscando detalhes em:", url);
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK' || !data.result) {
        console.warn("Erro ao obter detalhes:", data.status);
        return null;
      }
      
      // Extrair componentes do endereço
      const result = data.result;
      const components = result.address_components || [];
      
      // Função para obter componente por tipo
      const getComponent = (type) => {
        const comp = components.find(c => c.types.includes(type));
        return comp ? comp.long_name : '';
      };
      
      // Função para obter abreviação do componente
      const getShortComponent = (type) => {
        const comp = components.find(c => c.types.includes(type));
        return comp ? comp.short_name : '';
      };
      
      // Extrair detalhes do endereço
      const details = {
        street: getComponent('route') || '',
        number: getComponent('street_number') || '',
        neighborhood: getComponent('sublocality_level_1') || getComponent('sublocality') || '',
        city: getComponent('administrative_area_level_2') || '',
        state: getShortComponent('administrative_area_level_1') || '',
        postalCode: getComponent('postal_code') || '',
        formattedAddress: result.formatted_address || '',
        latitude: result.geometry?.location?.lat || null,
        longitude: result.geometry?.location?.lng || null,
        placeId,
        name: result.name || '',
        suggestedName: result.name
      };
      
      return details;
    } catch (error) {
      console.error('Erro ao obter detalhes do lugar:', error);
      return null;
    }
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
      
      {/* Container para resultados da busca */}
      {(loading || searchResults.length > 0) && (
        <View style={styles.resultsContainer}>
          {/* Indicador de carregamento */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={styles.loadingText}>Buscando endereços...</Text>
            </View>
          ) : (
            /* Resultados da busca */
            searchResults.map((address, index) => (
              <React.Fragment key={address.placeId || `result-${index}`}>
                <TouchableOpacity 
                  style={[
                    styles.resultItem,
                    address.existingCondo && styles.disabledResultItem
                  ]}
                  onPress={() => handleSelectAddress(address)}
                  disabled={address.existingCondo}
                >
                  <MaterialCommunityIcons 
                    name={address.existingCondo ? "home-alert" : "map-marker"} 
                    size={24} 
                    color={address.existingCondo ? "#F44336" : theme.colors.primary} 
                    style={styles.resultIcon}
                  />
                  <View style={styles.resultTextContainer}>
                    <Text style={styles.resultTitle} numberOfLines={1}>
                      {address.name || address.suggestedName || 'Endereço'}
                    </Text>
                    <Text style={styles.resultAddress} numberOfLines={2}>
                      {address.formattedAddress || ''}
                    </Text>
                    {address.existingCondo && (
                      <Text style={styles.existingCondoText}>
                        Condomínio já cadastrado
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
                {index < searchResults.length - 1 && <Divider />}
              </React.Fragment>
            ))
          )}
        </View>
      )}
      
      {/* Dicas de busca */}
      {!loading && searchResults.length === 0 && hasSearched && (
        <View style={styles.noResultsContainer}>
          <MaterialCommunityIcons name="information-outline" size={36} color="#BDBDBD" />
          <Text style={styles.noResultsText}>Nenhum endereço encontrado</Text>
          <Text style={styles.noResultsSubtext}>
            Tente buscar pelo nome do condomínio, rua ou CEP
          </Text>
        </View>
      )}
      
      {!loading && searchResults.length === 0 && !hasSearched && searchQuery.length > 0 && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Dicas de Busca:</Text>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="office-building" size={16} color={theme.colors.primary} />
            <Text style={styles.tipText}>Nome do condomínio</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="map-marker" size={16} color={theme.colors.primary} />
            <Text style={styles.tipText}>Endereço completo</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="zip-box" size={16} color={theme.colors.primary} />
            <Text style={styles.tipText}>CEP</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 16,
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
  errorText: {
    color: '#F44336',
    fontSize: 14,
  },
  resultsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxHeight: 300,
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'center',
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  disabledResultItem: {
    opacity: 0.7,
    backgroundColor: '#F5F5F5',
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
    marginBottom: 4,
  },
  resultAddress: {
    fontSize: 14,
    color: '#757575',
  },
  existingCondoText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 4,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
    marginBottom: 4,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  tipsContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    marginBottom: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#757575',
  }
});

export default CondoAddressSearch;