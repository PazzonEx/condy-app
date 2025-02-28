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



// Modificação em src/services/access.service.js - método createAccessRequest

async createAccessRequest(requestData) {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Se não tiver um driverId explícito, mas tiver driverName, usar essa informação
    if (!requestData.driverId && requestData.driverName) {
      // Buscar motorista por nome
      try {
        const drivers = await FirestoreService.queryDocuments('drivers', [
          { field: 'name', operator: '==', value: requestData.driverName }
        ]);
        
        if (drivers.length > 0) {
          requestData.driverId = drivers[0].id;
          console.log(`Encontrado motorista pelo nome: ${drivers[0].id}`);
        }
      } catch (error) {
        console.warn('Erro ao buscar motorista por nome:', error);
      }
    }
    
    // Garantir que o driverName está presente
    if (!requestData.driverName && currentUser.displayName) {
      requestData.driverName = currentUser.displayName;
    }
    
    // Resto do código...
  } catch (error) {
    console.error('Erro ao criar solicitação de acesso:', error);
    throw error;
  }
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Verificar se há um condoId válido
    if (!requestData.condoId) {
      throw new Error('É necessário especificar um condomínio para a solicitação');
    }
    
    // Se não tiver informações do condomínio, buscar do banco de dados
    if (!requestData.condoName || !requestData.condoAddress) {
      try {
        const condoDoc = await FirestoreService.getDocument('condos', requestData.condoId);
        if (condoDoc) {
          requestData.condoName = condoDoc.name;
          requestData.condoAddress = condoDoc.address;
        }
      } catch (error) {
        console.warn('Erro ao buscar detalhes do condomínio:', error);
      }
    }
    
    // Adicionar campos comuns
    const data = {
      ...requestData,
      driverId: requestData.driverId || currentUser.uid,
      createdBy: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // Garantir que todas as informações importantes estejam presentes
    if (!data.driverName && currentUser.displayName) {
      data.driverName = currentUser.displayName;
    }
    
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
// Atualizar a função getAccessRequests em src/services/access.service.js

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
    
    console.log('Buscando solicitações para usuário tipo:', userProfile.type);
    console.log('ID do usuário:', currentUser.uid);
    
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
        console.log('Adicionando filtro de condoId para condomínio:', currentUser.uid);
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
    
    console.log('Condições de busca:', JSON.stringify(conditions));
    
    // Ordenar por data de criação (mais recentes primeiro)
    const sortBy = { field: 'createdAt', direction: 'desc' };
    
    // Buscar solicitações de acesso
    const requests = await FirestoreService.queryDocuments('access_requests', conditions, sortBy, limit);
    console.log(`Encontradas ${requests.length} solicitações`);
    
    return requests;
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
      
      // Carregar dados relacionados com tratamento de erro melhorado
      let resident = null;
      let driver = null;
      let condo = null;
      
      // Carregar dados do motorista
      if (request.driverId) {
        try {
          driver = await FirestoreService.getDocument('drivers', request.driverId);
          console.log("Driver encontrado:", driver); // Adicione este log
        } catch (err) {
          console.warn(`Erro ao carregar dados do motorista: ${err.message}`);
        }
      } else {
        console.warn("ID do motorista não encontrado na solicitação");
      }
      
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