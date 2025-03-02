import FirestoreService from './firestore.service';
import NotificationService from './notification.service';
import { auth } from '../config/firebase';
import { serverTimestamp } from 'firebase/firestore';

const AccessService = {
  // Resident approval function
async approveResidentRequest(requestId) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    
    // Get the request
    const request = await FirestoreService.getDocument('access_requests', requestId);
    
    // Validate request
    if (!request) throw new Error('Request not found');
    
    if (request.status !== 'pending_resident') {
      throw new Error('Request is not in the correct state for resident approval');
    }
    
    if (request.residentId !== currentUser.uid) {
      throw new Error('You are not authorized to approve this request');
    }
    
    // Update request status
    const updateData = {
      status: 'pending_gatehouse',
      currentApprovalStage: 'gatehouse',
      residentApproved: true,
      residentApprovedAt: serverTimestamp(),
      residentApprovedBy: currentUser.uid,
      updatedAt: serverTimestamp()
    };
    
    await FirestoreService.updateDocument('access_requests', requestId, updateData);
    
    // Send notification to gatehouse staff
    try {
      // Get condominium staff tokens
      const staffTokens = await this.getCondoStaffTokens(request.condoId);
      
      if (staffTokens.length > 0) {
        const NotificationService = require('./notification.service').default;
        
        // Send notifications to all gatehouse staff
        for (const token of staffTokens) {
          await NotificationService.sendLocalNotification(
            token,
            'New Access Request',
            `New access request approved by resident for ${request.driverName}`,
            {
              requestId: requestId,
              type: 'gatehouse_approval_needed',
              driverName: request.driverName,
              unit: request.unit,
              block: request.block
            }
          );
        }
      }
      
      // Notify the driver as well
      if (request.driverId) {
        const driverDoc = await FirestoreService.getDocument('drivers', request.driverId);
        
        if (driverDoc && driverDoc.notificationToken) {
          await NotificationService.sendLocalNotification(
            driverDoc.notificationToken,
            'Request Update',
            `Your access request for ${request.condoName} has been approved by the resident and is pending gatehouse approval`,
            {
              requestId: requestId,
              type: 'request_update',
              status: 'pending_gatehouse'
            }
          );
        }
      }
    } catch (notifError) {
      console.error('Error sending notifications:', notifError);
      // Continue despite notification error
    }
    
    return true;
  } catch (error) {
    console.error('Error approving resident request:', error);
    throw error;
  }
},

// Resident denial function
async denyResidentRequest(requestId) {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) throw new Error('User not authenticated');
    
    // Get the request
    const request = await FirestoreService.getDocument('access_requests', requestId);
    
    // Validate request
    if (!request) throw new Error('Request not found');
    
    if (request.status !== 'pending_resident') {
      throw new Error('Request is not in the correct state for resident denial');
    }
    
    if (request.residentId !== currentUser.uid) {
      throw new Error('You are not authorized to deny this request');
    }
    
    // Update request status
    const updateData = {
      status: 'denied_by_resident',
      residentApproved: false,
      residentDeniedAt: serverTimestamp(),
      residentDeniedBy: currentUser.uid,
      updatedAt: serverTimestamp()
    };
    
    await FirestoreService.updateDocument('access_requests', requestId, updateData);
    
    // Notify the driver
    if (request.driverId) {
      try {
        const driverDoc = await FirestoreService.getDocument('drivers', request.driverId);
        
        if (driverDoc && driverDoc.notificationToken) {
          const NotificationService = require('./notification.service').default;
          
          await NotificationService.sendLocalNotification(
            driverDoc.notificationToken,
            'Request Denied',
            `Your access request for ${request.condoName} unit ${request.unit} has been denied by the resident`,
            {
              requestId: requestId,
              type: 'request_denied',
              status: 'denied_by_resident'
            }
          );
        }
      } catch (notifError) {
        console.error('Error sending notification to driver:', notifError);
        // Continue despite notification error
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error denying resident request:', error);
    throw error;
  }
},

