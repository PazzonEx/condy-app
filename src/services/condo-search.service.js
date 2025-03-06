// src/services/condo-search.service.js
import FirestoreService from './firestore.service';
import { auth } from '../config/firebase';
import { calculateDistance } from '../utils/location';
import Constants from 'expo-constants';

/**
 * Serviço de busca e gerenciamento de condomínios
 */
const CondoSearchService = {
 /**
 * Busca avançada de condomínios com suporte a Google Places API 2025
 * @param {Object} searchParams - Parâmetros de busca
 * @returns {Promise<Array>} Lista de condomínios encontrados
 */
 async searchCondos(searchParams = {}) {
  try {
    console.log("Iniciando busca de condomínios no Firestore:", searchParams);
    
    const {
      query = '',
      maxResults = 10,
      onlyActive = true,
      userLocation = null,
      filterType = 'all',
    } = searchParams;

    // Buscar todos os condomínios
    const allCondos = await FirestoreService.getCollection('condos');
    console.log(`Total de condomínios na base: ${allCondos.length}`);
    
    // Aplicar filtros
    let filteredCondos = allCondos.filter(condo => {
      // Filtro de status ativo
      if (onlyActive && condo.status !== 'active') return false;
      
      // Busca textual (nome, endereço)
      if (query.trim()) {
        // Dividir a consulta em termos para busca mais flexível
        const queryTerms = query.toLowerCase().trim().split(/\s+/);
        const condoName = (condo.name || '').toLowerCase();
        const condoAddress = (condo.address || '').toLowerCase();
        
        // Verificar se todos os termos estão presentes em algum campo
        return queryTerms.every(term => 
          condoName.includes(term) || condoAddress.includes(term)
        );
      }
      
      return true;
    });
    
    console.log(`Condomínios filtrados do Firestore: ${filteredCondos.length}`);

    // Adicionar distância se localização do usuário estiver disponível
    if (userLocation) {
      filteredCondos = filteredCondos.map(condo => {
        if (condo.latitude && condo.longitude) {
          const distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            condo.latitude,
            condo.longitude
          );
          return { ...condo, distance };
        }
        return condo;
      });
      
      // Ordenar por distância se filtro for "nearby"
      if (filterType === 'nearby') {
        filteredCondos.sort((a, b) => {
          const distA = a.distance !== undefined ? a.distance : Infinity;
          const distB = b.distance !== undefined ? b.distance : Infinity;
          return distA - distB;
        });
      }
    }
    
    // Ordenação padrão por nome
    if (filterType !== 'nearby') {
      filteredCondos.sort((a, b) => {
        return (a.name || '').localeCompare(b.name || '');
      });
    }
    
    // Limitar resultados
    const limitedResults = filteredCondos.slice(0, maxResults);
    console.log(`Resultados finais: ${limitedResults.length}`);
    
    return limitedResults;
  } catch (error) {
    console.error('Erro na busca de condomínios:', error);
    return [];
  }
},

// Método auxiliar para calcular distância
calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Raio da Terra em km
  const dLat = this.toRad(lat2 - lat1);
  const dLon = this.toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
},

