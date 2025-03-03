// src/services/subscription.service.js
import FirestoreService from './firestore.service';
import { auth } from '../config/firebase'; // Ajuste este caminho conforme sua estrutura
import { serverTimestamp } from 'firebase/firestore';

class SubscriptionService {
  /**
   * Obter a assinatura atual do usuário
   */
  async getCurrentSubscription() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuário não autenticado');
      
      // Buscar documento do usuário para obter tipo
      const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
      
      if (!userDoc) throw new Error('Usuário não encontrado');
      
      const userType = userDoc.type;
      
      // Lógica específica por tipo de usuário
      if (userType === 'condo') {
        // Buscar assinatura de condomínio
        const condoDoc = await FirestoreService.getDocument('condos', currentUser.uid);
        
        if (!condoDoc) throw new Error('Condomínio não encontrado');
        
        // Buscar assinatura ativa
        const subscriptions = await FirestoreService.queryDocuments('subscriptions', [
          { field: 'condoId', operator: '==', value: currentUser.uid },
          { field: 'status', operator: '==', value: 'active' }
        ], { field: 'endDate', direction: 'desc' }, 1);
        
        if (subscriptions.length === 0) {
          // Retornar plano básico padrão se não houver assinatura
          return {
            plan: 'Basic',
            status: 'active',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
            price: 99.90,
            usage: 15,
            features: {
              maxResidents: 50,
              maxAccess: 100,
              reports: false,
              history: 30, // dias
              support: 'email'
            }
          };
        }
        
        // Buscar uso atual (solicitações do mês atual)
        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        
        const accessCount = await FirestoreService.queryDocuments('access_requests', [
          { field: 'condoId', operator: '==', value: currentUser.uid },
          { field: 'createdAt', operator: '>=', value: firstDayOfMonth }
        ]);
        
        return {
          id: subscriptions[0].id,
          ...subscriptions[0],
          usage: accessCount.length
        };
      } else if (userType === 'driver') {
        // Lógica para motoristas
        const driverDoc = await FirestoreService.getDocument('drivers', currentUser.uid);
        
        if (!driverDoc) throw new Error('Motorista não encontrado');
        
        // Buscar assinatura ativa
        const subscriptions = await FirestoreService.queryDocuments('subscriptions', [
          { field: 'driverId', operator: '==', value: currentUser.uid },
          { field: 'status', operator: '==', value: 'active' }
        ], { field: 'endDate', direction: 'desc' }, 1);
        
        if (subscriptions.length === 0) {
          // Retornar plano gratuito
          return {
            plan: 'Free',
            status: 'active',
            price: 0,
            usage: driverDoc.accessCount || 0,
            features: {
              maxRequests: 5, // por mês
              priority: false,
              history: 7, // dias
            }
          };
        }
        
        return {
          id: subscriptions[0].id,
          ...subscriptions[0],
          usage: driverDoc.accessCount || 0
        };
      }
      
