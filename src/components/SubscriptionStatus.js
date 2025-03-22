// components/SubscriptionStatus.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import useAuth from '../hooks/useAuth';


const SubscriptionStatus = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const { user } = useAuth();
  const db = getFirestore();

  // Função para buscar os dados de assinatura do usuário
  const fetchSubscriptionData = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Buscar documento do usuário no Firestore
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Verificar dados de assinatura
        setSubscription({
          status: userData.subscriptionStatus || 'inactive',
          id: userData.subscriptionId || null,
          updatedAt: userData.updatedAt ? new Date(userData.updatedAt.toDate()) : null
        });
      } else {
        setSubscription({ status: 'inactive' });
      }
    } catch (error) {
      console.error('Erro ao buscar dados de assinatura:', error);
      setSubscription({ status: 'error', errorMessage: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Carregar dados quando o componente montar
  useEffect(() => {
    fetchSubscriptionData();
  }, [user]);

  // Navegar para a tela de planos
  const handleSubscribe = () => {
    navigation.navigate('Subscription');
  };

  // Renderizar estados de carregamento
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Verificando status da assinatura...</Text>
      </View>
    );
  }

  // Renderizar quando não há usuário logado
  if (!user) {
    return (
      <View style={styles.container}>
        <Text style={styles.messageText}>Faça login para verificar sua assinatura</Text>
      </View>
    );
  }

  // Renderizar baseado no status da assinatura
  return (
    <View style={styles.container}>
      {subscription?.status === 'active' ? (
        <View style={styles.activeContainer}>
          <Text style={styles.statusLabel}>Status da Assinatura</Text>
          <Text style={styles.activeStatus}>Ativa</Text>
          
          {subscription.updatedAt && (
            <Text style={styles.updatedText}>
              Última atualização: {subscription.updatedAt.toLocaleDateString()}
            </Text>
          )}
          
          <TouchableOpacity 
            style={styles.manageButton}
            onPress={() => navigation.navigate('ManageSubscription')}
          >
            <Text style={styles.buttonText}>Gerenciar Assinatura</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.inactiveContainer}>
          <Text style={styles.statusLabel}>Status da Assinatura</Text>
          <Text style={styles.inactiveStatus}>
            {subscription?.status === 'error' ? 'Erro ao verificar' : 'Inativa'}
          </Text>
          
          {subscription?.errorMessage && (
            <Text style={styles.errorText}>{subscription.errorMessage}</Text>
          )}
          
          <TouchableOpacity 
            style={styles.subscribeButton}
            onPress={handleSubscribe}
          >
            <Text style={styles.buttonText}>Assinar Agora</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    color: '#666',
  },
  activeContainer: {
    alignItems: 'center',
  },
  inactiveContainer: {
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  activeStatus: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 12,
  },
  inactiveStatus: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F44336',
    marginBottom: 12,
  },
  updatedText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    marginVertical: 8,
    textAlign: 'center',
  },
  subscribeButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  manageButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SubscriptionStatus;