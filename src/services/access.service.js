import FirestoreService from './firestore.service';
import { auth } from '../config/firebase';
import { serverTimestamp } from 'firebase/firestore';

/**
 * Serviço para gerenciar as solicitações de acesso
 */
const AccessService = {
  /**
   * Criar uma nova solicitação de acesso
   * @param {Object} requestData - Dados da solicitação
   * @returns {Promise<Object>} - Objeto com os dados da solicitação criada
   */

// Modificação no método createAccessRequest em src/services/access.service.js

async createAccessRequest(requestData) {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Verificar o tipo de usuário
    const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
    
    // Se for um condomínio, verificar limite de solicitações
    if (userDoc && userDoc.type === 'condo') {
      // Importar o serviço de pagamento
      const PaymentService = require('./payment.service').default;
      
      // Verificar se atingiu o limite
      const hasReachedLimit = await PaymentService.hasReachedRequestLimit();
      
      if (hasReachedLimit) {
        throw new Error('Limite de solicitações atingido. Faça upgrade do seu plano para continuar.');
      }
    }
    
    // Adicionar campos comuns
    const data = {
      ...requestData,
      residentId: requestData.residentId || currentUser.uid,
      status: 'pending',
      createdBy: currentUser.uid,
    };
    
    // Criar documento no Firestore
    const accessRequest = await FirestoreService.createDocument('access_requests', data);
    
    return accessRequest;
  } catch (error) {
    console.error('Erro ao criar solicitação de acesso:', error);
    throw error;
  }
},
  
  // Em src/services/access.service.js

/**
 * Obter solicitações de acesso com base no tipo de usuário logado
 * @param {string|string[]} status - Status das solicitações (opcional, pode ser único ou array)
 * @param {number} limit - Limite de resultados (opcional)
 * @returns {Promise<Array>} - Array de solicitações de acesso
 */
async getAccessRequests(status = null, limit = null) {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Buscar perfil do usuário para saber o tipo
    const userProfile = await FirestoreService.getDocument('users', currentUser.uid);
    
    if (!userProfile) {
      throw new Error('Perfil de usuário não encontrado');
    }
    
    const conditions = [];
    
    // Adicionar filtro baseado no tipo de usuário
    switch (userProfile.type) {
      case 'resident':
        // Moradores veem apenas suas próprias solicitações
        conditions.push({ field: 'residentId', operator: '==', value: currentUser.uid });
        break;
      case 'driver':
        // Motoristas veem solicitações direcionadas a eles
        conditions.push({ field: 'driverId', operator: '==', value: currentUser.uid });
        break;
      case 'condo':
        // Condomínios veem solicitações para seu condomínio
        conditions.push({ field: 'condoId', operator: '==', value: currentUser.uid });
        break;
      // Admin não precisa de filtro adicional, verá todas as solicitações
    }
    
    // Adicionar filtro de status, se fornecido
    if (status) {
      if (Array.isArray(status)) {
        // Se status for um array, usar in operator
        if (status.length > 0) {
          conditions.push({ field: 'status', operator: 'in', value: status });
        }
      } else {
        // Se status for uma string, usar operador ==
        conditions.push({ field: 'status', operator: '==', value: status });
      }
    }
    
    // Ordenar por data de criação (mais recentes primeiro)
    const sortBy = { field: 'createdAt', direction: 'desc' };
    
    // Buscar solicitações de acesso
    return await FirestoreService.queryDocuments('access_requests', conditions, sortBy, limit);
  } catch (error) {
    console.error('Erro ao obter solicitações de acesso:', error);
    throw error;
  }
},
  
  /**
   * Atualizar o status de uma solicitação de acesso
   * @param {string} requestId - ID da solicitação
   * @param {string} newStatus - Novo status
   * @param {string} comment - Comentário opcional
   * @returns {Promise<boolean>} - true se atualizado com sucesso
   */
  async updateAccessRequestStatus(requestId, newStatus, comment = null) {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }
      
      // Dados a serem atualizados
      const updateData = {
        status: newStatus,
        updatedBy: currentUser.uid,
        updatedAt: serverTimestamp()
      };
      
      // Adicionar comentário, se fornecido
      if (comment) {
        updateData.comment = comment;
      }
      
      // Obter detalhes da solicitação atual para determinar notificação
      const request = await FirestoreService.getDocument('access_requests', requestId);
      
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Atualizar documento no Firestore
      await FirestoreService.updateDocument('access_requests', requestId, updateData);
      
      // Enviar notificação local, se possível
      try {
        let title = '';
        let body = '';
        
        switch (newStatus) {
          case 'authorized':
            title = 'Solicitação Aprovada';
            body = 'Sua solicitação de acesso foi aprovada pela portaria.';
            break;
          case 'denied':
            title = 'Solicitação Negada';
            body = 'Sua solicitação de acesso foi negada pela portaria.';
            break;
          case 'arrived':
            title = 'Motorista Chegou';
            body = 'O motorista chegou e está na portaria.';
            break;
          case 'entered':
            title = 'Motorista Entrou';
            body = 'O motorista entrou no condomínio.';
            break;
          case 'completed':
            title = 'Acesso Concluído';
            body = 'A solicitação de acesso foi concluída com sucesso.';
            break;
          case 'canceled':
            title = 'Solicitação Cancelada';
            body = 'A solicitação de acesso foi cancelada.';
            break;
        }
        
        if (title && body) {
          // Importar o serviço de notificação
          const NotificationService = require('./notification.service').default;
          
          // Enviar notificação local
          await NotificationService.sendLocalNotification(title, body, {
            requestId,
            status: newStatus,
            timestamp: Date.now()
          });
        }
      } catch (notifError) {
        console.error('Erro ao enviar notificação:', notifError);
        // Não interromper o fluxo se a notificação falhar
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar status da solicitação:', error);
      throw error;
    }
  },
  
  /**
   * Obter detalhes de uma solicitação de acesso específica
   * @param {string} requestId - ID da solicitação
   * @returns {Promise<Object>} - Objeto com os dados da solicitação
   */
  async getAccessRequestDetails(requestId) {
    try {
      // Obter documento da solicitação
      const request = await FirestoreService.getDocument('access_requests', requestId);
      
      if (!request) {
        throw new Error('Solicitação não encontrada');
      }
      
      // Carregar dados relacionados
      const [resident, driver, condo] = await Promise.all([
        request.residentId ? FirestoreService.getDocument('residents', request.residentId) : null,
        request.driverId ? FirestoreService.getDocument('drivers', request.driverId) : null,
        request.condoId ? FirestoreService.getDocument('condos', request.condoId) : null
      ]);
      
      // Retornar solicitação com dados relacionados
      return {
        ...request,
        resident,
        driver,
        condo
      };
    } catch (error) {
      console.error('Erro ao obter detalhes da solicitação:', error);
      throw error;
    }
  },
  
  /**
 * Validar um QR code de acesso
 * @param {string} qrData - Dados do QR code
 * @returns {Promise<Object>} - Resultado da validação
 */
