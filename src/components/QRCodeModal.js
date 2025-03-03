// src/components/QRCodeModal.js
import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Portal, Modal, Text, Button, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { COLORS, globalStyles, StatusBadge } from '../styles/theme';

const QRCodeModal = ({ visible, onDismiss, request, showAccessCode = true }) => {
  if (!request) return null;
  
  // Dados para o QR Code - inclui ID da solicitação e dados essenciais
  const qrData = JSON.stringify({
    id: request.id,
    driverId: request.driverId,
    residentId: request.residentId,
    condoId: request.condoId,
    createdAt: request.createdAt,
    status: request.status,
  });
  
  // Código de acesso alfanumérico (6 caracteres)
  // Na implementação real, isso seria gerado pelo back-end e armazenado
  const accessCode = request.accessCode || 'AB12C3';
  
  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.surface}>
          <View style={styles.header}>
            <Text style={styles.title}>Acesso Autorizado</Text>
            <TouchableOpacity onPress={onDismiss} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={COLORS.grey[600]} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.statusContainer}>
            <StatusBadge status={request.status} />
          </View>
          
          <View style={styles.qrCodeContainer}>
            <QRCode
              value={qrData}
              size={200}
              color={COLORS.dark}
              backgroundColor={COLORS.white}
              logo={require('../assets/logo-small.png')} // Adicionar logo ao QR
              logoSize={50}
              logoBackgroundColor={COLORS.white}
            />
          </View>
          
          {showAccessCode && (
            <View style={styles.accessCodeContainer}>
              <Text style={styles.accessCodeLabel}>Código de Acesso:</Text>
              <Text style={styles.accessCode}>{accessCode}</Text>
              <Text style={styles.accessCodeInstruction}>
                Mostre este código ou QR Code ao porteiro
              </Text>
            </View>
          )}
          
          <View style={styles.detailsContainer}>
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="account" size={20} color={COLORS.grey[700]} />
              <Text style={styles.detailLabel}>Motorista:</Text>
              <Text style={styles.detailValue}>{request.driverName || 'Não informado'}</Text>
            </View>
            
            {request.vehiclePlate && (
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="car" size={20} color={COLORS.grey[700]} />
                <Text style={styles.detailLabel}>Veículo:</Text>
                <Text style={styles.detailValue}>
                  {request.vehicleModel ? `${request.vehicleModel} - ` : ''}
                  Placa: {request.vehiclePlate}
                </Text>
              </View>
            )}
            
            <View style={styles.detailItem}>
              <MaterialCommunityIcons name="home" size={20} color={COLORS.grey[700]} />
              <Text style={styles.detailLabel}>Destino:</Text>
              <Text style={styles.detailValue}>
                Unidade {request.unit || 'N/A'}
                {request.block ? ` - Bloco ${request.block}` : ''}
              </Text>
            </View>
          </View>
          
          <Button
            mode="contained"
            style={styles.closeModalButton}
            onPress={onDismiss}
          >
            Fechar
          </Button>
        </Surface>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  surface: {
    width: '100%',
    borderRadius: 12,
    padding: 24,
    backgroundColor: COLORS.white,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  closeButton: {
    padding: 4,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    elevation: 1,
    alignSelf: 'center',
  },
  accessCodeContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  accessCodeLabel: {
    fontSize: 14,
    color: COLORS.grey[600],
    marginBottom: 4,
  },
  accessCode: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.primary,
    letterSpacing: 2,
    marginBottom: 8,
  },
  accessCodeInstruction: {
    fontSize: 12,
    color: COLORS.grey[600],
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 24,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.grey[600],
    width: 70,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  closeModalButton: {
    backgroundColor: COLORS.primary,
  },
});

export default QRCodeModal;