      throw new Error('Tipo de usuário não suporta assinaturas');
    } catch (error) {
      console.error('Erro ao obter assinatura atual:', error);
      throw error;
    }
  }
  
  /**
   * Obter todos os planos disponíveis
   */
  async getPlans(userType = 'condo') {
    try {
      // Na implementação real, buscar do Firestore
      // Por enquanto, retornar dados fixos
      
      if (userType === 'condo') {
        return [
          {
            id: 'basic',
            name: 'Básico',
            price: 99.90,
            description: 'Ideal para condomínios pequenos',
            features: [
              'Até 50 moradores',
              'Limite de 100 acessos mensais',
              'Histórico de 30 dias',
              'Suporte por e-mail'
            ],
            limits: {
              maxResidents: 50,
              maxAccess: 100,
              reports: false,
              history: 30,
              support: 'email'
            }
          },
          {
            id: 'standard',
            name: 'Standard',
            price: 199.90,
            description: 'Perfeito para condomínios médios',
            features: [
              'Até 200 moradores',
              'Limite de 500 acessos mensais',
              'Relatórios básicos',
              'Histórico de 90 dias',
              'Suporte por telefone'
            ],
            limits: {
              maxResidents: 200,
              maxAccess: 500,
              reports: true,
              history: 90,
              support: 'phone'
            }
          },
          {
            id: 'premium',
            name: 'Premium',
            price: 349.90,
            description: 'Para condomínios de grande porte',
            features: [
              'Moradores ilimitados',
              'Acessos ilimitados',
              'Relatórios avançados',
              'Histórico completo',
              'Suporte prioritário 24/7'
            ],
            limits: {
              maxResidents: Infinity,
              maxAccess: Infinity,
              reports: true,
              history: 365,
              support: 'premium'
            }
          }
        ];
      } else if (userType === 'driver') {
        return [
          {
            id: 'free',
            name: 'Gratuito',
            price: 0,
            description: 'Plano básico para começar',
            features: [
              'Até 5 solicitações por mês',
              'Histórico de 7 dias',
              'Funções básicas'
            ],
            limits: {
              maxRequests: 5,
              priority: false,
              history: 7
            }
          },
          {
            id: 'unlimited',
            name: 'Ilimitado',
            price: 19.90,
            description: 'Acesso sem restrições',
            features: [
              'Solicitações ilimitadas',
              'Prioridade no atendimento',
              'Histórico completo',
              'Notificações avançadas'
            ],
            limits: {
              maxRequests: Infinity,
              priority: true,
              history: 365
            }
          }
        ];
      }
      
      return [];
    } catch (error) {
      console.error('Erro ao obter planos:', error);
      throw error;
    }
  }
  
  /**
   * Assinar um plano
   */
  async subscribeToPlan(planId, paymentMethod) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuário não autenticado');
      
      // Buscar tipo de usuário
      const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
      if (!userDoc) throw new Error('Usuário não encontrado');
      
      const userType = userDoc.type;
      
      // Obter detalhes do plano selecionado
      const plans = await this.getPlans(userType);
      const selectedPlan = plans.find(plan => plan.id === planId);
      
      if (!selectedPlan) throw new Error('Plano não encontrado');
      
      // Criar registro de pagamento
      const paymentData = {
        userId: currentUser.uid,
        userType,
        planId,
        planName: selectedPlan.name,
        amount: selectedPlan.price,
        status: 'completed',
        paymentMethod,
        createdAt: serverTimestamp()
      };
      
      const paymentRef = await FirestoreService.createDocument('payments', paymentData);
      
      // Criar registro de assinatura
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1); // 1 mês à frente
      
      const subscriptionData = {
        userId: currentUser.uid,
        userType,
        planId,
        plan: selectedPlan.name,
        price: selectedPlan.price,
        status: 'active',
        startDate,
        endDate,
        features: selectedPlan.limits,
        paymentId: paymentRef.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Adicionar campos específicos por tipo de usuário
      if (userType === 'condo') {
        subscriptionData.condoId = currentUser.uid;
      } else if (userType === 'driver') {
        subscriptionData.driverId = currentUser.uid;
      }
      
      // Criar ou atualizar assinatura
      const subscriptionRef = await FirestoreService.createDocument('subscriptions', subscriptionData);
      
      return {
        id: subscriptionRef.id,
        ...subscriptionData
      };
    } catch (error) {
      console.error('Erro ao assinar plano:', error);
      throw error;
    }
  }
  
  /**
   * Cancelar uma assinatura
   */
  async cancelSubscription(subscriptionId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuário não autenticado');
      
      // Verificar se a assinatura existe e pertence ao usuário
      const subscription = await FirestoreService.getDocument('subscriptions', subscriptionId);
      
      if (!subscription) throw new Error('Assinatura não encontrada');
      
      if (subscription.userId !== currentUser.uid) {
        throw new Error('Usuário não autorizado a cancelar esta assinatura');
      }
      
      // Atualizar status da assinatura
      await FirestoreService.updateDocument('subscriptions', subscriptionId, {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
        cancelledAt: serverTimestamp(),
        cancelledBy: currentUser.uid
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao cancelar assinatura:', error);
      throw error;
    }
  }
  
  /**
   * Obter histórico de pagamentos
   */
  async getPaymentHistory() {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Usuário não autenticado');
      
      // Buscar histórico de pagamentos
      const payments = await FirestoreService.queryDocuments('payments', [
        { field: 'userId', operator: '==', value: currentUser.uid }
      ], { field: 'createdAt', direction: 'desc' });
      
      return payments;
    } catch (error) {
      console.error('Erro ao obter histórico de pagamentos:', error);
      throw error;
    }
  }
}

export default new SubscriptionService();