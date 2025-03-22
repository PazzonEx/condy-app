// screens/SubscriptionScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Alert,
  ScrollView
} from 'react-native';
import  {createCheckoutSession}  from '../services/payment.service'; 
import  useAuth from '../hooks/useAuth';


// Dados de exemplo de planos - idealmente viriam do Firestore
const SUBSCRIPTION_PLANS = [
  {
    id: 'plano_basico',
    name: 'Plano Básico',
    description: 'Ideal para condomínios pequenos',
    price: 'R$ 99,90/mês',
    features: ['Até 50 unidades', 'Controle de acesso básico', 'Suporte por email'],
    priceId: 'price_1234567890', // ID do preço no Stripe
  },
  {
    id: 'plano_premium',
    name: 'Plano Premium',
    description: 'Para condomínios de médio porte',
    price: 'R$ 199,90/mês',
    features: ['Até 150 unidades', 'Controle avançado de acesso', 'Relatórios', 'Suporte prioritário'],
    priceId: 'price_0987654321', // ID do preço no Stripe
  },
  {
    id: 'plano_enterprise',
    name: 'Plano Enterprise',
    description: 'Solução completa para grandes empreendimentos',
    price: 'R$ 399,90/mês',
    features: ['Unidades ilimitadas', 'Todas as funcionalidades premium', 'API personalizada', 'Suporte 24/7'],
    priceId: 'price_5678901234', // ID do preço no Stripe
  }
];

const SubscriptionScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const { user } = useAuth(); // Obtém usuário atual do contexto de autenticação

  // Função para iniciar o processo de checkout
  const handleCheckout = async () => {
    if (!selectedPlan) {
      Alert.alert('Erro', 'Por favor, selecione um plano para continuar.');
      return;
    }

    setLoading(true);
    try {
      // URLs de redirecionamento - adaptadas para deep linking no app
      const successUrl = 'com.seuapp://pagamento-sucesso';
      const cancelUrl = 'com.seuapp://pagamento-cancelado';

      const result = await createCheckoutSession({
        priceId: selectedPlan.priceId,
        mode: 'subscription',
        successUrl,
        cancelUrl
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      // O checkout ocorrerá no navegador via openBrowserAsync
      console.log('Checkout iniciado com sucesso, ID da sessão:', result.sessionId);
      
      // Aqui você pode querer implementar alguma lógica de polling para verificar 
      // quando o pagamento for concluído, ou simplesmente esperar pelo webhook
    } catch (error) {
      console.error('Erro no checkout:', error);
      Alert.alert('Erro', 'Não foi possível processar seu pagamento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const renderPlan = (plan) => {
    const isSelected = selectedPlan && selectedPlan.id === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        style={[
          styles.planCard,
          isSelected && styles.selectedPlan
        ]}
        onPress={() => setSelectedPlan(plan)}
      >
        <Text style={styles.planName}>{plan.name}</Text>
        <Text style={styles.planPrice}>{plan.price}</Text>
        <Text style={styles.planDescription}>{plan.description}</Text>
        
        <View style={styles.featuresContainer}>
          {plan.features.map((feature, index) => (
            <Text key={index} style={styles.featureText}>• {feature}</Text>
          ))}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Escolha seu Plano</Text>
      <Text style={styles.subtitle}>Selecione o plano ideal para o seu condomínio</Text>
      
      <ScrollView style={styles.plansContainer}>
        {SUBSCRIPTION_PLANS.map(renderPlan)}
      </ScrollView>
      
      <TouchableOpacity
        style={[
          styles.checkoutButton,
          (!selectedPlan || loading) && styles.disabledButton
        ]}
        onPress={handleCheckout}
        disabled={!selectedPlan || loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Assinar Agora</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  plansContainer: {
    flex: 1,
  },
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    elevation: 2,
  },
  selectedPlan: {
    borderColor: '#4CAF50',
    borderWidth: 2,
    backgroundColor: '#f0fff0',
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 18,
    color: '#4CAF50',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  featuresContainer: {
    marginTop: 8,
  },
  featureText: {
    fontSize: 14,
    marginBottom: 4,
  },
  checkoutButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#A5D6A7',
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 

export default SubscriptionScreen;