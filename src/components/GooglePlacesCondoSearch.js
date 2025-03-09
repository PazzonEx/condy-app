import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Text, Dimensions, Alert, Modal, Animated } from 'react-native';
import { TextInput, Chip, useTheme, Divider, IconButton, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';

// Componentes
import Button from '../components/Button';

// Serviços
import CondoSearchService from '../services/condo-search.service';
import FirestoreService from '../services/firestore.service';
import { useAuth } from '../hooks/useAuth';

// Constantes
const SCREEN_WIDTH = Dimensions.get('window').width;
const DEBOUNCE_DELAY = 300;

const GooglePlacesCondoSearch = ({ onSelectCondo, initialValue = '', style }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  // Estados
  const [searchQuery, setSearchQuery] = useState(initialValue);
  const [searchResults, setSearchResults] = useState([]);
  const [recentCondos, setRecentCondos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeSearchType, setActiveSearchType] = useState('all');
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);
  
  // Timer para debounce
  const debounceTimer = useRef(null);

  // Efeito para animação de entrada
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true
    }).start();
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
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        setLocationPermission(true);
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
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

  // Busca automática ao digitar
  const handleSearchInputChange = (text) => {
    setSearchQuery(text);
    
    // Limpar timer anterior
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Configurar novo timer para busca automática
    if (text.trim().length >= 2) {
      setIsSearching(true);
      debounceTimer.current = setTimeout(() => {
        performSearch(text);
      }, DEBOUNCE_DELAY);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  // Busca completa de condomínios
  const performSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    try {
      setLoading(true);
      
      // Parâmetros de busca avançada
      const searchParams = {
        query: query.trim(),
        maxResults: 20,
        onlyActive: true,
        userLocation,
        filterType: activeFilter,
        searchType: activeSearchType
      };
      
      // Usar serviço para busca
      const results = await CondoSearchService.searchCondos(searchParams);
      
      // Armazenar resultados
      setSearchResults(results);
      setIsSearching(true);
    } catch (error) {
      console.error('Erro na busca:', error);
      Alert.alert('Erro', 'Não foi possível realizar a busca. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Limpar busca
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    inputRef.current?.focus();
  };

  // Função para selecionar um condomínio
  const handleSelectCondoItem = (condo) => {
    // Verificar disponibilidade
    if (condo.fromGoogle && !condo.inSystem) {
      Alert.alert(
        'Condomínio não cadastrado',
        'Este condomínio ainda não está cadastrado no nosso aplicativo. No momento só atendemos condomínios já cadastrados.',
        [{ text: 'Entendi' }]
      );
      return;
    }
    
    // Condomínio válido
    onSelectCondo(condo);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  // Toggle menu de filtros
  const toggleFiltersMenu = () => {
    setShowFiltersMenu(!showFiltersMenu);
  };

  // Aplicar filtro
  const applyFilter = (filterType, searchType) => {
    if (filterType) setActiveFilter(filterType);
    if (searchType) setActiveSearchType(searchType);
    setShowFiltersMenu(false);
    
    // Reexecutar busca com novos filtros
    if (searchQuery.trim().length >= 2) {
      performSearch(searchQuery);
    }
  };

  // Menu de filtros
  const FiltersMenu = () => (
    <Modal
      visible={showFiltersMenu}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowFiltersMenu(false)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowFiltersMenu(false)}
      >
        <Surface style={styles.filtersMenu}>
          <Text style={styles.filtersTitle}>Opções de Busca</Text>
          
          <View style={styles.filtersSection}>
            <Text style={styles.filtersSectionTitle}>Buscar por:</Text>
            
            <TouchableOpacity 
              style={[styles.filterOption, activeSearchType === 'all' && styles.filterOptionActive]}
              onPress={() => applyFilter(null, 'all')}
            >
              <MaterialCommunityIcons 
                name="text-search" 
                size={20} 
                color={activeSearchType === 'all' ? theme.colors.primary : '#757575'} 
              />
              <Text style={[styles.filterOptionText, activeSearchType === 'all' && styles.filterOptionTextActive]}>
                Todos os campos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterOption, activeSearchType === 'name' && styles.filterOptionActive]}
              onPress={() => applyFilter(null, 'name')}
            >
              <MaterialCommunityIcons 
                name="office-building" 
                size={20} 
                color={activeSearchType === 'name' ? theme.colors.primary : '#757575'} 
              />
              <Text style={[styles.filterOptionText, activeSearchType === 'name' && styles.filterOptionTextActive]}>
                Nome do condomínio
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterOption, activeSearchType === 'address' && styles.filterOptionActive]}
              onPress={() => applyFilter(null, 'address')}
            >
              <MaterialCommunityIcons 
                name="map-marker" 
                size={20} 
                color={activeSearchType === 'address' ? theme.colors.primary : '#757575'} 
              />
              <Text style={[styles.filterOptionText, activeSearchType === 'address' && styles.filterOptionTextActive]}>
                Endereço
              </Text>
            </TouchableOpacity>
          </View>
          
          <Divider style={styles.filtersDivider} />
          
          <View style={styles.filtersSection}>
            <Text style={styles.filtersSectionTitle}>Exibir:</Text>
            
            <TouchableOpacity 
              style={[styles.filterOption, activeFilter === 'all' && styles.filterOptionActive]}
              onPress={() => applyFilter('all', null)}
            >
              <MaterialCommunityIcons 
                name="view-grid" 
                size={20} 
                color={activeFilter === 'all' ? theme.colors.primary : '#757575'} 
              />
              <Text style={[styles.filterOptionText, activeFilter === 'all' && styles.filterOptionTextActive]}>
                Todos os condomínios
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterOption, activeFilter === 'nearby' && styles.filterOptionActive]}
              onPress={() => {
                if (!locationPermission) {
                  requestLocationPermission();
                  setShowFiltersMenu(false);
                  return;
                }
                applyFilter('nearby', null);
              }}
            >
              <MaterialCommunityIcons 
                name="map-marker-radius" 
                size={20} 
                color={activeFilter === 'nearby' ? theme.colors.primary : '#757575'} 
              />
              <Text style={[styles.filterOptionText, activeFilter === 'nearby' && styles.filterOptionTextActive]}>
                Condomínios próximos
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.filterOption, activeFilter === 'recent' && styles.filterOptionActive]}
              onPress={() => applyFilter('recent', null)}
            >
              <MaterialCommunityIcons 
                name="history" 
                size={20} 
                color={activeFilter === 'recent' ? theme.colors.primary : '#757575'} 
              />
              <Text style={[styles.filterOptionText, activeFilter === 'recent' && styles.filterOptionTextActive]}>
                Condomínios recentes
              </Text>
            </TouchableOpacity>
          </View>
          
          <Button 
            mode="contained" 
            onPress={() => setShowFiltersMenu(false)}
            style={styles.closeFiltersButton}
          >
            Aplicar Filtros
          </Button>
        </Surface>
      </TouchableOpacity>
    </Modal>
  );

  // Renderizar item de condomínio
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
          <Text style={styles.condoName} numberOfLines={1}>{item.name}</Text>
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
          {item.distance !== null && (
            <View style={styles.distanceBadge}>
              <MaterialCommunityIcons name="map-marker-distance" size={12} color="#1E88E5" />
              <Text style={styles.distanceText}>
                {typeof item.distance === 'number' ? `${item.distance.toFixed(1)} km` : 'Distância desconhecida'}
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
          
          {item.isRecent && (
            <View style={styles.recentBadge}>
              <Text style={styles.recentBadgeText}>Recente</Text>
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

  // Renderizar resultados
  const renderResults = () => {
    // Determinar quais resultados mostrar
    let displayResults = [];
    
    if (isSearching) {
      // Mostrar resultados da busca
      displayResults = searchResults;
    } else if (activeFilter === 'recent') {
      // Mostrar condomínios recentes
      displayResults = recentCondos;
    }
    
    if (loading && displayResults.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Buscando condomínios...</Text>
        </View>
      );
    }
    
    if (isSearching && displayResults.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="magnify-close" size={40} color="#BDBDBD" />
          <Text style={styles.emptyText}>Nenhum condomínio encontrado</Text>
          <Text style={styles.emptySubtext}>Tente buscar por nome ou endereço</Text>
        </View>
      );
    }
    
    if (activeFilter === 'recent' && recentCondos.length === 0) {
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
        data={displayResults}
        renderItem={renderCondoItem}
        keyExtractor={item => item.id}
        ItemSeparatorComponent={() => <Divider />}
        contentContainerStyle={styles.resultsList}
        keyboardShouldPersistTaps="handled"
      />
    );
  };

  // Renderização principal com design modernizado
  return (
    <Animated.View 
      style={[
        styles.container, 
        style,
        { opacity: fadeAnim }
      ]}
    >
      {/* Cabeçalho de Busca */}
      <View style={styles.searchHeader}>
        <Text style={styles.searchTitle}>Encontre seu condomínio</Text>
        <Text style={styles.searchSubtitle}>
          {userLocation ? 'Usando sua localização atual' : 'Busque por nome ou endereço'}
        </Text>
      </View>
      
      {/* Barra de busca moderna */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.primary} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            value={searchQuery}
            onChangeText={handleSearchInputChange}
            placeholder="Nome ou endereço do condomínio"
            style={styles.searchInput}
            mode="flat"
            underlineColor="transparent"
            theme={{ colors: { primary: 'transparent', underlineColor: 'transparent' } }}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#757575" />
            </TouchableOpacity>
          ) : null}
        </View>
        
        <IconButton
          icon="tune"
          color={theme.colors.primary}
          size={24}
          style={styles.filterButton}
          onPress={toggleFiltersMenu}
        />
      </View>

      {/* Indicador de filtros ativos */}
      <View style={styles.activeFiltersContainer}>
        {activeFilter !== 'all' && (
          <Chip 
            mode="outlined" 
            style={styles.activeFilterChip}
            onClose={() => applyFilter('all', null)}
          >
            {activeFilter === 'nearby' ? 'Próximos' : 'Recentes'}
          </Chip>
        )}
        
        {activeSearchType !== 'all' && (
          <Chip 
            mode="outlined" 
            style={styles.activeFilterChip}
            onClose={() => applyFilter(null, 'all')}
          >
            {activeSearchType === 'name' ? 'Por nome' : 'Por endereço'}
          </Chip>
        )}
      </View>
      
      {/* Modal de Filtros */}
      <FiltersMenu />
      
      {/* Resultados da Busca */}
      <View style={styles.resultsContainer}>
        {renderResults()}
      </View>
      
      {/* Dicas de busca - mostradas apenas quando não há resultados ou busca */}
      {!isSearching && searchResults.length === 0 && recentCondos.length === 0 && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Dicas de Busca:</Text>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="office-building" size={18} color={theme.colors.primary} />
            <Text style={styles.tipText}>Nome exato do condomínio</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="map-marker" size={18} color={theme.colors.primary} />
            <Text style={styles.tipText}>Endereço ou CEP</Text>
          </View>
          <View style={styles.tipItem}>
            <MaterialCommunityIcons name="map-marker-radius" size={18} color={theme.colors.primary} />
            <Text style={styles.tipText}>Use o filtro "Próximos" para encontrar condomínios pela sua localização</Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  searchHeader: {
    marginBottom: 16,
  },
  searchTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
  },
  searchSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginTop: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    elevation: 3,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    fontSize: 16,
    paddingVertical: 8,
    height: 40,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    backgroundColor: '#F5F5F5',
    margin: 0,
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  activeFilterChip: {
    marginRight: 8,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersMenu: {
    width: '85%',
    padding: 20,
    borderRadius: 12,
    elevation: 4,
    backgroundColor: '#FFFFFF',
  },
  filtersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  filtersSection: {
    marginBottom: 16,
  },
  filtersSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#424242',
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  filterOptionActive: {
    backgroundColor: '#E3F2FD',
  },
  filterOptionText: {
    marginLeft: 12,
    fontSize: 15,
    color: '#424242',
  },
  filterOptionTextActive: {
    color: '#1976D2',
    fontWeight: '500',
  },
  filtersDivider: {
    marginVertical: 12,
  },
  closeFiltersButton: {
    marginTop: 8,
  },
  resultsContainer: {
    maxHeight: SCREEN_WIDTH * 1.2,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    elevation: 1,
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
  recentBadge: {
    backgroundColor: '#F3E5F5',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
    marginRight: 6,
    marginBottom: 2,
  },
  recentBadgeText: {
    fontSize: 12,
    color: '#9C27B0',
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
  tipsContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    elevation: 1,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  tipText: {
    marginLeft: 10,
    fontSize: 14,
    flex: 1,
  }
});

export default GooglePlacesCondoSearch;