// Helper function to get condominium staff notification tokens
async getCondoStaffTokens(condoId) {
  try {
    // Get condominium staff members
    const staffMembers = await FirestoreService.queryDocuments('users', [
      { field: 'condoId', operator: '==', value: condoId },
      { field: 'role', operator: '==', value: 'staff' }
    ]);
    
    // Extract notification tokens
    const tokens = staffMembers
      .filter(staff => staff.notificationToken)
      .map(staff => staff.notificationToken);
    
    return tokens;
  } catch (error) {
    console.error('Error getting condo staff tokens:', error);
    return [];
  }
},
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
        throw new Error('User not authenticated');
      }
  
      // Determine user type if not provided
      if (!userType) {
        const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
        userType = userDoc?.type || 'resident';
      }
  
      // Base data common to all requests
      const baseData = {
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        status: 'pending'
      };
  
      // Handle based on user type
      if (userType === 'resident') {
        // Check if the driver is registered in the system
        let driverId = null;
        let driverExists = false;
        
        if (requestData.driverId) {
          // If driver ID is provided, use it directly
          driverId = requestData.driverId;
          driverExists = true;
        } else if (requestData.vehiclePlate) {
          // Try to find a driver by vehicle plate
          const drivers = await FirestoreService.queryDocuments('drivers', [
            { field: 'vehiclePlate', operator: '==', value: requestData.vehiclePlate.toUpperCase() }
          ]);
          
          if (drivers.length > 0) {
            driverId = drivers[0].id;
            driverExists = true;
          }
        }
        
        // Create the request with appropriate data
        const accessRequestData = {
          ...baseData,
          residentId: currentUser.uid,
          residentName: requestData.driverName || userProfile.displayName,
          driverId: driverId,
          driverName: requestData.driverName,
          vehiclePlate: requestData.vehiclePlate?.toUpperCase(),
          vehicleModel: requestData.vehicleModel,
          condoId: requestData.condoId,
          unit: requestData.unit,
          block: requestData.block,
          comment: requestData.comment || '',
          type: requestData.type || 'driver',
          driverExists: driverExists,
          status: driverExists ? 'pending' : 'authorized' // Auto-authorize if driver doesn't exist
        };
        
        // Create the access request
        const createdRequest = await FirestoreService.createDocument('access_requests', accessRequestData);
        
        // If driver exists, send notification
        if (driverExists && driverId) {
          try {
            // Get driver's notification token
            const driverDoc = await FirestoreService.getDocument('drivers', driverId);
            
            if (driverDoc && driverDoc.notificationToken) {
              // Send push notification to driver
              await this.sendDriverNotification(
                driverDoc.notificationToken,
                'New Access Request',
                `${accessRequestData.residentName} has requested your access to their building`,
                {
                  requestId: createdRequest.id,
                  type: 'new_request'
                }
              );
            }
          } catch (notifError) {
            console.error('Error sending notification to driver:', notifError);
            // Continue despite notification error
          }
        }
        
        return createdRequest;
      } else if (userType === 'driver') {
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
    }
    } catch (error) {
      console.error('Erro ao criar solicitação de acesso:', error);
      throw error;
    }
  },
  async createDriverInitiatedRequest(requestData) {
    try {
      // Validate required fields
      if (!requestData.unit) {
        throw new Error('Unit number is required');
      }
      
      if (!requestData.condoId) {
        throw new Error('Condominium ID is required');
      }
      
      // Create base request data
      const currentUser = auth.currentUser;
      const baseData = {
        createdBy: currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        driverId: currentUser.uid,
        status: 'pending_resident',  // New status indicating resident approval needed
        statusFlow: ['pending_resident', 'pending_gatehouse', 'authorized'],
        currentApprovalStage: 'resident'
      };
      
      // Find matching residents by unit and block
      const conditions = [
        { field: 'condoId', operator: '==', value: requestData.condoId },
        { field: 'unit', operator: '==', value: requestData.unit }
      ];
      
      if (requestData.block) {
        conditions.push({ field: 'block', operator: '==', value: requestData.block });
      }
      
      const residents = await FirestoreService.queryDocuments('residents', conditions);
      
      if (residents.length === 0) {
        throw new Error('No matching resident found for this unit and block');
      }
      
      // Get the first matching resident
      const targetResident = residents[0];
      
      // Fetch driver details
      const driverData = await FirestoreService.getDocument('drivers', currentUser.uid);
      
      // Fetch condominium details
      const condoData = await FirestoreService.getDocument('condos', requestData.condoId);
      
      // Create the access request
      const accessRequestData = {
        ...baseData,
        ...requestData,
        
        // Driver information
        driverName: driverData?.name || currentUser.displayName,
        vehiclePlate: driverData?.vehiclePlate?.toUpperCase() || requestData.vehiclePlate?.toUpperCase(),
        vehicleModel: driverData?.vehicleModel || requestData.vehicleModel,
        
        // Resident information
        residentId: targetResident.id,
        residentName: targetResident.name || targetResident.displayName,
        
        // Condominium information
        condoName: condoData?.name || 'Unknown Condominium',
        condoAddress: condoData?.address || '',
        
        // Important flags for workflow
        residentApproved: false,
        gatehouseApproved: false,
        
        // Request metadata
        requestType: 'driver_initiated'
      };
      
      // Create the request document
      const createdRequest = await FirestoreService.createDocument('access_requests', accessRequestData);
      
      // Send notification to resident
      if (targetResident.notificationToken) {
        try {
          // Import notification service
          const NotificationService = require('./notification.service').default;
          
          await NotificationService.sendLocalNotification(
            targetResident.notificationToken,
            'New Access Request',
            `Driver ${accessRequestData.driverName} is requesting access to your unit`,
            {
              requestId: createdRequest.id,
              type: 'resident_approval_needed',
              driverName: accessRequestData.driverName,
              vehiclePlate: accessRequestData.vehiclePlate
            }
          );
        } catch (notifError) {
          console.error('Error sending notification to resident:', notifError);
          // Continue despite notification error
        }
      }
      
      return createdRequest;
    } catch (error) {
      console.error('Error creating driver-initiated request:', error);
      throw error;
    }
  },
