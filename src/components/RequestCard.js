// src/components/RequestCard.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Badge, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS, globalStyles, statusStyles } from '../styles/theme';
import Button from './Button';
import { formatDate } from '../utils/format';

const RequestCard = ({
  request,
  onPress,
  onApprove,
  onDeny,
  onCancel,
  onShowQR,
  onRequestDetails,
  style,
  showActions = true,
  compact = false
}) => {
  if (!request) return null;
  
  const status = statusStyles[request.status] || {
    label: request.status || 'Desconhecido',
    color: COLORS.grey[600],
    icon: 'help-circle-outline',
  };
  
  // Formatar data
  const createdDate = formatDate(request.createdAt, { 
    showTime: true, 
    dateFormat: 'dd/MM/yyyy' 
  });
  
  return (
    <Card 
      style={[styles.card, style]}
      onPress={onPress}
    >
      <View style={styles.cardHeader}>
        <View style={styles.statusContainer}>
          <MaterialCommunityIcons name={status.icon} size={24} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.label}
          </Text>
        </View>
        <Text style={styles.dateText}>{createdDate}</Text>
      </View>
      
      <Divider />
      
      <View style={[styles.cardContent, compact && styles.cardContentCompact]}>
        <View style={styles.driverInfo}>
          <MaterialCommunityIcons name="account" size={24} color={COLORS.grey[700]} style={styles.icon} />
          <View style={styles.driverDetails}>
            <Text style={styles.driverName}>{request.driverName || 'Não informado'}</Text>
            {request.vehiclePlate && (
              <Text style={styles.infoText}>
                {request.vehicleModel ? `${request.vehicleModel} • ` : ''}
                Placa: {request.vehiclePlate}
              </Text>
            )}
          </View>
        </View>
        
        {!compact && (
          <View style={styles.unitInfo}>
            <MaterialCommunityIcons name="home" size={20} color={COLORS.grey[700]} style={styles.icon} />
            <Text style={styles.infoText}>
              Unidade: {request.unit || 'N/A'}
              {request.block ? ` • Bloco ${request.block}` : ''}
            </Text>
          </View>
        )}
      </View>
      
      {showActions && (
        <Card.Actions style={styles.cardActions}>
          {request.status === 'pending' && onApprove && onDeny && (
            <>
              <Button 
                mode="contained" 
                compact
                onPress={() => onApprove(request.id)}
                style={[styles.actionButton, { backgroundColor: COLORS.success }]}
                labelStyle={styles.actionButtonLabel}
              >
                Aprovar
              </Button>
              <Button 
                mode="contained" 
                compact
                onPress={() => onDeny(request.id)}
                style={[styles.actionButton, { backgroundColor: COLORS.danger }]}
                labelStyle={styles.actionButtonLabel}
              >
                Negar
              </Button>
            </>
          )}
          
          {(request.status === 'pending' || request.status === 'authorized') && onCancel && (
            <Button 
              mode="text" 
              compact
              onPress={() => onCancel(request.id)}
              labelStyle={styles.actionButtonLabel}
            >
              Cancelar
            </Button>
          )}
          
          {request.status === 'authorized' && onShowQR && (
            <Button 
              mode="contained" 
              icon="qrcode"
              compact
              onPress={() => onShowQR(request.id)}
              style={styles.qrButton}
              labelStyle={styles.actionButtonLabel}
            >
              QR Code
            </Button>
          )}
          
          {onRequestDetails && (
            <Button 
              mode="text" 
              compact
              onPress={() => onRequestDetails(request.id)}
              labelStyle={styles.actionButtonLabel}
            >
              Detalhes
            </Button>
          )}
        </Card.Actions>
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    marginLeft: 8,
    fontWeight: 'bold',
    fontSize: 16,
  },
  dateText: {
    fontSize: 12,
    color: COLORS.grey[600],
  },
  cardContent: {
    padding: 12,
  },
  cardContentCompact: {
    paddingVertical: 8,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  unitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.grey[700],
  },
  cardActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.grey[200],
    justifyContent: 'flex-end',
  },
  actionButton: {
    marginHorizontal: 4,
    borderRadius: 4,
  },
  qrButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  actionButtonLabel: {
    fontSize: 12,
  },
});

export default RequestCard;