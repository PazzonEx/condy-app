// src/services/condo-search.service.js
import FirestoreService from './firestore.service';
import { auth } from '../config/firebase';
import { calculateDistance } from '../utils/location';
import Constants from 'expo-constants';

const CondoSearchService = {
  /**
   * Busca avançada de condomínios com múltiplos métodos de identificação
   * @param {Object} searchParams - Parâmetros de busca
   * @returns {Promise<Array>} Lista de condomínios encontrados
   */
  async searchCondos(searchParams = {}) {
    try {
      console.log("Iniciando busca de condomínios:", searchParams);
      
      const {
        query = '',
        maxResults = 10,
        onlyActive = true,
        userLocation = null,
        filterType = 'all',
        searchType = 'all', // 'all', 'name', 'address', 'id'
      } = searchParams;

      // Estratégia 1: Buscar por placeId se parece ser um ID do Google Places
      if (query.length > 20 && query.includes('-')) {
        const condoByPlaceId = await this.findCondoByPlaceId(query);
        if (condoByPlaceId) {
          return [condoByPlaceId];
        }
      }

      // Estratégia 2: Buscar no Firestore
      let firestoreResults = await this.searchFirestoreCondos(query, onlyActive);
      
      // Aplicar filtros adicionais baseados no searchType
      if (searchType === 'name') {
        firestoreResults = firestoreResults.filter(condo => 
          (condo.name || '').toLowerCase().includes(query.toLowerCase())
        );
      } else if (searchType === 'address') {
        firestoreResults = firestoreResults.filter(condo => 
          (condo.address || '').toLowerCase().includes(query.toLowerCase())
        );
      }

      // Adicionar distância se localização do usuário estiver disponível
      if (userLocation) {
        firestoreResults = this.addDistanceToCondos(firestoreResults, userLocation);
        
        // Ordenar por distância se filtro for "nearby"
        if (filterType === 'nearby') {
          firestoreResults.sort((a, b) => {
            const distA = a.distance !== undefined ? a.distance : Infinity;
            const distB = b.distance !== undefined ? b.distance : Infinity;
            return distA - distB;
          });
        }
      }
      
      // Estratégia 3: Se poucos resultados e não é um ID específico, complementar com Google Places
      if (firestoreResults.length < 3 && searchType !== 'id' && query.length > 3) {
        const googleResults = await this.searchGooglePlaces(query, userLocation);
        
        // Remover duplicatas (comparando por placeId, nome+endereço, ou coordenadas)
        const combinedResults = this.mergeSearchResults(firestoreResults, googleResults);
        
        // Ordenar resultados
        return this.sortSearchResults(combinedResults, filterType, maxResults);
      }
      
      // Ordenação padrão e limite de resultados
      return this.sortSearchResults(firestoreResults, filterType, maxResults);
    } catch (error) {
      console.error('Erro na busca de condomínios:', error);
      return [];
    }
  },

  /**
   * Busca condomínios no Firestore
   * @param {string} query - Termo de busca
   * @param {boolean} onlyActive - Filtrar apenas condomínios ativos
   * @returns {Promise<Array>} Lista de condomínios
   */
  async searchFirestoreCondos(query, onlyActive = true) {
    // Buscar todos os condomínios
    const allCondos = await FirestoreService.getCollection('condos');
    
    // Aplicar filtros
    return allCondos.filter(condo => {
      // Filtro de status ativo
      if (onlyActive && condo.status !== 'active') return false;
      
      // Busca textual (nome, endereço, ID)
      if (query.trim()) {
        const queryTerms = query.toLowerCase().trim().split(/\s+/);
        const condoName = (condo.name || '').toLowerCase();
        const condoAddress = (condo.address || '').toLowerCase();
        const condoId = (condo.id || '').toLowerCase();
        
        // Verificar se todos os termos estão presentes em algum campo
        return queryTerms.every(term => 
          condoName.includes(term) || 
          condoAddress.includes(term) || 
          condoId.includes(term) ||
          (condo.placeId && condo.placeId.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  },

  /**
   * Busca condomínio por Place ID
   * @param {string} placeId - ID do Google Places
   * @returns {Promise<Object|null>} Condomínio encontrado ou null
   */
  async findCondoByPlaceId(placeId) {
    try {
      // Verificar se é um placeId válido
      if (!placeId || typeof placeId !== 'string') return null;
      
      const condos = await FirestoreService.queryDocuments(
        'condos',
        [{ field: 'placeId', operator: '==', value: placeId }]
      );
      
      return condos.length > 0 ? { ...condos[0], inSystem: true } : null;
    } catch (error) {
      console.error('Erro ao buscar condomínio por placeId:', error);
      return null;
    }
  },

  /**
   * Adiciona informação de distância aos condomínios
   * @param {Array} condos - Lista de condomínios
   * @param {Object} userLocation - Localização do usuário {latitude, longitude}
   * @returns {Array} Condomínios com distância calculada
   */
  addDistanceToCondos(condos, userLocation) {
    return condos.map(condo => {
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
  },

  /**
   * Busca no Google Places API
   * @param {string} query - Termo de busca
   * @param {Object} userLocation - Localização do usuário (opcional)
   * @returns {Promise<Array>} Lista de resultados do Google Places
   */
  async searchGooglePlaces(query, userLocation = null) {
    try {
      const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey) {
        console.warn('Google Places API Key não configurada');
        return [];
      }
      
      // Coordenadas para centralizar a busca (se disponível)
      const locationParam = userLocation ? 
        `&location=${userLocation.latitude},${userLocation.longitude}&radius=5000` : 
        '';
      
      // URL da API - usando textSearch para melhor corresponder a nomes de condomínios
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&type=premise,establishment${locationParam}&key=${googleApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        console.warn('Google Places API erro:', data.status);
        return [];
      }
      
      // Obter todos os condomínios do sistema para comparação
      const systemCondos = await this.getAllSystemCondos();
      
      // Formatar resultados e verificar se já estão no sistema
      return data.results.map(place => {
        // Verificar se já existe no sistema
        const existingCondo = this.findMatchingSystemCondo(place, systemCondos);
        
        return {
          id: existingCondo ? existingCondo.id : place.place_id,
          name: place.name,
          address: place.formatted_address,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          placeId: place.place_id,
          fromGoogle: true,
          inSystem: !!existingCondo,
          distance: null,
          // Se já existe no sistema, manter o ID original
          ...(existingCondo || {})
        };
      });
    } catch (error) {
      console.error('Erro na busca do Google Places:', error);
      return [];
    }
  },

  /**
   * Busca todos os condomínios do sistema
   * @returns {Promise<Array>} Lista de condomínios
   */
  async getAllSystemCondos() {
    try {
      const allCondos = await FirestoreService.getCollection('condos');
      return allCondos.filter(condo => 
        condo.status === 'active' && 
        (condo.latitude || condo.placeId) // Filtrar apenas condomínios com coordenadas ou placeId
      );
    } catch (error) {
      console.error('Erro ao buscar todos os condomínios:', error);
      return [];
    }
  },

  /**
   * Encontra condomínio correspondente no sistema
   * @param {Object} place - Local do Google Places
   * @param {Array} systemCondos - Condomínios do sistema
   * @returns {Object|null} Condomínio correspondente ou null
   */
  findMatchingSystemCondo(place, systemCondos) {
    // Estratégia 1: Verificar pelo placeId
    if (place.place_id) {
      const matchByPlaceId = systemCondos.find(condo => 
        condo.placeId === place.place_id
      );
      if (matchByPlaceId) return matchByPlaceId;
    }
    
    // Estratégia 2: Verificar por coordenadas (com precisão limitada)
    if (place.geometry?.location?.lat && place.geometry?.location?.lng) {
      const COORDINATE_PRECISION = 4; // Casas decimais para comparação
      const placeLat = place.geometry.location.lat.toFixed(COORDINATE_PRECISION);
      const placeLng = place.geometry.location.lng.toFixed(COORDINATE_PRECISION);
      
      const matchByCoordinates = systemCondos.find(condo => {
        if (!condo.latitude || !condo.longitude) return false;
        
        const condoLat = condo.latitude.toFixed(COORDINATE_PRECISION);
        const condoLng = condo.longitude.toFixed(COORDINATE_PRECISION);
        
        return placeLat === condoLat && placeLng === condoLng;
      });
      
      if (matchByCoordinates) return matchByCoordinates;
    }
    
    // Estratégia 3: Verificar por nome e endereço similar
    if (place.name && place.formatted_address) {
      const placeName = place.name.toLowerCase();
      const placeAddress = place.formatted_address.toLowerCase();
      
      // Critérios para considerar um match:
      // 1. Nome exato + endereço parcial, ou
      // 2. Nome parcial + endereço exato
      
      const matchByNameAndAddress = systemCondos.find(condo => {
        const condoName = (condo.name || '').toLowerCase();
        const condoAddress = (condo.address || '').toLowerCase();
        
        const nameExactMatch = condoName === placeName;
        const namePartialMatch = condoName.includes(placeName) || placeName.includes(condoName);
        
        const addressExactMatch = condoAddress === placeAddress;
        const addressPartialMatch = condoAddress.includes(placeAddress) || placeAddress.includes(condoAddress);
        
        return (nameExactMatch && addressPartialMatch) || (namePartialMatch && addressExactMatch);
      });
      
      if (matchByNameAndAddress) return matchByNameAndAddress;
    }
    
    return null;
  },

  /**
   * Mescla resultados de diferentes fontes removendo duplicatas
   * @param {Array} firestoreResults - Resultados do Firestore
   * @param {Array} googleResults - Resultados do Google Places
   * @returns {Array} Resultados combinados sem duplicatas
   */
  mergeSearchResults(firestoreResults, googleResults) {
    // Manter todos os resultados do Firestore
    const combinedResults = [...firestoreResults];
    
    // Adicionar resultados do Google Places que não existem no Firestore
    for (const googleResult of googleResults) {
      // Verificar duplicatas por ID
      const duplicateById = combinedResults.some(item => 
        item.id === googleResult.id || 
        (item.placeId && item.placeId === googleResult.placeId)
      );
      
      if (!duplicateById) {
        // Verificar duplicatas por nome e endereço
        const duplicateByNameAndAddress = combinedResults.some(item => 
          item.name === googleResult.name && 
          item.address === googleResult.address
        );
        
        if (!duplicateByNameAndAddress) {
          // Verificar duplicatas por coordenadas
          const duplicateByCoordinates = combinedResults.some(item => {
            if (!item.latitude || !item.longitude || 
                !googleResult.latitude || !googleResult.longitude) {
              return false;
            }
            
            const COORDINATE_PRECISION = 4;
            return item.latitude.toFixed(COORDINATE_PRECISION) === googleResult.latitude.toFixed(COORDINATE_PRECISION) &&
                  item.longitude.toFixed(COORDINATE_PRECISION) === googleResult.longitude.toFixed(COORDINATE_PRECISION);
          });
          
          if (!duplicateByCoordinates) {
            combinedResults.push(googleResult);
          }
        }
      }
    }
    
    return combinedResults;
  },

  /**
   * Ordena e limita os resultados da busca
   * @param {Array} results - Resultados da busca
   * @param {string} filterType - Tipo de filtro ('all', 'nearby', 'recent')
   * @param {number} maxResults - Número máximo de resultados
   * @returns {Array} Resultados ordenados e limitados
   */
  sortSearchResults(results, filterType, maxResults) {
    let sortedResults = [...results];
    
    // Ordenação baseada no filtro
    if (filterType === 'nearby') {
      // Já ordenado por distância anteriormente
    } else if (filterType === 'recent') {
      // Priorizar condomínios marcados como recentes
      sortedResults.sort((a, b) => {
        if (a.isRecent && !b.isRecent) return -1;
        if (!a.isRecent && b.isRecent) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });
    } else {
      // Ordenação padrão por nome
      sortedResults.sort((a, b) => {
        // Priorizar condomínios no sistema
        if (a.inSystem && !b.inSystem) return -1;
        if (!a.inSystem && b.inSystem) return 1;
        
        // Depois ordenar por nome
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    
    // Limitar resultados
    return sortedResults.slice(0, maxResults);
  }
};

export default CondoSearchService;