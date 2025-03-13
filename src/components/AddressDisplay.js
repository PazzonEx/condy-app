// src/components/AddressDisplay.js

import React from 'react';
import { View, StyleSheet, Linking, Platform } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const AddressDisplay = ({ address, details = {}, onPress, style }) => {
  const theme = useTheme();
  
  // Formatar endereço completo
  const getFormattedAddress = () => {
    if (address) return address;
    
    const {
      street,
      number,
      neighborhood,
      city,
      state,
      postalCode,
      complement
    } = details;
    
    const parts = [];
    
    if (street) {
      parts.push(`${street}${number ? `, ${number}` : ''}`);
    }
    
    if (complement) {
      parts.push(complement);
    }
    
    if (neighborhood) {
      parts.push(neighborhood);
    }
    
    if (city && state) {
      parts.push(`${city} - ${state}`);
    } else if (city) {
      parts.push(city);
    } else if (state) {
      parts.push(state);
    }
    
    if (postalCode) {
      parts.push(postalCode);
    }
    
    return parts.join(', ') || 'Endereço não informado';
  };
  
  // Abrir mapa
  const openMap = () => {
    const { latitude, longitude } = details;
    const formattedAddress = getFormattedAddress();
    
    let url;
    
    if (latitude && longitude) {
      // Se tiver coordenadas, usar coordenadas
      url = Platform.select({
        ios: `maps:?q=${formattedAddress}&ll=${latitude},${longitude}`,
        android: `geo:${latitude},${longitude}?q=${formattedAddress}`
      });
    } else {
      // Caso contrário, usar endereço
      url = Platform.select({
        ios: `maps:?q=${encodeURIComponent(formattedAddress)}`,
        android: `geo:0,0?q=${encodeURIComponent(formattedAddress)}`
      });
    }
    
    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        // Fallback para Google Maps na web
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formattedAddress)}`);
      }
    });
  };
  
  const formattedAddress = getFormattedAddress();
  const hasCoordinates = details.latitude && details.longitude;
  
  const renderContent = () => (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name="map-marker" size={20} color={theme.colors.primary} style={styles.icon} />
      <View style={styles.addressContainer}>
        <Text style={styles.addressText}>{formattedAddress}</Text>
        
        {hasCoordinates && (
          <View style={styles.coordinatesContainer}>
            <Text style={styles.coordinatesText}>
              {details.latitude.toFixed(6)}, {details.longitude.toFixed(6)}
            </Text>
          </View>
        )}
      </View>
      {(hasCoordinates || formattedAddress !== 'Endereço não informado') && (
        <MaterialCommunityIcons 
          name="map" 
          size={20} 
          color={theme.colors.primary} 
          style={styles.mapIcon} 
        />
      )}
    </View>
  );
  
  // Se tiver onPress, usar TouchableRipple
  if (onPress) {
    return (
      <TouchableRipple onPress={onPress}>
        {renderContent()}
      </TouchableRipple>
    );
  }
  
  // Se tiver coordenadas, fazer o endereço clicável
  if (hasCoordinates || formattedAddress !== 'Endereço não informado') {
    return (
      <TouchableRipple onPress={openMap}>
        {renderContent()}
      </TouchableRipple>
    );
  }
  
  // Caso contrário, retornar apenas a visualização
  return renderContent();
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 4,
  },
  icon: {
    marginRight: 8,
    marginTop: 2,
  },
  addressContainer: {
    flex: 1,
  },
  addressText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  coordinatesContainer: {
    marginTop: 4,
  },
  coordinatesText: {
    fontSize: 12,
    color: '#757575',
  },
  mapIcon: {
    marginLeft: 8,
    marginTop: 2,
  }
});

export default AddressDisplay;