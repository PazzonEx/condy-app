// src/screens/shared/SubscriptionPlansScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text, Card, Title, Paragraph, Button, ActivityIndicator, Divider, Badge } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks e serviços
import { useAuth } from '../../hooks/useAuth';
import SubscriptionService from '../../services/subscription.service';

// Componentes
import { COLORS, globalStyles } from '../../styles/theme';

const SubscriptionPlansScreen = ({ navigation, route, }) => {
  const {  userProfile } = useAuth();
  const { userType } = route.params;
  
  // Estados
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // Carregar planos disponíveis e assinatura atual
  useEffect(() => {
    loadPlansData();
  }, []);
  
  const loadPlansData = async () => {
    try {
      setLoading(true);
      
      console.log("OOOOOOOOOOOOOOOOOOOOOOLHAAAAAAAAsisema",userType)
      const availablePlans = await SubscriptionService.getPlans(userType);
      setPlans(availablePlans);
      console.log("OOOOOOOOOOOOOOOOOOOOOOLHAAAAAAAA",availablePlans)
      // Carregar assinatura atual
      const subscription = await SubscriptionService.getCurrentSubscription();
      setCurrentSubscription(subscription);
      
      // Pré-selecionar o plano atual ou o primeiro plano
      if (subscription && subscription.planId) {
        setSelectedPlanId(subscription.planId);
      } else if (availablePlans.length > 0) {
        setSelectedPlanId(availablePlans[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de planos:', error);
      Alert.alert('Erro', 'Não foi possível carregar os planos disponíveis');
    } finally {
      setLoading(false);
    }
  };
  
  // Assinar plano selecionado
  const handleSubscribe = async () => {
    if (!selectedPlanId) return;
    
    try {
      setProcessingPayment(true);
      
      // Simular fluxo de pagamento
      // Em um aplicativo real, você redirecionaria para uma tela de checkout
      // ou integraria com um gateway de pagamento
      const paymentMethod = {
        type: 'credit_card',
        last4: '4242'
      };
      
      // Processar assinatura
      const subscription = await SubscriptionService.subscribeToPlan(selectedPlanId, paymentMethod);
      
      // Atualizar estado
      setCurrentSubscription(subscription);
      
      // Mostrar confirmação
      Alert.alert(
        'Assinatura Confirmada',
        `Você assinou com sucesso o plano ${subscription.plan}!`,
        [
          { 
            text: 'OK', 
            onPress: () => {
              // Redirecionar para a tela inicial apropriada
              if (userType === 'condo') {
                navigation.navigate('CondoHome');
              } else if (userType === 'driver') {
                navigation.navigate('DriverHome');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao assinar plano:', error);
      Alert.alert('Erro', 'Não foi possível completar a assinatura. Tente novamente.');
    } finally {
      setProcessingPayment(false);
    }
  };
  
  // Renderizar detalhes da assinatura atual
  const renderCurrentSubscription = () => {
    if (!currentSubscription || currentSubscription.status !== 'active') return null;
    
    const endDate = new Date(currentSubscription.endDate);
    const formattedDate = endDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return (
      <Card style={styles.currentSubCard}>
        <Card.Content>
          <View style={styles.currentSubHeader}>
            <View>
              <Text style={styles.currentSubTitle}>Sua Assinatura Atual</Text>
              <Text style={styles.planName}>{currentSubscription.plan}</Text>
            </View>
            <Badge style={styles.activeBadge}>Ativo</Badge>
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.subDetailsRow}>
            <View style={styles.subDetail}>
              <Text style={styles.subDetailLabel}>Valor Mensal</Text>
              <Text style={styles.subDetailValue}>
                R$ {currentSubscription.price.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.subDetail}>
              <Text style={styles.subDetailLabel}>Próxima Cobrança</Text>
              <Text style={styles.subDetailValue}>{formattedDate}</Text>
            </View>
          </View>
          
          <Text style={styles.upgradeText}>
            Selecione um plano abaixo para fazer upgrade ou cancelar sua assinatura atual.
          </Text>
        </Card.Content>
      </Card>
    );
  };
  
  // Renderizar card de plano
  const renderPlanCard = (plan) => {
    const isSelected = selectedPlanId === plan.id;
    const isCurrentPlan = currentSubscription && currentSubscription.planId === plan.id;
    
    return (
      <TouchableOpacity
        key={plan.id}
        onPress={() => setSelectedPlanId(plan.id)}
        activeOpacity={0.8}
      >
        <Card 
          style={[
            styles.planCard, 
            isSelected && styles.selectedPlanCard,
            plan.id === 'premium' && styles.premiumCard
          ]}
        >
          {plan.id === 'premium' && (
            <View style={styles.recommendedBadge}>
              <Text style={styles.recommendedText}>Recomendado</Text>
            </View>
          )}
          
          <Card.Content>
            <View style={styles.planHeader}>
              <Title style={[
                styles.planName, 
                plan.id === 'premium' && styles.premiumPlanName
              ]}>
                {plan.name}
              </Title>
              
              {isCurrentPlan && (
                <Badge style={styles.currentPlanBadge}>Atual</Badge>
              )}
            </View>
            
            <Text style={styles.planPrice}>
              {plan.price > 0 
                ? `R$ ${plan.price.toFixed(2)}/mês`
                : 'Gratuito'}
            </Text>
            
            <Paragraph style={styles.planDescription}>
              {plan.description}
            </Paragraph>
            
            <Divider style={styles.divider} />
            
            <View style={styles.featuresList}>
              {plan.features.map((feature, index) => (
                <View key={index} style={styles.featureItem}>
                  <MaterialCommunityIcons 
                    name="check-circle" 
                    size={20} 
                    color={plan.id === 'premium' ? COLORS.secondary : COLORS.primary} 
                  />
                  <Text style={styles.featureText}>{feature}</Text>
                </View>
              ))}
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };
  
  // Exibir loading durante o carregamento
  if (loading) {
    return (
      <View style={globalStyles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Carregando planos...</Text>
      </View>
    );
  }
  
  return (
    <View style={globalStyles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.pageTitle}>Planos e Assinaturas</Text>
        <Text style={styles.pageSubtitle}>
          {userType === 'condo'
            ? 'Escolha o plano ideal para o seu condomínio'
            : 'Escolha o plano que atende às suas necessidades'}
        </Text>
        
        {/* Assinatura atual */}
        {renderCurrentSubscription()}
        
        {/* Lista de planos */}
        <View style={styles.plansContainer}>
          {plans.map(plan => renderPlanCard(plan))}
        </View>
        
        {/* Detalhes de pagamento e botão de assinatura */}
        <Card style={styles.paymentCard}>
          <Card.Content>
            <Text style={styles.paymentTitle}>Resumo do Pagamento</Text>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Plano selecionado:</Text>
              <Text style={styles.paymentValue}>
                {plans.find(p => p.id === selectedPlanId)?.name || 'Nenhum'}
              </Text>
            </View>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Preço mensal:</Text>
              <Text style={styles.paymentValue}>
                R$ {plans.find(p => p.id === selectedPlanId)?.price.toFixed(2) || '0.00'}
              </Text>
            </View>
            
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Período:</Text>
              <Text style={styles.paymentValue}>Mensal (Renovação automática)</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.paymentRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>
                R$ {plans.find(p => p.id === selectedPlanId)?.price.toFixed(2) || '0.00'}
              </Text>
            </View>
            
            <Text style={styles.paymentDisclaimer}>
              Ao assinar, você concorda com os termos de serviço e política de privacidade.
              A assinatura será renovada automaticamente mensal, mas você pode cancelar a qualquer momento.
            </Text>
            
            <Button
              mode="contained"
              loading={processingPayment}
              disabled={processingPayment || !selectedPlanId}
              style={styles.subscribeButton}
              onPress={handleSubscribe}
            >
              {currentSubscription?.status === 'active'
                ? 'Atualizar Assinatura'
                : 'Assinar Agora'}
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.grey[600],
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: COLORS.dark,
  },
  pageSubtitle: {
    fontSize: 16,
    color: COLORS.grey[600],
    marginBottom: 24,
  },
  currentSubCard: {
    marginBottom: 24,
    borderRadius: 8,
    elevation: 2,
  },
  currentSubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  currentSubTitle: {
    fontSize: 16,
    color: COLORS.grey[600],
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: COLORS.success,
  },
  divider: {
    marginVertical: 16,
  },
  subDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  subDetail: {
    flex: 1,
  },
  subDetailLabel: {
    fontSize: 14,
    color: COLORS.grey[600],
    marginBottom: 4,
  },
  subDetailValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  upgradeText: {
    fontSize: 14,
    color: COLORS.grey[600],
    fontStyle: 'italic',
  },
  plansContainer: {
    marginBottom: 24,
  },
  planCard: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
    position: 'relative',
  },
  selectedPlanCard: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  premiumCard: {
    borderWidth: 2,
    borderColor: COLORS.secondary,
  },
  recommendedBadge: {
    position: 'absolute',
    top: 0,
    right: 20,
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    zIndex: 1,
  },
  recommendedText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: plan => plan.id === 'premium' ? 8 : 0,
  },
  planName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  premiumPlanName: {
    color: COLORS.secondary,
  },
  currentPlanBadge: {
    backgroundColor: COLORS.primary,
  },
  planPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    marginVertical: 8,
    color: COLORS.dark,
  },
  planDescription: {
    fontSize: 14,
    color: COLORS.grey[600],
    marginBottom: 8,
  },
  featuresList: {
    marginTop: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.grey[700],
  },
  paymentCard: {
    marginBottom: 24,
    borderRadius: 8,
    elevation: 2,
  },
  paymentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.dark,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  paymentLabel: {
    fontSize: 14,
    color: COLORS.grey[600],
  },
  paymentValue: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.dark,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.dark,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  paymentDisclaimer: {
    fontSize: 12,
    color: COLORS.grey[600],
    marginTop: 16,
    marginBottom: 16,
    lineHeight: 16,
  },
  subscribeButton: {
    backgroundColor: COLORS.primary,
  }
});

export default SubscriptionPlansScreen;