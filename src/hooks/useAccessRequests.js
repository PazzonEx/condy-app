import { useState, useEffect } from 'react';
import FirestoreService from '../services/firestore.service';
import { useAuth } from './useAuth';

// Hook para gerenciar solicitações de acesso
const useAccessRequests = (requestType = 'all') => {
  const { currentUser, userProfile } = useAuth();
  const [accessRequests, setAccessRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar solicitações de acesso
  const loadAccessRequests = async () => {
    if (!currentUser || !userProfile) {
      setAccessRequests([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const conditions = [];
      
      // Filtrar com base no tipo de usuário
      switch (userProfile.type) {
        case 'resident':
          // Para moradores, mostrar apenas suas próprias solicitações
          conditions.push({ field: 'residentId', operator: '==', value: currentUser.uid });
          break;
        case 'driver':
          // Para motoristas, mostrar apenas solicitações direcionadas a eles
          conditions.push({ field: 'driverId', operator: '==', value: currentUser.uid });
          break;
        case 'condo':
          // Para condomínios, mostrar solicitações para esse condomínio
          conditions.push({ field: 'condoId', operator: '==', value: currentUser.uid });
          break;
        case 'admin':
          // Admins podem ver todas as solicitações, sem filtro adicional
          break;
        default:
          break;
      }
      
      // Filtrar por tipo de solicitação, se especificado
      if (requestType !== 'all') {
        conditions.push({ field: 'status', operator: '==', value: requestType });
      }

      // Ordenar por data de criação, mais recentes primeiro
      const sortBy = { field: 'createdAt', direction: 'desc' };
      
      // Buscar solicitações de acesso
      const requests = await FirestoreService.queryDocuments('access_requests', conditions, sortBy);
      
      // Carregar informações adicionais para cada solicitação
      const requestsWithDetails = await Promise.all(
        requests.map(async (request) => {
          try {
            // Obter informações do motorista
            let driverInfo = null;
            if (request.driverId) {
              driverInfo = await FirestoreService.getDocument('drivers', request.driverId);
            }
            
            // Obter informações do morador
            let residentInfo = null;
            if (request.residentId) {
              residentInfo = await FirestoreService.getDocument('residents', request.residentId);
            }
            
            // Obter informações do condomínio
            let condoInfo = null;
            if (request.condoId) {
              condoInfo = await FirestoreService.getDocument('condos', request.condoId);
            }
            
            return {
              ...request,
              driver: driverInfo,
              resident: residentInfo,
              condo: condoInfo
            };
          } catch (err) {
            console.error('Erro ao carregar detalhes da solicitação:', err);
            return request;
          }
        })
      );
      
      setAccessRequests(requestsWithDetails);
    } catch (err) {
      console.error('Erro ao carregar solicitações de acesso:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Criar uma nova solicitação de acesso
  const createAccessRequest = async (data) => {
    setError(null);
    try {
      // Adicionar IDs do usuário atual
      const requestData = {
        ...data,
        residentId: userProfile.type === 'resident' ? currentUser.uid : data.residentId,
        status: 'pending'
      };
      
      const newRequest = await FirestoreService.createDocument('access_requests', requestData);
      
      // Atualizar a lista de solicitações
      setAccessRequests(prev => [newRequest, ...prev]);
      
      return newRequest;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Atualizar o status de uma solicitação
  const updateAccessStatus = async (requestId, newStatus, comment = null) => {
    setError(null);
    try {
      const updateData = {
        status: newStatus,
        updatedBy: currentUser.uid
      };
      
      if (comment) {
        updateData.comment = comment;
      }
      
      await FirestoreService.updateDocument('access_requests', requestId, updateData);
      
      // Atualizar a lista de solicitações
      setAccessRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, ...updateData } : req
        )
      );
      
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Carregar solicitações quando o componente montar ou quando mudar o usuário/tipo
  useEffect(() => {
    if (currentUser) {
      loadAccessRequests();
    }
  }, [currentUser, userProfile, requestType]);

  return {
    accessRequests,
    loading,
    error,
    loadAccessRequests,
    createAccessRequest,
    updateAccessStatus
  };
};

export default useAccessRequests;