// Helper method to send notification to driver
async sendDriverNotification(token, title, body, data) {
  // Implementation depends on your notification service
  // For example, using Firebase Cloud Messaging
  try {
    const message = {
      token: token,
      notification: {
        title: title,
        body: body
      },
      data: data
    };
    
    // Send the message - implementation depends on your notification system
    // await admin.messaging().send(message);
    // This would require server-side implementation
    
    // For local notification via Expo
    await NotificationService.sendRemoteNotification(token, title, body, data);
    
    return true;
  } catch (error) {
    console.error('Error sending driver notification:', error);
    throw error;
  }
},

  
  /**
   * Criar solicitação de acesso para morador
   * @private
   */
  // In AccessService.js - _createResidentAccessRequest method
async _createResidentAccessRequest(requestData, baseData) {
  const currentUser = auth.currentUser;
  
  // Fetch resident information first to ensure we have proper data
  const residentDoc = await FirestoreService.getDocument('residents', currentUser.uid);
  
  if (!residentDoc) {
    throw new Error('Resident profile not found');
  }
  
  // Fetch condominium information
  let condoData = null;
  if (residentDoc.condoId) {
    condoData = await FirestoreService.getDocument('condos', residentDoc.condoId);
  }
  
  // Check if driver exists
  let driverId = null;
  let driverData = null;
  let driverExists = false;
  
  if (requestData.driverId) {
    // If driver ID is provided, use it directly
    driverId = requestData.driverId;
    driverData = await FirestoreService.getDocument('drivers', driverId);
    driverExists = !!driverData;
  } else if (requestData.vehiclePlate) {
    // Try to find a driver by vehicle plate
    const drivers = await FirestoreService.queryDocuments('drivers', [
      { field: 'vehiclePlate', operator: '==', value: requestData.vehiclePlate.toUpperCase() }
    ]);
    
    if (drivers.length > 0) {
      driverId = drivers[0].id;
      driverData = drivers[0];
      driverExists = true;
    }
  }
  
  // Create the request with complete data
  const accessRequestData = {
    ...baseData,
    // Resident Information
    residentId: currentUser.uid,
    residentName: residentDoc.name || currentUser.displayName,
    
    // Condominium Information
    condoId: residentDoc.condoId || requestData.condoId,
    condoName: condoData ? condoData.name : (requestData.condoName || 'Unknown Condominium'),
    
    // Location Information
    unit: requestData.unit || residentDoc.unit || '',
    block: requestData.block || residentDoc.block || '',
    
    // Driver Information
    driverId: driverId,
    driverName: requestData.driverName,
    driverExists: driverExists,
    
    // Vehicle Information
    vehiclePlate: requestData.vehiclePlate?.toUpperCase() || '',
    vehicleModel: requestData.vehicleModel || '',
    
    // Request Details
    comment: requestData.comment || '',
    type: requestData.type || 'driver',
    
    // Auto-authorize if driver doesn't exist since they can't respond
    status: driverExists ? 'pending' : 'authorized'
  };
  
  // Create the access request document
  const createdRequest = await FirestoreService.createDocument('access_requests', accessRequestData);
  
  // Send notification to driver if they exist
  if (driverExists && driverId && driverData.notificationToken) {
    try {
      // Import notification service
      const NotificationService = require('./notification.service').default;
      
      // Send notification
      await NotificationService.sendLocalNotification(
        'New Access Request',
        `${accessRequestData.residentName} has requested access for you at ${accessRequestData.condoName}`,
        {
          requestId: createdRequest.id,
          type: 'access_request',
          condoName: accessRequestData.condoName,
          unit: accessRequestData.unit,
          block: accessRequestData.block
        }
      );
    } catch (notifError) {
      console.error('Error sending notification to driver:', notifError);
      // Continue despite notification error
    }
  }
  
  return createdRequest;
},
  /**
   * Criar solicitação de acesso para motorista
   * @private
   */
  // Em AccessService.js - Método para criar solicitação iniciada pelo motorista
