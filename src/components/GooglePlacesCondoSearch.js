import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Dimensions, Alert } from 'react-native';
import { TextInput, Text, Chip, useTheme, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import Constants from 'expo-constants';

// Componentes
import Card from '../components/Card';
import Button from '../components/Button';

// Serviços
import CondoSearchService from '../services/condo-search.service';
import FirestoreService from '../services/firestore.service';
import { useAuth } from '../hooks/useAuth';
import { calculateDistance } from '../utils/location';

// Constantes
const SCREEN_WIDTH = Dimensions.get('window').width;
const DEBOUNCE_DELAY = 300; // ms
const COORDINATE_PRECISION = 4; // Casas decimais para comparação de coordenadas

const GooglePlacesCondoSearch = ({ onSelectCondo, initialValue = '', style }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const inputRef = useRef(null);
  
  // Estados
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [googleResults, setGoogleResults] = useState([]);
  const [firestoreResults, setFirestoreResults] = useState([]);
  const [recentCondos, setRecentCondos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [sessionToken, setSessionToken] = useState('');
  
  // Timer para debounce
  const debounceTimer = useRef(null);

  // Gerar token de sessão para Google Places
  useEffect(() => {
    // Token para agrupar solicitações relacionadas e reduzir custos de API
    setSessionToken(Math.random().toString(36).substring(2, 15));
  }, []);

  // Carregar condomínios recentes e solicitar permissão de localização
  useEffect(() => {
    loadRecentCondos();
    requestLocationPermission();
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [userProfile]);

  // Solicitar permissão de localização
  const requestLocationPermission = async () => {
    try {
      console.log("Solicitando permissão de localização...");
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log("Status da permissão:", status);
      
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        console.log("Localização obtida:", location.coords);
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude
        });
      }
    } catch (error) {
      console.error('Erro ao obter localização:', error);
    }
  };

  // Carregar condomínios recentes do usuário
  const loadRecentCondos = async () => {
    if (!userProfile?.id) return;
    
    try {
      setLoading(true);
      // Buscar histórico de acesso do motorista
      const recentAccess = await FirestoreService.queryDocuments(
        'access_requests',
        [{ field: 'driverId', operator: '==', value: userProfile.id }],
        { field: 'createdAt', direction: 'desc' },
        10
      );
      
      // Extrair condomínios únicos
      const condoIds = [...new Set(recentAccess.map(access => access.condoId))];
      
      // Buscar detalhes dos condomínios
      const condoDetails = await Promise.all(
        condoIds.map(id => FirestoreService.getDocument('condos', id))
      );
      
      // Filtrar nulos e adicionar flag de "recente"
      const validCondos = condoDetails
        .filter(condo => condo !== null)
        .map(condo => ({
          ...condo,
          isRecent: true,
          inSystem: true
        }));
      
      setRecentCondos(validCondos);
    } catch (error) {
      console.error('Erro ao carregar condomínios recentes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar todos os condomínios do sistema para comparação
  const getAllSystemCondos = async () => {
    try {
      const allCondos = await FirestoreService.getCollection('condos');
      return allCondos.filter(condo => 
        condo.latitude && condo.longitude // Filtrar apenas condomínios com coordenadas
      );
    } catch (error) {
      console.error('Erro ao buscar todos os condomínios:', error);
      return [];
    }
  };

  // Verificar se um condomínio está no sistema por coordenadas
  const isCondoInSystem = (place, systemCondos) => {
    if (!place.latitude || !place.longitude) return false;
    
    // Arredondar coordenadas para comparação
    const placeLat = place.latitude.toFixed(COORDINATE_PRECISION);
    const placeLng = place.longitude.toFixed(COORDINATE_PRECISION);
    
    // Verificar se existe algum condomínio com mesmas coordenadas
    return systemCondos.some(condo => {
      if (!condo.latitude || !condo.longitude) return false;
      
      const condoLat = condo.latitude.toFixed(COORDINATE_PRECISION);
      const condoLng = condo.longitude.toFixed(COORDINATE_PRECISION);
      
      return placeLat === condoLat && placeLng === condoLng;
    });
  };

  // Busca no Google Places com autocomplete
  const searchGooglePlaces = async (query) => {
    if (!query.trim() || query.trim().length < 2) return;
    
    try {
      const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey) {
        console.warn('Google Places API Key não configurada');
        return;
      }
      
      // Coordenadas para centralizar a busca (se disponível)
      const locationParam = userLocation ? 
        `&location=${userLocation.latitude},${userLocation.longitude}&radius=5000` : 
        '';
      
      // URL da API
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&premise${locationParam}&key=${googleApiKey}`;
      
      console.log("ESSA É A URL", url);
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status === 'OK') {
        
        // Obter todos os condomínios do sistema para comparação
        const systemCondos = await getAllSystemCondos();
        
        // Formatar resultados e verificar se já estão no sistema
        const formattedResults = data.results.map(place => {
          const inSystem = isCondoInSystem(
            {
              latitude: place.geometry?.location?.lat,
              longitude: place.geometry?.location?.lng
            },
            systemCondos
          );
          
          return {
            id: place.place_id,
            name: place.name,
            address: place.formatted_address,
            latitude: place.geometry?.location?.lat,
            longitude: place.geometry?.location?.lng,
            fromGoogle: true,
            inSystem: false,
            distance: null
          };
        });
        console.log("Resultados do Google Places ATUALIZADO :", formattedResults);

        
        setGoogleResults(formattedResults);
      } else {
        console.warn('Google Places API erro:', data.status);
      }
    } catch (error) {
      console.error('Erro na busca do Google Places:', error);
    }
  };

  // Busca no Firestore
  const searchFirestore = async (query) => {
    if (!query.trim() || query.trim().length < 2) return;
    
    try {
      // Parâmetros de busca
      const searchParams = {
        query,
        maxResults: 10,
        onlyActive: true,
        userLocation,
        filterType: activeFilter
      };
      
      console.log("parametros searchParams", searchParams);
      
      const results = await CondoSearchService.searchCondos(searchParams);
      
      // Adicionar distância se localização disponível
      if (userLocation) {
        const resultsWithDistance = results.map(condo => {
          if (condo.latitude && condo.longitude) {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              condo.latitude,
              condo.longitude
            );
            return { ...condo, distance };
          }
          return condo;
        });
        
        // Marcar como já cadastrados no sistema
        const markedResults = resultsWithDistance.map(condo => ({
          ...condo,
          inSystem: true
        }));
        
        setFirestoreResults(markedResults);
      } else {
        // Marcar como já cadastrados no sistema
        const markedResults = results.map(condo => ({
          ...condo,
          inSystem: true
        }));
        
        setFirestoreResults(markedResults);
      }
    } catch (error) {
      console.error('Erro na busca do Firestore:', error);
    }
  };

  // Função com debounce para busca durante digitação
  const handleSearchInputChange = (text) => {
    setSearchQuery(text);
    
    // Limpar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Configurar novo timer
    if (text.trim().length >= 2) {
      setIsSearching(true);
      debounceTimer.current = setTimeout(() => {
        searchGooglePlaces(text);
        searchFirestore(text);
      }, DEBOUNCE_DELAY);
    } else {
      setGoogleResults([]);
      setFirestoreResults([]);
      setIsSearching(false);
    }
  };

  // Busca completa (ao pressionar o botão de busca)
  const handleSearch = () => {
    if (searchQuery.trim().length < 2) return;
    
    setLoading(true);
    setIsSearching(true);
    
    // Executar ambas as buscas
    Promise.all([
      searchGooglePlaces(searchQuery),
      searchFirestore(searchQuery)
    ]).finally(() => {
      setLoading(false);
    });
  };

  // Limpar busca
  const clearSearch = () => {
    setSearchQuery('');
    setGoogleResults([]);
    setFirestoreResults([]);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  // Selecionar um condomínio
  const handleSelectCondoItem = async (condo) => {
    // Verificar se o condomínio vem do Google Places e não está no sistema
    const isExternalCondo = condo.fromGoogle && !condo.inSystem;
    
    if (isExternalCondo) {
      // Mostrar alerta informando que o condomínio não está no sistema e bloquear o prosseguimento
      Alert.alert(
        'Condomínio não cadastrado',
        'Este condomínio ainda não está cadastrado no nosso aplicativo. No momento só atendemos condomínios já cadastrados.',
        [{ text: 'Entendi' }]
      );
      // Não limpa a interface e não chama o callback onSelectCondo
      return;
    } else {
      // Condomínio já cadastrado no sistema - pode prosseguir normalmente
      setSearchQuery('');
      setGoogleResults([]);
      setFirestoreResults([]);
      setIsSearching(false);
      onSelectCondo(condo);
    }
  };

  // Renderizar chips de filtro
  const renderFilterChips = () => (
    <View style={styles.filterContainer}>
      <Chip
        selected={activeFilter === 'all'}
        onPress={() => setActiveFilter('all')}
        style={styles.filterChip}
      >
        Todos
      </Chip>
      
      <Chip
        selected={activeFilter === 'nearby'}
        onPress={() => {
          if (!locationPermission) {
            requestLocationPermission();
            return;
          }
          setActiveFilter('nearby');
        }}
        style={styles.filterChip}
      >
        Próximos
      </Chip>
      
      <Chip
        selected={activeFilter === 'recent'}
        onPress={() => setActiveFilter('recent')}
        style={styles.filterChip}
      >
        Recentes
      </Chip>
    </View>
  );

  // Renderizar item de condomínio na lista
  const renderCondoItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.condoItem,
        item.fromGoogle && !item.inSystem && styles.externalCondoItem
      ]}
      onPress={() => handleSelectCondoItem(item)}
    >
      <View style={[
        styles.condoIconContainer,
        item.verified && styles.verifiedCondoIcon,
        item.inSystem && styles.inSystemCondoIcon,
        item.isRecent && styles.recentCondoIcon,
        item.fromGoogle && !item.inSystem && styles.externalCondoIcon
      ]}>
        <MaterialCommunityIcons 
          name="office-building" 
          size={24} 
          color="#fff" 
        />
      </View>
      <View style={styles.condoDetails}>
        <View style={styles.condoNameContainer}>
          <Text style={styles.condoName}>{item.name}</Text>
          {item.verified && (
            <MaterialCommunityIcons 
              name="check-circle" 
              size={16} 
              color={theme.colors.primary} 
              style={styles.verifiedIcon} 
            />
          )}
        </View>
        <Text style={styles.condoAddress} numberOfLines={2}>
          {item.address}
        </Text>
        <View style={styles.condoBadgeContainer}>
          {item.distance && (
            <View style={styles.distanceBadge}>
              <MaterialCommunityIcons name="map-marker-distance" size={12} color="#1E88E5" />
              <Text style={styles.distanceText}>
                {item.distance.toFixed(1)} km
              </Text>
            </View>
          )}
          {item.inSystem && (
            <View style={styles.inSystemBadge}>
              <Text style={styles.inSystemBadgeText}>Disponível</Text>
            </View>
          )}
          {item.fromGoogle && !item.inSystem && (
            <View style={styles.notAvailableBadge}>
              <Text style={styles.notAvailableBadgeText}>Não disponível</Text>
            </View>
          )}
        </View>
      </View>
      <MaterialCommunityIcons 
        name={item.fromGoogle && !item.inSystem ? "close-circle" : "chevron-right"} 
        size={24} 
        color={item.fromGoogle && !item.inSystem ? "#D32F2F" : "#757575"} 
      />
    </TouchableOpacity>
  );

  // Renderizar resultados combinados (Google + Firestore)
  const renderCombinedResults = () => {
    // Combinando resultados sem duplicatas (prioridade para Firestore)
    const firestorePlaceIds = firestoreResults.map(item => item.id);
    const filteredGoogleResults = googleResults.filter(
      item => !firestorePlaceIds.includes(item.id)
    );
    
    // Ordenar por distância se filtro for "nearby"
    let combinedResults = [...firestoreResults, ...filteredGoogleResults];
    if (activeFilter === 'nearby' && userLocation) {
      combinedResults.sort((a, b) => {
        // Prioridade para itens com distância
        const distA = a.distance !== undefined && a.distance !== null ? a.distance : Infinity;
        const distB = b.distance !== undefined && b.distance !== null ? b.distance : Infinity;
        return distA - distB;
      });
    }
    
    if (loading && combinedResults.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Buscando condomínios...</Text>
        </View>
      );
    }
    
    if (isSearching && combinedResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify-close" size={40} color="#BDBDBD" />
          <Text style={styles.emptyText}>Nenhum condomínio encontrado</Text>
          <Text style={styles.emptySubtext}>Tente buscar por nome ou endereço</Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={combinedResults}
        renderItem={renderCondoItem}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.resultsList}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          isSearching ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="magnify-close" size={40} color="#BDBDBD" />
              <Text style={styles.emptyText}>Nenhum condomínio encontrado</Text>
              <Text style={styles.emptySubtext}>Tente buscar por nome ou endereço</Text>
            </View>
          ) : null
        }
      />
    );
  };

  // Renderizar condomínios recentes
  const renderRecentCondos = () => {
    if (recentCondos.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="history" size={40} color="#BDBDBD" />
          <Text style={styles.emptyText}>Nenhum condomínio recente</Text>
          <Text style={styles.emptySubtext}>
            Seus condomínios recentes aparecerão aqui
          </Text>
        </View>
      );
    }
    
    return (
      <FlatList
        data={recentCondos}
        renderItem={renderCondoItem}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.resultsList}
      />
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.searchContainer}>
        <TextInput
          ref={inputRef}
          mode="outlined"
          value={searchQuery}
          onChangeText={handleSearchInputChange}
          placeholder="Buscar condomínio por nome ou endereço"
          onSubmitEditing={handleSearch}
          style={styles.searchInput}
          left={<TextInput.Icon icon="magnify" />}
          right={
            searchQuery ? (
              <TextInput.Icon icon="close" onPress={clearSearch} />
            ) : null
          }
        />
        <Button 
          mode="contained" 
          onPress={handleSearch}
          style={styles.searchButton}
          loading={loading}
          disabled={loading || searchQuery.trim().length < 2}
        >
          Buscar
        </Button>
      </View>
      
      {renderFilterChips()}
      
      <View style={styles.resultsContainer}>
        {(activeFilter === 'recent' && !isSearching) 
          ? renderRecentCondos() 
          : renderCombinedResults()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    marginRight: 8,
  },
  searchButton: {
    marginVertical: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  resultsContainer: {
    maxHeight: SCREEN_WIDTH * 1.2, // Altura proporcional à largura da tela
  },
  resultsList: {
    paddingBottom: 8,
  },
  condoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  externalCondoItem: {
    opacity: 0.7,
    backgroundColor: '#FFEBEE',
  },
  condoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#757575',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  verifiedCondoIcon: {
    backgroundColor: '#4CAF50',
  },
  inSystemCondoIcon: {
    backgroundColor: '#607D8B',
  },
  recentCondoIcon: {
    backgroundColor: '#9C27B0',
  },
  externalCondoIcon: {
    backgroundColor: '#D32F2F',
  },
  condoDetails: {
    flex: 1,
  },
  condoNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  condoName: {
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 4,
    flex: 1,
  },
  condoAddress: {
    fontSize: 14,
    color: '#757575',
    marginTop: 2,
  },
  verifiedIcon: {
    marginLeft: 4,
  },
  condoBadgeContainer: {
    flexDirection: 'row',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 2,
  },
  distanceText: {
    fontSize: 12,
    color: '#1E88E5',
    marginLeft: 2,
  },
  inSystemBadge: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 2,
  },
  inSystemBadgeText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  notAvailableBadge: {
    backgroundColor: '#FFEBEE',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: '#D32F2F',
  },
  notAvailableBadgeText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: 'bold',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  loadingText: {
    marginTop: 8,
    color: '#757575',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptySubtext: {
    marginTop: 4,
    color: '#757575',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
});

export default GooglePlacesCondoSearch;