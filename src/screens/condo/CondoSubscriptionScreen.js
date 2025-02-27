// src/screens/condo/CondoSubscriptionScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, useTheme, ActivityIndicator, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Serviços
import PaymentService from '../../services/payment.service';

// Componentes
import Button from '../../components/Button';

const CondoSubscriptionScreen = ({ navigation }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);

  // Carregar assinatura atual e planos disponíveis
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Obter assinatura atual
        const subscription = await PaymentService.getCurrentSubscription();
        setCurrentSubscription(subscription);
        
        // Obter planos disponíveis
        const availablePlans = PaymentService.getAllPlans();
        setPlans(availablePlans);
        
        // Definir plano selecionado como o atual
        setSelectedPlan(subscription.planId);
      } catch (error) {
        console.error('Erro ao carregar dados de assinatura:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados da assinatura');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Função para assinar um plano
  const handleSubscribe = async () => {
    // Se for o plano atual, não fazer nada
    if (selectedPlan === currentSubscription.planId) {
      Alert.alert('Informação', 'Você já está inscrito neste plano.');
      return;
    }
    
    // Se for o plano gratuito, apenas mudar
    if (selectedPlan === 'free') {
      try {
        setProcessingPayment(true);
        
        // Se já tem uma assinatura, cancelar
        if (currentSubscription.id) {
          await PaymentService.cancelSubscription(currentSubscription.id);
        }
        
        Alert.alert('Sucesso', 'Seu plano foi alterado para o Plano Gratuito.');
        
        // Atualizar dados
        const subscription = await PaymentService.getCurrentSubscription();
        setCurrentSubscription(subscription);
        setSelectedPlan(subscription.planId);
      } catch (error) {
        console.error('Erro ao mudar para plano gratuito:', error);
        Alert.alert('Erro', 'Não foi possível mudar para o plano gratuito.');
      } finally {
        setProcessingPayment(false);
      }
      return;
    }
    
    // Para planos pagos, mostrar tela de pagamento
    // Neste exemplo, apenas simulamos um pagamento bem-sucedido
    Alert.alert(
      'Pagamento',
      `Deseja assinar o plano ${PaymentService.getPlanDetails(selectedPlan).name} por R$ ${PaymentService.getPlanDetails(selectedPlan).price.toFixed(2)}/mês?`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setProcessingPayment(true);
              
              // Simular processamento de pagamento
              await new Promise(resolve => setTimeout(resolve, 2000));
              
              // Criar nova assinatura
              await PaymentService.createSubscription(
                selectedPlan,
                'credit_card',
                { last4: '1234', brand: 'visa' }
              );
              
              Alert.alert('Sucesso', 'Assinatura realizada com sucesso!');
              
              // Atualizar dados
              const subscription = await PaymentService.getCurrentSubscription();
              setCurrentSubscription(subscription);
            } catch (error) {
              console.error('Erro ao processar assinatura:', error);
              Alert.alert('Erro', 'Não foi possível processar o pagamento.');
            } finally {
              setProcessingPayment(false);
            }
          },
        },
      ]
    );
  };

  // Renderizar um cartão de plano
  const renderPlanCard = (plan) => {
    const isCurrentPlan = currentSubscription && currentSubscription.planId === plan.id;
    const isSelected = selectedPlan === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        onPress={() => setSelectedPlan(plan.id)}
        disabled={processingPayment}
      >
        <Card
          style={[
            styles.planCard,
            isSelected && styles.selectedPlanCard,
            isCurrentPlan && styles.currentPlanCard,
          ]}
        >
          <View style={styles.planHeader}>
            <Text style={styles.planName}>{plan.name}</Text>
            {isCurrentPlan && (
              <Badge style={styles.currentPlanBadge}>
                Atual
              </Badge>
            )}
          </View>
          
          <View style={styles.planPrice}>
            {plan.price > 0 ? (
              <>
                <Text style={styles.currency}>R$</Text>
                <Text style={styles.priceValue}>{plan.price.toFixed(2)}</Text>
                <Text style={styles.priceFrequency}>/{plan.frequency}</Text>
              </>
            ) : (
              <Text style={styles.freeText}>Gratuito</Text>
            )}
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.featuresList}>
            {plan.features.map((feature, index) => (
              <View key={index} style={styles.featureItem}>
                <MaterialCommunityIcons name="check-circle" size={16} color="#4CAF50" style={styles.featureIcon} />
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando informações...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Planos e Assinaturas</Text>
        <Text style={styles.subtitle}>
          Escolha o plano ideal para o seu condomínio
        </Text>
      </View>
      
      {/* Status da assinatura atual */}
      {currentSubscription && (
        <Card style={styles.subscriptionCard}>
          <Card.Content>
            <Text style={styles.subscriptionTitle}>Sua Assinatura Atual</Text>
            <View style={styles.subscriptionDetails}>
              <Text style={styles.subscriptionPlan}>
                Plano {currentSubscription.plan.name}
              </Text>
              
              {currentSubscription.endDate ? (
                <Text style={styles.subscriptionDate}>
                  Validade: {new Date(currentSubscription.endDate).toLocaleDateString()}
                </Text>
              ) : (
                <Text style={styles.subscriptionDate}>
                  Sem data de expiração
                </Text>
              )}
            </View>
          </Card.Content>
        </Card>
      )}
      
      {/* Lista de planos */}
      <View style={styles.plansContainer}>
        {plans.map(plan => renderPlanCard(plan))}
      </View>
      
      {/* Botão de assinatura */}
      <Button
        mode="contained"
        onPress={handleSubscribe}
        loading={processingPayment}
        disabled={processingPayment || (currentSubscription && currentSubscription.planId === selectedPlan)}
        style={styles.subscribeButton}
      >
        {currentSubscription && currentSubscription.planId === selectedPlan
          ? 'Plano Atual'
          : selectedPlan === 'free'
            ? 'Mudar para Plano Gratuito'
            : `Assinar Plano ${PaymentService.getPlanDetails(selectedPlan)?.name}`
        }
      </Button>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
  },
  subscriptionCard: {
    margin: 16,
    borderRadius: 8,
  },
  subscriptionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subscriptionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subscriptionPlan: {
    fontSize: 16,
    fontWeight: '500',
  },
  subscriptionDate: {
    fontSize: 14,
    color: '#757575',
  },
  plansContainer: {
    padding: 16,
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 8,
    padding: 16,
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: '#1E88E5',
  },
  currentPlanCard: {
    backgroundColor: '#E3F2FD',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  currentPlanBadge: {
    backgroundColor: '#4CAF50',
  },
  planPrice: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 16,
  },
  currency: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginHorizontal: 4,
  },
  priceFrequency: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 4,
  },
  freeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  divider: {
    marginBottom: 16,
  },
  featuresList: {
    marginBottom: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureIcon: {
    marginRight: 8,
  },
  featureText: {
    fontSize: 14,
  },
  subscribeButton: {
    margin: 16,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
});

export default CondoSubscriptionScreen;