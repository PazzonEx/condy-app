// src/hooks/useAccessRequests.js
import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import { useAuth } from './useAuth';
import AccessService from '../services/access.service';
import NotificationService from '../services/notification.service';

export const useAccessRequests = () => {
  const { userType, userId } = useAuth();
  
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    authorized: 0,
    completed: 0,
    today: 0
  });
  
  // Carregar solicitações baseadas no tipo de usuário
  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let statusFilter = null;
      
      // Determinar filtro de status baseado na seleção
      if (filter === 'active') {
        statusFilter = ['pending', 'authorized', 'arrived'];
        if (userType === 'resident') {
          statusFilter.push('pending_resident');
        }
      } else if (filter === 'completed') {
        statusFilter = ['completed', 'entered', 'denied', 'canceled'];
      }
      
      // Buscar solicitações do servidor
      const accessRequests = await AccessService.getAccessRequests({
        statusFilter,
        userType,
        userId
      });
      
      // Buscar estatísticas se for condomínio
      if (userType === 'condo') {
        const statsData = await AccessService.getQuickStats();
        setStats({
          pending: statsData.byStatus.pending || 0,
          authorized: statsData.byStatus.authorized || 0,
          completed: statsData.byStatus.completed || 0,
          today: statsData.todayCount || 0
        });
      }
      
      setRequests(accessRequests);
      
      // Aplicar filtro de pesquisa se existir
      filterRequestsBySearch(accessRequests, searchQuery);
    } catch (error) {
      console.error('Erro ao carregar solicitações:', error);
      setError('Não foi possível carregar as solicitações');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, userType, userId, searchQuery]);
  
  // Filtrar solicitações com base na pesquisa
  const filterRequestsBySearch = useCallback((requestsArray, query) => {
    if (!query || query.trim() === '') {
      setFilteredRequests(requestsArray);
    } else {
      const lowerQuery = query.toLowerCase();
      const filtered = requestsArray.filter(req => 
        req.driverName?.toLowerCase().includes(lowerQuery) ||
        req.vehiclePlate?.toLowerCase().includes(lowerQuery) ||
        req.unit?.toString().includes(lowerQuery) ||
        req.block?.toLowerCase().includes(lowerQuery)
      );
      setFilteredRequests(filtered);
    }
  }, []);
  
  // Efeito para carregar solicitações ao iniciar ou mudar filtros
  useEffect(() => {
    loadRequests();
  }, [loadRequests]);
  
  // Efeito para filtrar com base na pesquisa
  useEffect(() => {
    filterRequestsBySearch(requests, searchQuery);
  }, [searchQuery, requests, filterRequestsBySearch]);
  
  // Buscar uma solicitação específica por ID
  const getRequestById = useCallback(async (requestId) => {
    try {
      setLoading(true);
      const request = await AccessService.getAccessRequestById(requestId);
      setSelectedRequest(request);
      return request;
    } catch (error) {
      console.error('Erro ao carregar detalhes da solicitação:', error);
      setError('Não foi possível carregar os detalhes da solicitação');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Criar nova solicitação
  const createRequest = useCallback(async (requestData) => {
    try {
      setLoading(true);
      const newRequest = await AccessService.createAccessRequest(requestData);
      
      // Enviar notificação
      if (newRequest.condoId) {
        await NotificationService.sendNotification({
          targetUserId: newRequest.condoId,
          title: 'Nova solicitação de acesso',
          body: `${newRequest.driverName || 'Um motorista'} solicitou acesso`,
          data: {
            type: 'access_request',
            requestId: newRequest.id
          }
        });
      }
      
      // Atualizar lista
      await loadRequests();
      return newRequest;
    } catch (error) {
      console.error('Erro ao criar solicitação:', error);
      setError('Não foi possível criar a solicitação');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadRequests]);
  
  // Atualizar status da solicitação
  const updateRequestStatus = useCallback(async (requestId, newStatus, additionalData = {}) => {
    try {
      setLoading(true);
      
      // Buscar solicitação atual para enviar notificação adequada
      const currentRequest = await AccessService.getAccessRequestById(requestId);
      
      // Atualizar status
      await AccessService.updateAccessRequestStatus(requestId, newStatus, additionalData);
      
      // Enviar notificação
      let targetUserId, title, body;
      
      switch (newStatus) {
        case 'authorized':
          targetUserId = currentRequest.driverId;
          title = 'Acesso autorizado!';
          body = 'Sua solicitação de acesso foi aprovada';
          break;
        case 'denied':
          targetUserId = currentRequest.driverId;
          title = 'Acesso negado';
          body = 'Sua solicitação de acesso foi negada';
          break;
        case 'arrived':
          targetUserId = currentRequest.residentId;
          title = 'Motorista chegou';
          body = `${currentRequest.driverName || 'O motorista'} chegou ao condomínio`;
          break;
        case 'entered':
          targetUserId = currentRequest.residentId;
          title = 'Motorista entrou';
          body = `${currentRequest.driverName || 'O motorista'} entrou no condomínio`;
          break;
        case 'completed':
          targetUserId = currentRequest.residentId;
          title = 'Acesso concluído';
          body = `${currentRequest.driverName || 'O motorista'} saiu do condomínio`;
          break;
      }
      
      // Enviar notificação se houver um destinatário válido
      if (targetUserId) {
        await NotificationService.sendNotification({
          targetUserId,
          title,
          body,
          data: {
            type: 'access_status_update',
            requestId,
            status: newStatus
          }
        });
      }
      
      // Atualizar lista
      await loadRequests();
      
      // Retornar solicitação atualizada
      return await AccessService.getAccessRequestById(requestId);
    } catch (error) {
      console.error(`Erro ao atualizar status para ${newStatus}:`, error);
      setError(`Não foi possível atualizar o status da solicitação para ${newStatus}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [loadRequests]);
  
  // Aprovar solicitação pendente de morador
  const approveResidentRequest = useCallback(async (requestId) => {
    try {
      setLoading(true);
      
      // Buscar solicitação atual
      const currentRequest = await AccessService.getAccessRequestById(requestId);
      
      // Verificar se usuário é o morador correto
      if (userType !== 'resident' || currentRequest.residentId !== userId) {
        throw new Error('Apenas o morador pode aprovar esta solicitação');
      }
      
      // Atualizar status
      await AccessService.updateAccessRequestStatus(requestId, 'pending');
      
      // Enviar notificação ao condomínio
      await NotificationService.sendNotification({
        targetUserId: currentRequest.condoId,
        title: 'Nova solicitação aprovada pelo morador',
        body: `${currentRequest.driverName || 'Um motorista'} teve acesso aprovado pelo morador`,
        data: {
          type: 'resident_approved',
          requestId
        }
      });
      
      // Atualizar lista
      await loadRequests();
      
      return await AccessService.getAccessRequestById(requestId);
    } catch (error) {
      console.error('Erro ao aprovar solicitação pelo morador:', error);
      setError('Não foi possível aprovar a solicitação');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userType, userId, loadRequests]);
  
  // Negar solicitação pendente de morador
  const denyResidentRequest = useCallback(async (requestId) => {
    try {
      setLoading(true);
      
      // Buscar solicitação atual
      const currentRequest = await AccessService.getAccessRequestById(requestId);
      
      // Verificar se usuário é o morador correto
      if (userType !== 'resident' || currentRequest.residentId !== userId) {
        throw new Error('Apenas o morador pode negar esta solicitação');
      }
      
      // Atualizar status
      await AccessService.updateAccessRequestStatus(requestId, 'denied');
      
      // Enviar notificação ao motorista
      await NotificationService.sendNotification({
        targetUserId: currentRequest.driverId,
        title: 'Acesso negado pelo morador',
        body: 'O morador negou sua solicitação de acesso',
        data: {
          type: 'resident_denied',
          requestId
        }
      });
      
      // Atualizar lista
      await loadRequests();
      
      return await AccessService.getAccessRequestById(requestId);
    } catch (error) {
      console.error('Erro ao negar solicitação pelo morador:', error);
      setError('Não foi possível negar a solicitação');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userType, userId, loadRequests]);
  
  // Cancelar solicitação
  const cancelRequest = useCallback(async (requestId) => {
    try {
      setLoading(true);
      
      // Buscar solicitação atual
      const currentRequest = await AccessService.getAccessRequestById(requestId);
      
      // Atualizar status
      await AccessService.updateAccessRequestStatus(requestId, 'canceled');
      
      // Enviar notificações
      // Se for um cancelamento do motorista, notificar o residente e condomínio
      if (userType === 'driver') {
        // Notificar morador
        await NotificationService.sendNotification({
          targetUserId: currentRequest.residentId,
          title: 'Solicitação cancelada',
          body: `${currentRequest.driverName || 'O motorista'} cancelou a solicitação de acesso`,
          data: {
            type: 'request_canceled',
            requestId
          }
        });
        
        // Notificar condomínio
        await NotificationService.sendNotification({
          targetUserId: currentRequest.condoId,
          title: 'Solicitação cancelada',
          body: `${currentRequest.driverName || 'Um motorista'} cancelou a solicitação de acesso`,
          data: {
            type: 'request_canceled',
            requestId
          }
        });
      }
      // Se for cancelamento do morador, notificar o motorista
      else if (userType === 'resident') {
        await NotificationService.sendNotification({
          targetUserId: currentRequest.driverId,
          title: 'Solicitação cancelada',
          body: 'O morador cancelou a solicitação de acesso',
          data: {
            type: 'request_canceled',
            requestId
          }
        });
      }
      
      // Atualizar lista
      await loadRequests();
      
      return true;
    } catch (error) {
      console.error('Erro ao cancelar solicitação:', error);
      setError('Não foi possível cancelar a solicitação');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [userType, loadRequests]);
  
  // Função para puxar para atualizar
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadRequests();
  }, [loadRequests]);
  
  return {
    // Estados
    requests,
    filteredRequests,
    loading,
    refreshing,
    error,
    filter,
    stats,
    selectedRequest,
    
    // Funções de manipulação de estado
    setFilter,
    setSearchQuery,
    
    // Operações de solicitação
    loadRequests,
    getRequestById,
    createRequest,
    updateRequestStatus,
    approveResidentRequest,
    denyResidentRequest,
    cancelRequest,
    handleRefresh
  };
};