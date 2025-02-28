import FirestoreService from './firestore.service';
import { auth } from '../config/firebase';
import { serverTimestamp } from 'firebase/firestore';

const AccessService = {
  /**
   * Criar uma nova solicitação de acesso
   * @param {Object} requestData - Dados da solicitação
   * @param {string} userType - Tipo de usuário criando a solicitação
   * @returns {Promise<Object>} - Objeto com os dados da solicitação criada
   */
  async createAccessRequest(requestData, userType = null) {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        throw new Error('Usuário não autenticado');
      }

      // Determinar o tipo de usuário se não for fornecido
      if (!userType) {
        const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
        userType = userDoc?.type || 'resident';
      }

      // Dados básicos comuns
      const baseData = {
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending'
      };

      // Personalizar dados baseado no tipo de usuário
      switch (userType) {
        case 'resident':
          return this._createResidentAccessRequest(requestData, baseData);
        
        case 'driver':
          return this._createDriverAccessRequest(requestData, baseData);
        
        case 'condo':
          return this._createCondoAccessRequest(requestData, baseData);
        
        default:
          return this._createGenericAccessRequest(requestData, baseData);
      }
    } catch (error) {
      console.error('Erro ao criar solicitação de acesso:', error);
      throw error;
    }
  },

  /**
   * Criar solicitação de acesso para morador
   * @private
   */
  async _createResidentAccessRequest(requestData, baseData) {
    const currentUser = auth.currentUser;
    
    // Buscar informações do morador
    const residentDoc = await FirestoreService.getDocument('residents', currentUser.uid);
    
    const accessRequestData = {
      ...baseData,
      residentId: currentUser.uid,
      residentName: requestData.driverName || residentDoc?.name || currentUser.displayName,
      
      // Informações do condomínio do morador
      condoId: residentDoc?.condoId || requestData.condoId || 'temp_condo_id',
      unit: requestData.unit || residentDoc?.unit,
      block: requestData.block || residentDoc?.block,
      
      // Informações do motorista
      driverName: requestData.driverName,
      vehiclePlate: requestData.vehiclePlate?.toUpperCase(),
      vehicleModel: requestData.vehicleModel,
      
      // Campos adicionais
      comment: requestData.comment || '',
      type: requestData.type || 'driver'
    };

    return FirestoreService.createDocument('access_requests', accessRequestData);
  },

  /**
   * Criar solicitação de acesso para motorista
   * @private
   */
  async _createDriverAccessRequest(requestData, baseData) {
    const currentUser = auth.currentUser;
    
    // Buscar informações do motorista
    const driverDoc = await FirestoreService.getDocument('drivers', currentUser.uid);
    
    const accessRequestData = {
      ...baseData,
      driverId: currentUser.uid,
      driverName: driverDoc?.name || currentUser.displayName,
      
      // Informações do veículo do motorista
      vehiclePlate: (requestData.vehiclePlate || driverDoc?.vehiclePlate)?.toUpperCase(),
      vehicleModel: requestData.vehicleModel || driverDoc?.vehicleModel,
      
      // Informações do condomínio
      condoId: requestData.condoId || 'temp_condo_id',
      unit: requestData.unit,
      block: requestData.block,
      
      // Campos adicionais
      comment: requestData.comment || '',
      type: requestData.type || 'driver'
    };

    return FirestoreService.createDocument('access_requests', accessRequestData);
  },

  /**
   * Criar solicitação de acesso para condomínio
   * @private
   */
  async _createCondoAccessRequest(requestData, baseData) {
    const currentUser = auth.currentUser;
    
    // Buscar informações do condomínio
    const condoDoc = await FirestoreService.getDocument('condos', currentUser.uid);
    
    const accessRequestData = {
      ...baseData,
      condoId: currentUser.uid,
      condoName: condoDoc?.name || currentUser.displayName,
      
      // Informações do motorista
      driverName: requestData.driverName,
      vehiclePlate: requestData.vehiclePlate?.toUpperCase(),
      vehicleModel: requestData.vehicleModel,
      
      // Informações gerais
      unit: requestData.unit,
      block: requestData.block,
      
      // Campos adicionais
      comment: requestData.comment || '',
      type: requestData.type || 'driver'
    };

    return FirestoreService.createDocument('access_requests', accessRequestData);
  },

  /**
   * Criar solicitação de acesso genérica
   * @private
   */
  async _createGenericAccessRequest(requestData, baseData) {
    // Fallback para quando não é possível determinar o tipo de usuário
    const accessRequestData = {
      ...baseData,
      ...requestData,
      vehiclePlate: requestData.vehiclePlate?.toUpperCase(),
      type: requestData.type || 'driver'
    };

    return FirestoreService.createDocument('access_requests', accessRequestData);
  },

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
          console.log("Driver encontrado:", driver);
        } catch (err) {
          console.warn(`Erro ao carregar dados do motorista: ${err.message}`);
        }
      } else {
        console.warn("ID do motorista não encontrado na solicitação");
      }
      
      // Buscar dados do condomínio
      if (request.condoId) {
        try {
          condo = await FirestoreService.getDocument('condos', request.condoId);
        } catch (err) {
          console.warn(`Erro ao carregar dados do condomínio: ${err.message}`);
        }
      }
      
      // Buscar dados do residente
      if (request.residentId) {
        try {
          resident = await FirestoreService.getDocument('residents', request.residentId);
        } catch (err) {
          console.warn(`Erro ao carregar dados do residente: ${err.message}`);
        }
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
        return { valid:false, message: 'QR Code não contém ID da solicitação' };
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
      // Se for um morador, verificar se a solicitação pertence a ele
      if (request.residentId && request.residentId !== currentUser.uid) {
        // Para motoristas, verificar se a solicitação pertence a ele
        const userProfile = await FirestoreService.getDocument('users', currentUser.uid);
        
        if (userProfile.type === 'driver') {
          if (request.driverId !== currentUser.uid) {
            throw new Error('Você não tem permissão para gerar este QR code');
          }
        } else if (userProfile.type !== 'condo') {
          throw new Error('Você não tem permissão para gerar este QR code');
        }
      }
      
      // Definir tempo de expiração (30 minutos)
      const expiresAt = Date.now() + 30 * 60 * 1000;
      
      // Criar objeto com dados para o QR code
      const qrData = {
        requestId: requestId,
        residentId: request.residentId,
        driverId: request.driverId,
        driverName: request.driverName,
        vehiclePlate: request.vehiclePlate,
        unit: request.unit,
        block: request.block,
        condoId: request.condoId,
        condoName: request.condoName,
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