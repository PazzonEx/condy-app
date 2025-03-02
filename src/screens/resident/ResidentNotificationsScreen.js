import React, { useState, useEffect, useCallback } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, ActivityIndicator, Divider } from 'react-native-paper';
import { useFocusEffect } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useAuth } from '../../hooks/useAuth';
import FirestoreService from '../../services/firestore.service';
import AccessService from '../../services/access.service';
import { formatDate } from '../../utils/format';

const ResidentNotificationsScreen = ({ navigation }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  const loadPendingRequests = useCallback(async () => {
    if (!userProfile?.id) return;
    
    try {
      setLoading(true);
      
      // Query pending requests requiring resident approval
      const requests = await FirestoreService.queryDocuments('access_requests', [
        { field: 'residentId', operator: '==', value: userProfile.id },
        { field: 'status', operator: '==', value: 'pending_resident' }
      ]);
      
      setPendingRequests(requests);
    } catch (error) {
      console.error('Error loading pending requests:', error);
      Alert.alert('Error', 'Could not load pending requests');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);
  
  // Load requests when screen comes into focus
  useFocusEffect(loadPendingRequests);
  
  const handleApproveRequest = async (requestId) => {
    try {
      // Update request status
      await AccessService.approveResidentRequest(requestId);
      
      // Refresh list
      loadPendingRequests();
      
      Alert.alert('Success', 'Request approved and forwarded to gatehouse');
    } catch (error) {
      console.error('Error approving request:', error);
      Alert.alert('Error', 'Could not approve the request');
    }
  };
  
  const handleDenyRequest = async (requestId) => {
    try {
      // Update request status
      await AccessService.denyResidentRequest(requestId);
      
      // Refresh list
      loadPendingRequests();
      
      Alert.alert('Success', 'Request denied');
    } catch (error) {
      console.error('Error denying request:', error);
      Alert.alert('Error', 'Could not deny the request');
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1E88E5" />
        <Text style={styles.loadingText}>Loading pending requests...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      <Text style={styles.headerTitle}>Pending Access Requests</Text>
      
      {pendingRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="bell-outline" size={64} color="#BDBDBD" />
          <Text style={styles.emptyText}>No pending requests</Text>
          <Text style={styles.emptySubtext}>
            When drivers request access to your unit, you'll see them here
          </Text>
        </View>
      ) : (
        pendingRequests.map(request => (
          <Card key={request.id} style={styles.requestCard}>
            <Card.Content>
              <View style={styles.requestHeader}>
                <MaterialCommunityIcons name="account" size={24} color="#1E88E5" />
                <Text style={styles.driverName}>{request.driverName}</Text>
                <Text style={styles.requestDate}>
                  {formatDate(request.createdAt, { showDate: true, showTime: true })}
                </Text>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.detailsContainer}>
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="car" size={20} color="#555" />
                  <Text style={styles.detailLabel}>Vehicle:</Text>
                  <Text style={styles.detailValue}>
                    {request.vehicleModel} ({request.vehiclePlate})
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="office-building" size={20} color="#555" />
                  <Text style={styles.detailLabel}>Condominium:</Text>
                  <Text style={styles.detailValue}>{request.condoName}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MaterialCommunityIcons name="home" size={20} color="#555" />
                  <Text style={styles.detailLabel}>Unit:</Text>
                  <Text style={styles.detailValue}>
                    {request.unit}{request.block ? `, Block ${request.block}` : ''}
                  </Text>
                </View>
                
                {request.comment && (
                  <View style={styles.commentContainer}>
                    <Text style={styles.commentLabel}>Comment:</Text>
                    <Text style={styles.commentText}>{request.comment}</Text>
                  </View>
                )}
              </View>
            </Card.Content>
            
            <Card.Actions style={styles.cardActions}>
              <Button 
                mode="contained" 
                onPress={() => handleApproveRequest(request.id)}
                style={styles.approveButton}
              >
                Approve
              </Button>
              
              <Button 
                mode="outlined" 
                onPress={() => handleDenyRequest(request.id)}
                style={styles.denyButton}
              >
                Deny
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
  approveButton: {
    backgroundColor: '#4CAF50',
    marginRight: 8,
  },
  denyButton: {
    borderColor: '#F44336',
  }
});

export default ResidentNotificationsScreen;