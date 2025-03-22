// src/services/payment.service.js
import { auth, firestore } from '../config/firebase';
import { doc, collection, addDoc, updateDoc, getDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
// services/PaymentService.js
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { openBrowserAsync } from 'expo-web-browser';

// Configuração do Functions para a região sul-americana
const functions = getFunctions(getApp(), 'southamerica-east1');

// Função para criar uma sessão de checkout do Stripe
export const createCheckoutSession = async (options) => {
  try {
    // Preparar dados do checkout
    const data = {
      priceId: options.priceId,
      mode: options.mode || 'subscription',
      successUrl: options.successUrl || 'https://seu-app.com/sucesso',
      cancelUrl: options.cancelUrl || 'https://seu-app.com/cancelado',
    };

    // Chamar a Cloud Function
    const createCheckout = httpsCallable(functions, 'createCheckoutSession');
    const result = await createCheckout(data);

    // Se tivermos um ID de sessão, abrir o browser para checkout
    if (result.data && result.data.sessionId) {
      // URL do checkout do Stripe
      const checkoutUrl = `https://checkout.stripe.com/pay/${result.data.sessionId}`;
      
      // Abrir o checkout no navegador
      await openBrowserAsync(checkoutUrl);
      
      return { success: true, sessionId: result.data.sessionId };
    } else {
      throw new Error('Sessão de checkout não criada');
    }
  } catch (error) {
    console.error('Erro ao criar sessão de checkout:', error);
    return { 
      success: false, 
      error: error.message || 'Erro desconhecido durante o checkout'
    };
  }
};

// Função para verificar o status da assinatura do usuário
export const checkSubscriptionStatus = async (userId) => {
  try {
    // Essa função assume que você já tem uma lógica para consultar 
    // o Firestore e verificar o status da assinatura
    // Pode ser implementada usando Firebase SDK diretamente
    
    // Exemplo com Firestore:
    // const userDoc = await getDoc(doc(db, 'users', userId));
    const userDoc = await getDoc(doc(firestore, 'users', user.uid));
     return userDoc.exists() ? userDoc.data().subscriptionStatus : null;
    
    // Implementação real aqui
  } catch (error) {
    console.error('Erro ao verificar status da assinatura:', error);
    return null;
  }
};


const PaymentService = {
  /**
   * Planos disponíveis
   */
  plans: {
    free: {
      id: 'free',
      name: 'Gratuito',
      price: 0,
      frequency: 'monthly',
      features: [
        'Até 5 solicitações por mês',
        'Acesso básico ao aplicativo',
        'Suporte por email',
      ],
      limits: {
        maxRequests: 5,
        maxResidents: 10,
      }
    },
    basic: {
      id: 'basic',
      name: 'Básico',
      price: 99.90,
      frequency: 'monthly',
      features: [
        'Até 50 solicitações por mês',
        'Histórico de acesso por 30 dias',
        'Suporte prioritário',
        'Até 50 unidades',
      ],
      limits: {
        maxRequests: 50,
        maxResidents: 100,
      }
    },
    premium: {
      id: 'premium',
      name: 'Premium',
      price: 199.90,
      frequency: 'monthly',
      features: [
        'Solicitações ilimitadas',
        'Histórico completo de acesso',
        'Suporte 24/7',
        'Unidades ilimitadas',
        'Relatórios e estatísticas',
        'Personalização do app',
      ],
      limits: {
        maxRequests: -1, // ilimitado
        maxResidents: -1, // ilimitado
      }
    }
  },

  /**
   * Obter detalhes de um plano
   * @param {string} planId ID do plano
   * @returns {Object} Detalhes do plano
   */
  getPlanDetails(planId) {
    return this.plans[planId] || null;
  },

  /**
   * Obter todos os planos disponíveis
   * @returns {Array} Lista de planos
   */
  getAllPlans() {
    return Object.values(this.plans);
  },

  /**
   * Obter a assinatura atual do usuário
   * @returns {Promise<Object>} Dados da assinatura
   */
  async getCurrentSubscription() {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se é um condomínio
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData || userData.type !== 'condo') {
        throw new Error('Apenas condomínios podem ter assinaturas');
      }

      // Buscar assinatura ativa
      const subscriptionsRef = collection(firestore, 'subscriptions');
      const q = query(
        subscriptionsRef,
        where('condoId', '==', user.uid),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // Se não houver assinatura ativa, retornar o plano gratuito
        return {
          planId: 'free',
          status: 'active',
          startDate: userData.createdAt || serverTimestamp(),
          endDate: null, // sem data de término para o plano gratuito
          plan: this.plans.free
        };
      }

      // Retornar a primeira assinatura ativa encontrada
      const subscription = querySnapshot.docs[0].data();
      subscription.id = querySnapshot.docs[0].id;
      subscription.plan = this.getPlanDetails(subscription.planId);

      return subscription;
    } catch (error) {
      console.error('Erro ao obter assinatura atual:', error);
      throw error;
    }
  },

  /**
   * Criar uma nova assinatura
   * @param {string} planId ID do plano
   * @param {string} paymentMethod Método de pagamento
   * @param {Object} paymentDetails Detalhes do pagamento
   * @returns {Promise<Object>} Dados da nova assinatura
   */
  async createSubscription(planId, paymentMethod, paymentDetails) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      // Verificar se é um condomínio
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      const userData = userDoc.data();

      if (!userData || userData.type !== 'condo') {
        throw new Error('Apenas condomínios podem criar assinaturas');
      }

      // Verificar plano
      const plan = this.getPlanDetails(planId);
      if (!plan) throw new Error('Plano inválido');

      // Criar período de assinatura (1 mês a partir de hoje)
      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + 1);

      // Estrutura da assinatura
      const subscriptionData = {
        condoId: user.uid,
        planId: planId,
        status: 'active',
        startDate: serverTimestamp(),
        endDate: endDate,
        paymentMethod: paymentMethod,
        lastPayment: {
          amount: plan.price,
          date: serverTimestamp(),
          details: paymentDetails
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Adicionar à coleção de assinaturas
      const subscriptionRef = await addDoc(collection(firestore, 'subscriptions'), subscriptionData);
      
      // Atualizar documento do condomínio
      await updateDoc(doc(firestore, 'condos', user.uid), {
        plan: planId,
        subscriptionId: subscriptionRef.id,
        updatedAt: serverTimestamp()
      });

      return {
        id: subscriptionRef.id,
        ...subscriptionData,
        plan: plan
      };
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      throw error;
    }
  },

  /**
   * Cancelar uma assinatura
   * @param {string} subscriptionId ID da assinatura
   * @returns {Promise<boolean>} Sucesso da operação
   */
  async cancelSubscription(subscriptionId) {
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Usuário não autenticado');

      // Atualizar status da assinatura
      await updateDoc(doc(firestore, 'subscriptions', subscriptionId), {
        status: 'canceled',
        canceledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Atualizar documento do condomínio
      await updateDoc(doc(firestore, 'condos', user.uid), {
        plan: 'free',
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  },

  /**
   * Verificar se o usuário atingiu o limite de solicitações
   * @returns {Promise<boolean>} True se o limite foi atingido
   */
  async hasReachedRequestLimit() {
    try {
      const subscription = await this.getCurrentSubscription();
      
      if (!subscription || !subscription.plan) {
        return true; // Se não houver assinatura ou plano, considerar limite atingido
      }

      // Se o plano tem solicitações ilimitadas
      if (subscription.plan.limits.maxRequests === -1) {
        return false;
      }

      // Obter o primeiro dia do mês atual
      const today = new Date();
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Contar solicitações criadas neste mês
      const user = auth.currentUser;
      const requestsRef = collection(firestore, 'access_requests');
      const q = query(
        requestsRef,
        where('condoId', '==', user.uid),
        where('createdAt', '>=', firstDayOfMonth)
      );

      const querySnapshot = await getDocs(q);
      const requestCount = querySnapshot.size;

      return requestCount >= subscription.plan.limits.maxRequests;
    } catch (error) {
      console.error('Erro ao verificar limite de solicitações:', error);
      return true; // Em caso de erro, considerar limite atingido para segurança
    }
  }
};

export default PaymentService;