// src/components/RequestStatusBadge.js

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const RequestStatusBadge = ({ status, size = 'normal', style }) => {
  // Configurações por status
  const statusConfig = {
    pending: {
      label: 'Pendente',
      color: '#FF9800',
      icon: 'clock-outline',
      description: 'Aguardando aprovação da portaria'
    },
    pending_resident: {
      label: 'Aguardando Aprovação',
      color: '#FF9800',
      icon: 'account-clock',
      description: 'Aguardando sua aprovação'
    },
    authorized: {
      label: 'Autorizado',
      color: '#4CAF50',
      icon: 'check-circle-outline',
      description: 'Autorizado pela portaria'
    },
    arrived: {
      label: 'Na Portaria',
      color: '#2196F3',
      icon: 'map-marker',
      description: 'Motorista chegou ao condomínio'
    },
    entered: {
      label: 'Entrou',
      color: '#9C27B0',
      icon: 'login',
      description: 'Motorista entrou no condomínio'
    },
    completed: {
      label: 'Concluído',
      color: '#4CAF50',
      icon: 'check-circle',
      description: 'Acesso concluído'
    },
    denied: {
      label: 'Negado',
      color: '#F44336',
      icon: 'close-circle-outline',
      description: 'Acesso negado pela portaria'
    },
    denied_by_resident: {
      label: 'Negado por Você',
      color: '#F44336',
      icon: 'close-circle-outline',
      description: 'Você negou esta solicitação'
    },
    canceled: {
      label: 'Cancelado',
      color: '#757575',
      icon: 'cancel',
      description: 'Solicitação cancelada'
    }
  };
  
  // Obter configuração para o status atual (com fallback)
  const config = statusConfig[status] || {
    label: status || 'Desconhecido',
    color: '#757575',
    icon: 'help-circle-outline',
    description: 'Status desconhecido'
  };
  
  // Definir tamanhos baseados no parâmetro size
  const sizeStyles = {
    small: {
      container: { paddingVertical: 2, paddingHorizontal: 6 },
      icon: 16,
      text: { fontSize: 12 }
    },
    normal: {
      container: { paddingVertical: 4, paddingHorizontal: 8 },
      icon: 20,
      text: { fontSize: 14 }
    },
    large: {
      container: { paddingVertical: 6, paddingHorizontal: 10 },
      icon: 24,
      text: { fontSize: 16 }
    }
  };
  
  const sizeConfig = sizeStyles[size] || sizeStyles.normal;
  
  return (
    <View style={[
      styles.container, 
      { backgroundColor: `${config.color}15` },
      sizeConfig.container,
      style
    ]}>
      <MaterialCommunityIcons 
        name={config.icon} 
        size={sizeConfig.icon} 
        color={config.color} 
        style={styles.icon}
      />
      <Text style={[
        styles.text, 
        { color: config.color },
        sizeConfig.text
      ]}>
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontWeight: 'bold',
  }
});

export default RequestStatusBadge;