// Converter para radianos
toRad(value) {
  return value * Math.PI / 180;
},

  /**
   * Buscar condomínios por endereço utilizando Google Places API
   * @param {string} query - Endereço para busca
   * @param {number} maxResults - Número máximo de resultados
   * @returns {Promise<Array>} Lista de condomínios encontrados
   */
  async searchCondosByAddress(query, maxResults = 10) {
    try {
      // Verificar se temos API key do Google configurada
      const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      console.log("ete é meu tokem",googleApiKey)
      
      if (!googleApiKey) {
        console.warn('Google Places API Key não configurada. Usando busca padrão.');
        // Fallback para busca padrão
        return this.searchCondos({ query, maxResults });
      }
      
      // Implementação da busca utilizando Google Places API
      const encodedQuery = encodeURIComponent(query);
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodedQuery}&key=${googleApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Places API erro: ${data.status}`);
      }
      
      // Extrair resultados
      const places = data.results.slice(0, maxResults);
      
      // Verificar quais lugares já existem como condomínios na nossa base
      const existingCondos = await this.findExistingCondosByPlaceIds(
        places.map(place => place.place_id)
      );
      
      // Combinar resultados da API com nossos condomínios cadastrados
      const results = await Promise.all(places.map(async place => {
        // Verificar se já existe este condomínio no sistema
        const existingCondo = existingCondos.find(
          condo => condo.placeId === place.place_id
        );
        
        if (existingCondo) {
          return {
            ...existingCondo,
            fromGooglePlaces: false
          };
        }
        
        // Criar um novo objeto com os dados do Google Places
        return {
          id: place.place_id, // Usar place_id como identificador temporário
          name: place.name,
          address: place.formatted_address,
          city: this.extractCityFromAddress(place.formatted_address),
          state: this.extractStateFromAddress(place.formatted_address),
          latitude: place.geometry?.location?.lat || null,
          longitude: place.geometry?.location?.lng || null,
          verified: false,
          fromGooglePlaces: true, // Indicar que veio do Google Places
          placeId: place.place_id
        };
      }));
      
      return results;
    } catch (error) {
      console.error('Erro na busca de condomínios por endereço:', error);
      // Fallback para busca padrão
      return this.searchCondos({ query, maxResults });
    }
  },

  /**
   * Extrair cidade do endereço formatado do Google Places
   * @param {string} formattedAddress - Endereço formatado
   * @returns {string} Nome da cidade
   */
  extractCityFromAddress(formattedAddress) {
    if (!formattedAddress) return '';
    
    // Tenta extrair a cidade do formato "Cidade, Estado, País"
    const parts = formattedAddress.split(',');
    
    if (parts.length >= 2) {
      return parts[parts.length - 3]?.trim() || '';
    }
    
    return '';
  },

  /**
   * Extrair estado do endereço formatado do Google Places
   * @param {string} formattedAddress - Endereço formatado
   * @returns {string} Nome do estado
   */
  extractStateFromAddress(formattedAddress) {
    if (!formattedAddress) return '';
    
    // Tenta extrair o estado do formato "Cidade, Estado, País"
    const parts = formattedAddress.split(',');
    
    if (parts.length >= 2) {
      return parts[parts.length - 2]?.trim() || '';
    }
    
    return '';
  },

  /**
   * Buscar condomínios existentes por IDs de lugares do Google Places
   * @param {Array<string>} placeIds - Array de IDs de lugares
   * @returns {Promise<Array>} Condomínios encontrados
   */// Verifique se esta função está realmente retornando resultados
async findExistingCondosByPlaceIds(placeIds) {
  try {
    if (!placeIds || placeIds.length === 0) {
      console.log("Nenhum placeId fornecido para busca");
      return [];
    }

    console.log("Buscando condomínios com placeIds:", placeIds);
    
    // Buscar condomínios que têm placeId no array de placeIds
    const existingCondos = await FirestoreService.queryDocuments(
      'condos',
      [{ field: 'placeId', operator: 'in', value: placeIds }]
    );
    
    console.log("Condomínios encontrados:", existingCondos.length);
    return existingCondos;
  } catch (error) {
    console.error('Erro ao buscar condomínios por placeIds:', error);
    return [];
  }
},

  /**
   * Buscar condomínios próximos a uma localização
   * @param {string} query - Termo de busca (opcional)
   * @param {Object} userLocation - Localização do usuário {latitude, longitude}
   * @param {number} maxDistance - Distância máxima em km
   * @param {number} maxResults - Número máximo de resultados
   * @returns {Promise<Array>} Lista de condomínios próximos
   */
  async searchCondosByLocation(query, userLocation, maxDistance, maxResults = 20) {
    try {
      // Firestore não tem busca por geolocalização nativa no cliente
      // Vamos buscar todos e filtrar manualmente
      
      // Busca básica por query primeiro
      const initialParams = {
        query,
        maxResults: 100, // Buscar mais para depois filtrar por distância
        onlyActive: true
      };
      
      const condos = await this.searchCondos(initialParams);
      
      // Filtrar por distância
      const nearbyCondos = condos
        .filter(condo => {
          // Verificar se tem coordenadas
          if (!condo.latitude || !condo.longitude) return false;
          
          // Calcular distância
          const distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            condo.latitude,
            condo.longitude
          );
          
          // Adicionar distância ao objeto
          condo.distance = distance;
          
          // Filtrar por distância máxima
          return distance <= maxDistance;
        })
        // Ordenar por distância
        .sort((a, b) => a.distance - b.distance)
        // Limitar resultados
        .slice(0, maxResults);
      
      return nearbyCondos;
    } catch (error) {
      console.error('Erro na busca de condomínios por localização:', error);
      return [];
    }
  },

  /**
   * Obter detalhes de um condomínio específico
   * @param {string} condoId - ID do condomínio
   * @returns {Promise<Object>} Detalhes do condomínio
   */
  async getCondoDetails(condoId) {
    try {
      if (!condoId) {
        throw new Error('ID do condomínio não fornecido');
      }

      // Se for um Place ID do Google, buscar detalhes e converter
      if (condoId.startsWith('ChI') || condoId.length > 30) {
        return this.getCondoDetailsFromPlaceId(condoId);
      }

      const condo = await FirestoreService.getDocument('condos', condoId);
      
      if (!condo) {
        throw new Error('Condomínio não encontrado');
      }

      // Buscar informações adicionais
      const [residents, drivers] = await Promise.all([
        FirestoreService.queryDocuments('residents', [
          { field: 'condoId', operator: '==', value: condoId }
        ]),
        FirestoreService.queryDocuments('drivers', [
          { field: 'condosServed', operator: 'array-contains', value: condoId }
        ])
      ]);

      return {
        id: condo.id,
        name: condo.name || '',
        address: condo.address || '',
        units: condo.units || 0,
        blocks: condo.blocks || 0,
        phone: condo.phone || '',
        email: condo.email || '',
        coverImageUrl: condo.coverImageUrl || null,
        verified: !!condo.verified,
        accessRules: condo.accessRules || [],
        latitude: condo.latitude || null,
        longitude: condo.longitude || null,
        socialMediaLinks: condo.socialMediaLinks || {},
        stats: {
          totalResidents: residents.length,
          totalDrivers: drivers.length,
          activeRequests: 0 // Você pode adicionar lógica para contar solicitações ativas
        }
      };
    } catch (error) {
      console.error('Erro ao buscar detalhes do condomínio:', error);
      throw error;
    }
  },

  /**
   * Obter detalhes de um condomínio a partir de um Place ID do Google
   * @param {string} placeId - Place ID do Google
   * @returns {Promise<Object>} Detalhes do condomínio
   */
  async getCondoDetailsFromPlaceId(placeId) {
    try {
      // Verificar se o condomínio já existe no sistema
      const existingCondos = await this.findExistingCondosByPlaceIds([placeId]);
      
      if (existingCondos.length > 0) {
        // Se já existe, usar o ID e buscar detalhes completos
        return this.getCondoDetails(existingCondos[0].id);
      }
      
      // Se não existe no sistema, buscar detalhes do Google Places
      const googleApiKey = Constants.expoConfig?.extra?.googlePlacesApiKey;
      
      if (!googleApiKey) {
        throw new Error('Google Places API Key não configurada');
      }
      
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,types,formatted_phone_number,website&key=${googleApiKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.status !== 'OK') {
        throw new Error(`Google Places API erro: ${data.status}`);
      }
      
      const place = data.result;
      
      // Verificar se é provavelmente um condomínio
      const isCondoType = place.types?.some(type => 
        ['apartment', 'residential', 'lodging', 'establishment', 'premise'].includes(type)
      );
      
      const condoDetails = {
        id: placeId,
        name: place.name,
        address: place.formatted_address,
        city: this.extractCityFromAddress(place.formatted_address),
        state: this.extractStateFromAddress(place.formatted_address),
        phone: place.formatted_phone_number || '',
        email: '',
        website: place.website || '',
        latitude: place.geometry?.location?.lat || null,
        longitude: place.geometry?.location?.lng || null,
        coverImageUrl: null,
        verified: false,
        fromGooglePlaces: true,
        placeId: placeId,
        isCondoType,
        accessRules: [],
        stats: {
          totalResidents: 0,
          totalDrivers: 0,
          activeRequests: 0
        }
      };
      
      return condoDetails;
    } catch (error) {
      console.error('Erro ao buscar detalhes do Place ID:', error);
      throw error;
    }
  },

  /**
   * Verificar se o motorista pode solicitar acesso a um condomínio
   * @param {string} condoId - ID do condomínio
   * @returns {Promise<boolean>} Indica se o motorista pode solicitar acesso
   */
  async canDriverRequestAccess(condoId) {
    try {
      // Verificar se há usuário autenticado
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados do motorista
      const driverDoc = await FirestoreService.getDocument('drivers', user.uid);
      
      if (!driverDoc) {
        throw new Error('Perfil de motorista não encontrado');
      }

      // Verificar status do motorista
      if (driverDoc.status !== 'active') {
        return false;
      }

      // Verificar se o motorista está disponível
      if (driverDoc.isAvailable === false) {
        return false;
      }

      // Buscar detalhes do condomínio
      const condoDoc = await FirestoreService.getDocument('condos', condoId);
      
      if (!condoDoc || condoDoc.status !== 'active') {
        return false;
      }

      // Verificar se o condomínio aceita solicitações externas
      if (condoDoc.allowExternalRequests === false) {
        return false;
      }

      // Verificar se o condomínio tem limite de solicitações e se atingiu o limite
      if (condoDoc.subscription?.maxRequests) {
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        // Contar solicitações deste mês
        const requests = await FirestoreService.queryDocuments('access_requests', [
          { field: 'condoId', operator: '==', value: condoId },
          { field: 'createdAt', operator: '>=', value: new Date(currentYear, currentMonth, 1) }
        ]);
        
        if (requests.length >= condoDoc.subscription.maxRequests) {
          return false;
        }
      }

      // Verificar se o motorista está na lista negra do condomínio
      if (condoDoc.blacklistedDrivers && 
          Array.isArray(condoDoc.blacklistedDrivers) && 
          condoDoc.blacklistedDrivers.includes(user.uid)) {
        return false;
      }

      // Se passou por todas as verificações, pode solicitar acesso
      return true;
    } catch (error) {
      console.error('Erro ao verificar acesso do motorista:', error);
      return false;
    }
  },

  /**
   * Obter condomínios recentes do motorista
   * @param {number} limit - Limite de resultados
   * @returns {Promise<Array>} Lista de condomínios recentes
   */
  async getRecentCondos(limit = 5) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar solicitações recentes do motorista
      const recentRequests = await FirestoreService.queryDocuments(
        'access_requests',
        [{ field: 'driverId', operator: '==', value: user.uid }],
        { field: 'createdAt', direction: 'desc' },
        20
      );

      // Extrair IDs únicos de condomínios
      const uniqueCondoIds = [...new Set(recentRequests.map(req => req.condoId))];
      
      // Limitar ao número desejado
      const limitedIds = uniqueCondoIds.slice(0, limit);
      
      // Buscar detalhes dos condomínios
      const condos = await Promise.all(
        limitedIds.map(id => this.getCondoDetails(id).catch(err => null))
      );
      
      // Filtrar nulos (erros de busca)
      return condos.filter(condo => condo !== null);
    } catch (error) {
      console.error('Erro ao buscar condomínios recentes:', error);
      return [];
    }
  },

  /**
   * Buscar condomínios favoritos do motorista
   * @returns {Promise<Array>} Lista de condomínios favoritos
   */
  async getFavoriteCondos() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados do motorista
      const driverDoc = await FirestoreService.getDocument('drivers', user.uid);
      
      if (!driverDoc || !driverDoc.favoriteCondos || !Array.isArray(driverDoc.favoriteCondos)) {
        return [];
      }

      // Buscar detalhes dos condomínios favoritos
      const condos = await Promise.all(
        driverDoc.favoriteCondos.map(id => this.getCondoDetails(id).catch(err => null))
      );
      
      // Filtrar nulos (erros de busca)
      return condos.filter(condo => condo !== null);
    } catch (error) {
      console.error('Erro ao buscar condomínios favoritos:', error);
      return [];
    }
  },

  /**
   * Adicionar ou remover condomínio dos favoritos
   * @param {string} condoId - ID do condomínio
   * @param {boolean} favorite - true para adicionar, false para remover
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async toggleFavoriteCondo(condoId, favorite) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados do motorista
      const driverDoc = await FirestoreService.getDocument('drivers', user.uid);
      
      if (!driverDoc) {
        throw new Error('Perfil de motorista não encontrado');
      }

      // Criar array de favoritos se não existir
      const favoriteCondos = driverDoc.favoriteCondos || [];
      
      // Adicionar ou remover do array
      let updatedFavorites;
      if (favorite && !favoriteCondos.includes(condoId)) {
        updatedFavorites = [...favoriteCondos, condoId];
      } else if (!favorite && favoriteCondos.includes(condoId)) {
        updatedFavorites = favoriteCondos.filter(id => id !== condoId);
      } else {
        // Não precisou mudar
        return true;
      }
      
      // Atualizar no Firestore
      await FirestoreService.updateDocument('drivers', user.uid, {
        favoriteCondos: updatedFavorites
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar favoritos:', error);
      return false;
    }
  },

  /**
   * Verificar se um condomínio está nos favoritos
   * @param {string} condoId - ID do condomínio
   * @returns {Promise<boolean>} true se estiver nos favoritos
   */
  async isCondoFavorite(condoId) {
    try {
      const user = auth.currentUser;
      if (!user) {
        return false;
      }

      const driverDoc = await FirestoreService.getDocument('drivers', user.uid);
      
      if (!driverDoc || !driverDoc.favoriteCondos) {
        return false;
      }
      
      return driverDoc.favoriteCondos.includes(condoId);
    } catch (error) {
      console.error('Erro ao verificar favorito:', error);
      return false;
    }
  },

  /**
   * Registrar um condomínio que não existe no sistema
   * @param {Object} condoData - Dados do condomínio
   * @returns {Promise<Object>} Condomínio criado
   */
  async registerNewCondo(condoData) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Verificar dados obrigatórios
      if (!condoData.name || !condoData.address) {
        throw new Error('Nome e endereço são obrigatórios');
      }

      // Dados para criar o condomínio
      const newCondoData = {
        name: condoData.name,
        address: condoData.address,
        city: condoData.city || '',
        state: condoData.state || '',
        latitude: condoData.latitude || null,
        longitude: condoData.longitude || null,
        placeId: condoData.placeId || null,
        phone: condoData.phone || '',
        email: condoData.email || '',
        status: 'pending_approval', // Pendente de aprovação
        verified: false,
        createdBy: user.uid,
        createdAt: new Date(),
        createdByType: 'driver', // Indica que foi criado por um motorista
        units: condoData.units || 0,
        blocks: condoData.blocks || 0
      };

      // Criar no Firestore
      const newCondo = await FirestoreService.createDocument('condos', newCondoData);

      return newCondo;
    } catch (error) {
      console.error('Erro ao registrar novo condomínio:', error);
      throw error;
    }
  }
};

export default CondoSearchService;