// screens/PaymentSuccessScreen.js
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator,
  Image
} from 'react-native';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import useAuth from "../../hooks/useAuth";


const PaymentSuccessScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [subscriptionDetails, setSubscriptionDetails] = useState(null);
  const { user } = useAuth();
  const db = getFirestore();

  // Buscar detalhes atualizados da assinatura
  useEffect(() => {
    const fetchSubscriptionDetails = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSubscriptionDetails({
            status: userData.subscriptionStatus,
            updatedAt: userData.updatedAt ? new Date(userData.updatedAt.toDate()) : new Date(),
            // Outros detalhes que você queira mostrar
          });
        }
      } catch (error) {
        console.error('Erro ao buscar detalhes da assinatura:', error);
      } finally {
        setLoading(false);
      }
    };

    // Pequeno delay para dar tempo do webhook atualizar o Firestore
    const timer = setTimeout(() => {
      fetchSubscriptionDetails();
    }, 2000);

    return () => clearTimeout(timer);
  }, [user]);

  const handleGoToDashboard = () => {
    // Navegar para o dashboard ou tela principal do app
    navigation.navigate('Dashboard');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Finalizando seu pagamento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.successIconContainer}>
          {/* Você pode substituir por uma imagem ou ícone real */}
          <View style={styles.successIcon}>
            <Text style={styles.checkmark}>✓</Text>
          </View>
        </View>
        
        <Text style={styles.title}>Pagamento Confirmado!</Text>
        
        <Text style={styles.message}>
          Obrigado por assinar o Condy. Sua assinatura está ativa e você já pode
          aproveitar todos os benefícios.
        </Text>
        
        {subscriptionDetails && (
          <View style={styles.detailsContainer}>
            <Text style={styles.detailsTitle}>Detalhes da Assinatura:</Text>
            <Text style={styles.detailText}>
              Status: <Text style={styles.highlight}>{subscriptionDetails.status === 'active' ? 'Ativa' : 'Processando'}</Text>
            </Text>
            <Text style={styles.detailText}>
              Data: <Text style={styles.highlight}>{subscriptionDetails.updatedAt.toLocaleDateString()}</Text>
            </Text>
          </View>
        )}
        
        <TouchableOpacity 
          style={styles.button}
          onPress={handleGoToDashboard}
        >
          <Text style={styles.buttonText}>Continuar para o App</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  successIconContainer: {
    marginBottom: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  detailsContainer: {
    width: '100%',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  highlight: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  button: {
    backgroundColor: '#4CAF50',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default PaymentSuccessScreen;