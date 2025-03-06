// src/utils/location.js

/**
 * Calcula a distância entre dois pontos usando a fórmula de Haversine
 * @param {number} lat1 - Latitude do ponto 1
 * @param {number} lon1 - Longitude do ponto 1
 * @param {number} lat2 - Latitude do ponto 2
 * @param {number} lon2 - Longitude do ponto 2
 * @returns {number} Distância em quilômetros
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
    // Raio da Terra em quilômetros
    const R = 6371;
    
    // Converter graus para radianos
    const toRad = value => value * Math.PI / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    return distance;
  };
  
  /**
   * Formata um endereço a partir dos componentes do Google Places API
   * @param {Array} addressComponents - Componentes do endereço da Google Places API
   * @returns {Object} Endereço formatado
   */
  export const formatGoogleAddress = (addressComponents) => {
    if (!addressComponents || !Array.isArray(addressComponents)) {
      return {};
    }
    
    const getComponent = (type) => {
      const component = addressComponents.find(comp => 
        comp.types.includes(type)
      );
      return component ? component.long_name : '';
    };
    
    return {
      street: getComponent('route'),
      number: getComponent('street_number'),
      neighborhood: getComponent('sublocality_level_1') || getComponent('sublocality'),
      city: getComponent('administrative_area_level_2'),
      state: getComponent('administrative_area_level_1'),
      country: getComponent('country'),
      postalCode: getComponent('postal_code'),
      formattedAddress: [
        getComponent('route'),
        getComponent('street_number'),
        getComponent('sublocality_level_1') || getComponent('sublocality'),
        getComponent('administrative_area_level_2'),
        getComponent('administrative_area_level_1')
      ].filter(Boolean).join(', ')
    };
  };
  
  /**
   * Obtém endereço a partir de coordenadas (geocodificação reversa)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<Object>} Endereço formatado
   */
  export const getAddressFromCoordinates = async (latitude, longitude) => {
    try {
      // Substituir pela API do Google quando disponível
      // Na versão Expo, usar Location.reverseGeocodeAsync
      const Location = require('expo-location');
      
      const response = await Location.reverseGeocodeAsync({
        latitude,
        longitude
      });
      
      if (response && response.length > 0) {
        const location = response[0];
        
        return {
          street: location.street,
          number: location.streetNumber,
          neighborhood: location.district,
          city: location.city,
          state: location.region,
          country: location.country,
          postalCode: location.postalCode,
          formattedAddress: [
            location.street,
            location.streetNumber,
            location.district,
            location.city,
            location.region
          ].filter(Boolean).join(', ')
        };
      }
      
      return null;
    } catch (error) {
      console.error('Erro ao obter endereço a partir de coordenadas:', error);
      return null;
    }
  };