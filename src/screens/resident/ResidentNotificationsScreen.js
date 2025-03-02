import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, ActivityIndicator, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import FirestoreService from '../../services/firestore.service';
import AccessService from '../../services/access.service';
import Button from '../../components/Button';
import { formatDate } from '../../utils/format';

const ResidentNotificationsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [error, setError] = useState(null);
  
  // Carregar solicitações pendentes de aprovação quando a tela receber foco
  useFocusEffect(
    useCallback(() => {
      loadPendingRequests();
    }, [])
  );
  
  const loadPendingRequests = async () => {
    if (!userProfile?.id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Buscar solicitações pendentes de aprovação do morador
      const conditions = [
        { field: 'residentId', operator: '==', value: userProfile.id },
        { field: 'status', operator: '==', value: 'pending_resident' }
      ];
      
      const requests = await FirestoreService.queryDocuments(
        'access_requests', 
        conditions,
        { field: 'createdAt', direction: 'desc' }
      );
      
      console.log(`Encontradas ${requests.length} solicitações pendentes de aprovação`);
      setPendingRequests(requests);
      
    } catch (error) {
      console.error('Erro ao carregar solicitações pendentes:', error);
      setError('Não foi possível carregar as solicitações pendentes');
    } finally {
      setLoading(false);
    }
  };
  
  const handleApproveRequest = async (requestId) => {
    try {
      setLoading(true);
      
      // Atualizar status da solicitação para 'pending' (aguardando aprovação da portaria)
      await AccessService.updateAccessRequestStatus(requestId, 'pending', {
        residentApproved: true
      });
      
      Alert.alert(
        'Sucesso', 
        'Solicitação aprovada. A portaria será notificada.'
      );
      
      // Recarregar solicitações
      loadPendingRequests();
    } catch (error) {
      console.error('Erro ao aprovar solicitação:', error);
      Alert.alert('Erro', 'Não foi possível aprovar a solicitação');
      setLoading(false);
    }
  };
  
  const handleRejectRequest = async (requestId) => {
    try {
      setLoading(true);
      
      // Atualizar status da solicitação para 'denied'
      await AccessService.updateAccessRequestStatus(requestId, 'denied', {
        residentApproved: false
      });
      
      Alert.alert('Sucesso', 'Solicitação rejeitada.');
      
      // Recarregar solicitações
      loadPendingRequests();
    } catch (error) {
      console.error('Erro ao rejeitar solicitação:', error);
      Alert.alert('Erro', 'Não foi possível rejeitar a solicitação');
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Carregando solicitações pendentes...</Text>
      </View>
    );
  }
  
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={48} color="#F44336" />
        <Text style={styles.errorText}>{error}</Text>
        <Button mode="contained" onPress={loadPendingRequests}>
          Tentar Novamente
        </Button>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Solicitações Pendentes</Text>
      
      {pendingRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>Nenhuma solicitação pendente</Text>
          <Text style={styles.emptySubtext}>
            Quando motoristas solicitarem acesso à sua unidade, você verá as solicitações aqui
          </Text>
        </View>
      ) : (
        pendingRequests.map(request => (
          <Card key={request.id} style={styles.requestCard}>
            <Card.Content>
              <View style={styles.requestHeader}>
                <MaterialCommunityIcons name="account-clock" size={24} color="#FF9800" />
                <Text style={styles.driverName}>{request.driverName || 'Motorista'}</Text>
                <Text style={styles.requestDate}>
                  {formatDate(request.createdAt, { showDate: true, showTime: true })}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="car" size={20} color="#555" />
                  <Text style={styles.detailLabel}>Veículo:</Text>
                  <Text style={styles.detailValue}>
                    {request.vehicleModel || 'Não informado'} 
                    {request.vehiclePlate ? ` (${request.vehiclePlate})` : ''}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="office-building" size={20} color="#555" />
                  <Text style={styles.detailLabel}>Condomínio:</Text>
                  <Text style={styles.detailValue}>{request.condoName || 'Não informado'}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="home" size={20} color="#555" />
                  <Text style={styles.detailLabel}>Unidade:</Text>
                  <Text style={styles.detailValue}>
                    {request.unit || 'Não informada'}
                    {request.block ? `, Bloco ${request.block}` : ''}
                  </Text>
                </View>
                
                {request.comment && (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Observações:</Text>
                    <Text style={styles.commentText}>{request.comment}</Text>
                  </View>
                )}
              </View>
            </Card.Content>
            
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="contained" 
                onPress={() => handleApproveRequest(request.id)}
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
              >
                Aprovar
              </Button>
              
              <Button 
                mode="contained" 
                onPress={() => handleRejectRequest(request.id)}
                style={[styles.actionButton, { backgroundColor: '#F44336' }]}
              >
                Recusar
              </Button>
            </Card.Actions>
          </Card>
        ))
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#757575',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginTop: 8,
  },
  requestCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    flex: 1,
  },
  requestDate: {
    fontSize: 12,
    color: '#757575',
  },
  divider: {
    marginBottom: 12,
  },
  detailsContainer: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#757575',
    marginLeft: 8,
    width: 100,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  commentContainer: {
    marginTop: 8,
    backgroundColor: '#f8f8f8',
    padding: 12,
    borderRadius: 8,
  },
  commentLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  commentText: {
    fontSize: 14,
  },
  cardActions: {
    justifyContent: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    marginLeft: 8,
  }
});

export default ResidentNotificationsScreen;