async _createDriverAccessRequest(requestData, baseData) {
  const currentUser = auth.currentUser;
  
  // Buscar informações do motorista
  const driverDoc = await FirestoreService.getDocument('drivers', currentUser.uid);
  
  if (!driverDoc) {
    throw new Error('Perfil de motorista não encontrado');
  }
  
  // Validar se unidade e bloco foram informados
  if (!requestData.unit) {
    throw new Error('Número da unidade é obrigatório');
  }
  
  // Buscar morador pelo condomínio, unidade e bloco
  const conditions = [
    { field: 'condoId', operator: '==', value: requestData.condoId },
    { field: 'unit', operator: '==', value: requestData.unit }
  ];
  
  // Adicionar bloco à consulta se fornecido
  if (requestData.block) {
    conditions.push({ field: 'block', operator: '==', value: requestData.block });
  }
  
  const residents = await FirestoreService.queryDocuments('residents', conditions);
  
  if (residents.length === 0) {
    throw new Error('Nenhum morador encontrado para esta unidade');
  }
  
  // Se houver vários moradores, usar o primeiro (pode ser melhorado para seleção)
  const residentData = residents[0];
  
  // Buscar informações do condomínio
  const condoData = await FirestoreService.getDocument('condos', requestData.condoId);
  
  // Criar dados da solicitação com informações completas
  const accessRequestData = {
    ...baseData,
    // Informações do motorista
    driverId: currentUser.uid,
    driverName: driverDoc.name || currentUser.displayName,
    vehiclePlate: driverDoc.vehiclePlate || '',
    vehicleModel: driverDoc.vehicleModel || '',
    
    // Informações do condomínio
    condoId: requestData.condoId,
    condoName: condoData ? condoData.name : 'Condomínio não identificado',
    
    // Informações da localização
    unit: requestData.unit,
    block: requestData.block || '',
    
    // Informações do morador
    residentId: residentData.id,
    residentName: residentData.name || residentData.displayName || 'Morador não identificado',
    
    // Detalhes da solicitação
    comment: requestData.comment || '',
    type: requestData.type || 'driver',
    status: 'pending_resident', // Status especial aguardando aprovação do morador
    flowType: 'driver_initiated'
  };
  
  // Criar o documento da solicitação de acesso
  const createdRequest = await FirestoreService.createDocument('access_requests', accessRequestData);
  
  // Enviar notificação para o morador
  try {
    // Importar serviço de notificação
    const NotificationService = require('./notification.service').default;
    
    if (residentData.notificationToken) {
      // Enviar notificação push
      await NotificationService.sendLocalNotification(
        'Nova Solicitação de Acesso',
        `${accessRequestData.driverName} solicitou acesso à sua unidade`,
        {
          requestId: createdRequest.id,
          type: 'resident_approval_needed',
          driverName: accessRequestData.driverName,
          vehiclePlate: accessRequestData.vehiclePlate
        }
      );
    }
  } catch (notifError) {
    console.error('Erro ao enviar notificação para o morador:', notifError);
    // Continuar mesmo com erro na notificação
  }
  
  return createdRequest;
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
  // Em AccessService.js - Método para atualizar status
async updateAccessRequestStatus(requestId, newStatus, comment = null) {
  try {
    // Obter detalhes da solicitação atual
    const request = await FirestoreService.getDocument('access_requests', requestId);
    
    if (!request) {
      throw new Error('Solicitação não encontrada');
    }
    
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
    
    // Atualizar documento no Firestore
    await FirestoreService.updateDocument('access_requests', requestId, updateData);
    
    // Enviar notificações apropriadas com base na mudança de status
    try {
      const NotificationService = require('./notification.service').default;
      
      // Fluxo iniciado pelo motorista
      if (request.flowType === 'driver_initiated') {
        if (newStatus === 'pending') {
          // Morador aprovou, notificar portaria
          await NotificationService.notifyGatehouse(
            request.condoId,
            'Nova Solicitação de Acesso',
            `${request.driverName} tem acesso autorizado pelo morador para a unidade ${request.unit}${request.block ? ` Bloco ${request.block}` : ''}`,
            { requestId, type: 'new_approved_request' }
          );
          
          // Notificar motorista que morador aprovou
          await NotificationService.notifyDriver(
            request.driverId,
            'Acesso Aprovado pelo Morador',
            `Sua solicitação para a unidade ${request.unit}${request.block ? ` Bloco ${request.block}` : ''} foi aprovada pelo morador`,
            { requestId, type: 'resident_approved' }
          );
        } else if (newStatus === 'denied') {
          // Morador recusou, notificar motorista
          await NotificationService.notifyDriver(
            request.driverId,
            'Acesso Recusado',
            `Sua solicitação para a unidade ${request.unit}${request.block ? ` Bloco ${request.block}` : ''} foi recusada pelo morador`,
            { requestId, type: 'resident_denied' }
          );
        }
      }
      
      // Notificações comuns para ambos os fluxos
      switch (newStatus) {
        case 'authorized':
          // Portaria aprovou, notificar morador e motorista
          await NotificationService.notifyResident(
            request.residentId,
            'Acesso Aprovado pela Portaria',
            `O acesso para ${request.driverName} foi autorizado pela portaria`,
            { requestId, type: 'condo_approved' }
          );
          
          await NotificationService.notifyDriver(
            request.driverId,
            'Acesso Autorizado',
            `Seu acesso ao condomínio ${request.condoName} foi autorizado`,
            { requestId, type: 'condo_approved' }
          );
          break;
          
        case 'denied':
          // Portaria negou, notificar morador e motorista (se não foi o morador que negou)
          if (request.status !== 'denied') {
            await NotificationService.notifyResident(
              request.residentId,
              'Acesso Negado pela Portaria',
              `O acesso para ${request.driverName} foi negado pela portaria`,
              { requestId, type: 'condo_denied' }
            );
            
            await NotificationService.notifyDriver(
              request.driverId,
              'Acesso Negado',
              `Seu acesso ao condomínio ${request.condoName} foi negado pela portaria`,
              { requestId, type: 'condo_denied' }
            );
          }
          break;
          
        // Adicione outros casos conforme necessário
      }
    } catch (notifError) {
      console.error('Erro ao enviar notificações:', notifError);
      // Continuar mesmo com erro nas notificações
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