async validateAccessQRCode(qrData) {
  try {
    // Verificar se está autenticado
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Decodificar dados do QR
    let decodedData;
    try {
      decodedData = JSON.parse(qrData);
    } catch (error) {
      return { valid: false, message: 'QR Code inválido ou mal-formatado' };
    }
    
    // Verificar se contém o requestId
    if (!decodedData.requestId) {
      return { valid: false, message: 'QR Code não contém ID da solicitação' };
    }
    
    // Obter solicitação de acesso
    const request = await FirestoreService.getDocument('access_requests', decodedData.requestId);
    
    // Verificar se a solicitação existe
    if (!request) {
      return { valid: false, message: 'Solicitação de acesso não encontrada' };
    }
    
    // Verificar se a solicitação está autorizada
    if (request.status !== 'authorized') {
      if (request.status === 'pending') {
        return { valid: false, message: 'Solicitação ainda está pendente' };
      } else if (request.status === 'denied') {
        return { valid: false, message: 'Solicitação foi negada' };
      } else if (request.status === 'canceled') {
        return { valid: false, message: 'Solicitação foi cancelada' };
      } else if (request.status === 'completed' || request.status === 'entered') {
        return { valid: false, message: 'Acesso já foi concedido anteriormente' };
      } else {
        return { valid: false, message: 'Status da solicitação é inválido' };
      }
    }
    
    // Verificar se o QR code expirou
    if (decodedData.expiresAt && decodedData.expiresAt < Date.now()) {
      return { valid: false, message: 'QR Code expirado' };
    }
    
    // Verificar se o condomínio tem permissão para validar o acesso
    if (request.condoId && request.condoId !== currentUser.uid && currentUser.type !== 'admin') {
      // Obter perfil do usuário
      const userProfile = await FirestoreService.getDocument('users', currentUser.uid);
      
      // Verificar se o usuário é funcionário do condomínio ou tem permissão
      if (userProfile.type !== 'condo' && !userProfile.condoId) {
        return { valid: false, message: 'Você não tem permissão para validar este acesso' };
      }
      
      // Verificar se o funcionário pertence ao condomínio correto
      if (userProfile.condoId !== request.condoId) {
        return { valid: false, message: 'Esta solicitação é para outro condomínio' };
      }
    }
    
    // Atualizar status para "arrived" quando o QR code é escaneado
    await FirestoreService.updateDocument('access_requests', decodedData.requestId, {
      status: 'arrived',
      updatedAt: serverTimestamp(),
      scannedBy: currentUser.uid
    });
    
    // QR code válido
    return {
      valid: true,
      request: request,
      message: 'QR Code validado com sucesso'
    };
  } catch (error) {
    console.error('Erro ao validar QR Code:', error);
    return { valid: false, message: 'Erro ao processar o QR Code' };
  }
},
  
/**
 * Gerar dados para QR code de acesso
 * @param {string} requestId - ID da solicitação
 * @returns {Promise<string>} - String JSON para gerar QR code
 */
async generateAccessQRCode(requestId) {
  try {
    // Verificar se está autenticado
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Obter solicitação de acesso
    const request = await FirestoreService.getDocument('access_requests', requestId);
    
    // Verificar se a solicitação existe
    if (!request) {
      throw new Error('Solicitação de acesso não encontrada');
    }
    
    // Verificar se a solicitação está autorizada
    if (request.status !== 'authorized') {
      throw new Error('Solicitação não está autorizada');
    }
    
    // Verificar se o usuário tem permissão para gerar o QR code
    if (request.residentId !== currentUser.uid) {
      throw new Error('Você não tem permissão para gerar este QR code');
    }
    
    // Definir tempo de expiração (30 minutos)
    const expiresAt = Date.now() + 30 * 60 * 1000;
    
    // Criar objeto com dados para o QR code
    const qrData = {
      requestId: requestId,
      residentId: request.residentId,
      driverName: request.driverName,
      vehiclePlate: request.vehiclePlate,
      unit: request.unit,
      block: request.block,
      expiresAt: expiresAt,
      generatedAt: Date.now()
    };
    
    // Retornar string JSON
    return JSON.stringify(qrData);
  } catch (error) {
    console.error('Erro ao gerar QR Code:', error);
    throw error;
  }
}
};

export default AccessService;