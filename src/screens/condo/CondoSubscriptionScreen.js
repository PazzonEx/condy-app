import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import SubscriptionService from '../../services/subscription.service';
import SubscriptionPasswordModal from '../../components/SubscriptionPasswordModal';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const CondoSubscriptionScreen = ({ navigation }) => {
  const { currentUser, isSubscriptionPasswordVerified, resetSubscriptionPasswordVerification } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingPlanChange, setProcessingPlanChange] = useState(false);
  const [hasPassword, setHasPassword] = useState(false);

  // Carregar dados da assinatura atual
  useEffect(() => {
    const loadSubscriptionData = async () => {
      try {
        setLoading(true);
        
        // Verificar se o condomínio tem senha configurada
        const db = getFirestore();
        const condoRef = doc(db, 'condos', currentUser.uid);
        const condoSnap = await getDoc(condoRef);
        
        if (condoSnap.exists() && condoSnap.data().subscriptionPassword) {
          setHasPassword(true);
        } else {
          setHasPassword(false);
        }
        
        // Carregar dados da assinatura
        const subscriptionData = await SubscriptionService.getSubscriptionInfo(currentUser.uid);
        setSubscription(subscriptionData);
      } catch (error) { 
          
        console.log("USER",currentUser.uid);

        console.error('Erro ao carregar dados da assinatura:', error);
        Alert.alert('Erro', 'Não foi possível carregar os dados da assinatura.',currentUser.uid);
      } finally {
        setLoading(false);
      }
    };
    
    loadSubscriptionData();
    
    // Reset da verificação de senha ao sair da tela
    return () => {
      resetSubscriptionPasswordVerification();
    };
  }, [currentUser.uid]);

  // Função para mudar de plano
  const handleChangePlan = async (planId, planName, price) => {
    try {
      setProcessingPlanChange(true);
      
      // Confirmar mudança de plano
      Alert.alert(
        'Confirmar Mudança de Plano',
        `Deseja realmente mudar para o plano ${planName} por R$ ${price.toFixed(2)}/mês?`,
        [
          {
            text: 'Cancelar',
            style: 'cancel',
            onPress: () => setProcessingPlanChange(false)
          },
          {
            text: 'Confirmar',
            onPress: async () => {
              try { 
                // Atualizar assinatura
                await SubscriptionService.updateSubscription(currentUser.uid, planId);
                
                // Atualizar estado local
                setSubscription({
                  ...subscription,
                  planId,
                  planName,
                  price
                });
                
                Alert.alert('Sucesso', `Seu plano foi alterado para ${planName}.`);
              } catch (error) {
                console.error('Erro ao atualizar assinatura:', error);
                Alert.alert('Erro', 'Não foi possível atualizar sua assinatura.');
              } finally {
                setProcessingPlanChange(false);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao processar mudança de plano:', error);
      Alert.alert('Erro', 'Não foi possível processar sua solicitação.');
      setProcessingPlanChange(false);
    }
  };

  // Navegar para a tela de configuração de senha
  const navigateToPasswordSetup = () => {
    navigation.navigate('CondoSubscriptionPassword', {
      isInitialSetup: !hasPassword
    });
  };

  // Renderizar detalhes do plano atual (visível para todos)
  const renderCurrentPlan = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Carregando dados da assinatura...</Text>
        </View>
      );
    }

    return (
      <View style={styles.planContainer}>
        <Text style={styles.planTitle}>Plano Atual</Text>
        <Text style={styles.planName}>{subscription?.planName || 'Plano Básico'}</Text>
        <Text style={styles.planPrice}>
          R$ {subscription?.price?.toFixed(2) || '99.90'}/mês
        </Text>
        
        {subscription?.features && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Recursos Incluídos:</Text>
            {subscription.features.map((feature, index) => (
              <Text key={index} style={styles.featureItem}>• {feature}</Text>
            ))}
          </View>
        )}
        
        <View style={styles.subscriptionInfoContainer}>
          <Text style={styles.infoLabel}>Data de Renovação:</Text>
          <Text style={styles.infoValue}>{subscription?.nextBillingDate || '--/--/----'}</Text>
          
          <Text style={styles.infoLabel}>Status:</Text>
          <Text style={[
            styles.infoValue, 
            { color: subscription?.status === 'active' ? '#28a745' : '#dc3545' }
          ]}>
            {subscription?.status === 'active' ? 'Ativo' : 'Inativo'}
          </Text>
        </View>
      </View>
    );
  };

  // Renderizar botão para acessar alteração de plano
  const renderChangePlanButton = () => {
    if (!isSubscriptionPasswordVerified && hasPassword) {
      return (
        <TouchableOpacity
          style={styles.changePlanButton}
          onPress={() => setShowPasswordModal(true)}
          disabled={loading}
        >
          <Text style={styles.changePlanButtonText}>Alterar Plano</Text>
        </TouchableOpacity>
      );
    } else if (!hasPassword) {
      return (
        <TouchableOpacity
          style={styles.changePlanButton}
          onPress={navigateToPasswordSetup}
          disabled={loading}
        >
          <Text style={styles.changePlanButtonText}>Configurar Senha e Alterar Plano</Text>
        </TouchableOpacity>
      );
    }
    
    return null;
  };

  // Renderizar opções de plano (apenas após autenticação)
  const renderPlanOptions = () => {
    if (!isSubscriptionPasswordVerified && hasPassword) {
      return null;
    }
    
    // Lista de planos disponíveis
    const plans = [
      {
        id: 'basic',
        name: 'Plano Básico',
        price: 99.90,
        features: [
          'Até 50 solicitações por mês',
          'Histórico de 30 dias',
          'Suporte por e-mail'
        ]
      },
      {
        id: 'standard',
        name: 'Plano Standard',
        price: 149.90,
        recommended: true,
        features: [
          'Até 150 solicitações por mês',
          'Histórico de 90 dias',
          'Suporte por chat em horário comercial',
          'Acesso a relatórios básicos'
        ]
      },
      {
        id: 'premium',
        name: 'Plano Premium',
        price: 199.90,
        features: [
          'Solicitações ilimitadas',
          'Histórico completo',
          'Suporte 24/7',
          'Relatórios avançados',
          'API para integração'
        ]
      }
    ];

    return (
      <View style={styles.planOptionsContainer}>
        <Text style={styles.sectionTitle}>Escolha um Novo Plano</Text>
        
        {plans.map(plan => (
          <TouchableOpacity
            key={plan.id}
            style={[
              styles.planOption,
              plan.recommended && styles.recommendedPlan,
              subscription?.planId === plan.id && styles.currentPlanHighlight
            ]}
            onPress={() => handleChangePlan(plan.id, plan.name, plan.price)}
            disabled={processingPlanChange || subscription?.planId === plan.id}
          >
            {plan.recommended && (
              <Text style={styles.recommendedBadge}>Recomendado</Text>
            )}
            
            {subscription?.planId === plan.id && (
              <Text style={styles.currentPlanBadge}>Plano Atual</Text>
            )}
            
            <Text style={styles.planOptionTitle}>{plan.name}</Text>
            <Text style={styles.planOptionPrice}>R$ {plan.price.toFixed(2)}/mês</Text>
            
            {plan.features.map((feature, index) => (
              <Text key={index} style={styles.planOptionDetails}>• {feature}</Text>
            ))}
          </TouchableOpacity>
        ))}
        
        {processingPlanChange && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="small" color="#007bff" />
            <Text style={styles.processingText}>Processando...</Text>
          </View>
        )}
        
        {/* Botões de administração de senha */}
        <View style={styles.adminSection}>
          <TouchableOpacity 
            style={styles.adminButton}
            onPress={navigateToPasswordSetup}
          >
            <Text style={styles.adminButtonText}>
              {hasPassword ? 'Alterar Senha de Acesso' : 'Configurar Senha de Acesso'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <Text style={styles.screenTitle}>Gerenciamento de Assinatura</Text>
        
        {renderCurrentPlan()}
        {renderChangePlanButton()}
        {renderPlanOptions()}
        
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>
            Para suporte de faturamento, entre em contato com nossa equipe:
          </Text>
          <Text style={styles.supportEmail}>suporte@condyapp.com</Text>
        </View>
      </ScrollView>
      
      <SubscriptionPasswordModal
        visible={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        condoId={currentUser.uid}
        onSuccess={() => {
          // Lógica após verificação bem-sucedida
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    margin: 16,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  planContainer: {
    backgroundColor: 'white',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  planTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  planName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planPrice: {
    fontSize: 18,
    color: '#007bff',
    marginBottom: 16,
  },
  featuresContainer: {
    marginBottom: 16,
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
    paddingLeft: 4,
  },
  subscriptionInfoContainer: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
    marginTop: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  changePlanButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    borderRadius: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  changePlanButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  planOptionsContainer: {
    margin: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  planOption: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    position: 'relative',
  },
  recommendedPlan: {
    borderColor: '#007bff',
    borderWidth: 2,
  },
  currentPlanHighlight: {
    borderColor: '#28a745',
    borderWidth: 2,
  },
  recommendedBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#007bff',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentPlanBadge: {
    position: 'absolute',
    top: -10,
    right: 10,
    backgroundColor: '#28a745',
    color: 'white',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 12,
    fontWeight: 'bold',
  },
  planOptionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  planOptionPrice: {
    fontSize: 16,
    color: '#007bff',
    marginBottom: 12,
  },
  planOptionDetails: {
    fontSize: 14,
    color: '#444',
    marginBottom: 4,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  processingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  adminSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: '#ddd',
    paddingTop: 16,
  },
  adminButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  adminButtonText: {
    color: '#444',
    fontWeight: 'bold',
  },
  footerContainer: {
    margin: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  supportEmail: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: '500',
  }
});

export default CondoSubscriptionScreen;