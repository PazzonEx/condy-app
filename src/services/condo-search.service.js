// src/services/condo-search.service.js
import FirestoreService from './firestore.service';
import { auth } from '../config/firebase';

/**
 * Serviço de busca e gerenciamento de condomínios
 */
const CondoSearchService = {
  /**
   * Buscar condomínios com filtros avançados
   * @param {Object} searchParams - Parâmetros de busca
   * @returns {Promise<Array>} Lista de condomínios encontrados
   */
  async searchCondos(searchParams = {}) {
    try {
      const {
        query = '',
        maxResults = 50,
        onlyActive = true,
        verified = null,
        minUnits = 0,
        maxUnits = Infinity,
        city = null,
        state = null,
        sortBy = 'name',
        sortOrder = 'asc'
      } = searchParams;

      // Buscar todos os condomínios
      const allCondos = await FirestoreService.getCollection('condos');
      
      // Aplicar filtros
      const filteredCondos = allCondos.filter(condo => {
        // Filtro de status ativo
        if (onlyActive && condo.status !== 'active') return false;
        
        // Filtro de verificação
        if (verified !== null && condo.verified !== verified) return false;
        
        // Filtro de número de unidades
        const units = condo.units || 0;
        if (units < minUnits || units > maxUnits) return false;
        
        // Filtro de cidade e estado
        if (city && condo.city !== city) return false;
        if (state && condo.state !== state) return false;
        
        // Busca textual (nome, endereço)
        if (query.trim()) {
          const queryLower = query.toLowerCase();
          const matchesName = condo.name?.toLowerCase().includes(queryLower);
          const matchesAddress = condo.address?.toLowerCase().includes(queryLower);
          
          if (!matchesName && !matchesAddress) return false;
        }
        
        return true;
      });
      
      // Ordenar resultados
      const sortedCondos = filteredCondos.sort((a, b) => {
        const valueA = a[sortBy] || '';
        const valueB = b[sortBy] || '';
        
        return sortOrder === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      });
      
      // Limitar resultados
      const limitedCondos = sortedCondos.slice(0, maxResults);
      
      // Formatar resultados
      return limitedCondos.map(condo => ({
        id: condo.id,
        name: condo.name || '',
        address: condo.address || '',
        units: condo.units || 0,
        blocks: condo.blocks || 0,
        city: condo.city || '',
        state: condo.state || '',
        phone: condo.phone || '',
        coverImageUrl: condo.coverImageUrl || null,
        verified: !!condo.verified,
        accessRules: condo.accessRules || []
      }));
    } catch (error) {
      console.error('Erro na busca de condomínios:', error);
      throw error;
    }
  },

  /**
   * Obter detalhes de um condomínio específico
   * @param {string} condoId - ID do condomínio
   * @returns {Promise<Object>} Detalhes do condomínio
   */
  async getCondoDetails(condoId) {
    try {
      if (!condoId) {
        throw new Error('ID do condomínio não fornecido');
      }

      const condo = await FirestoreService.getDocument('condos', condoId);
      
      if (!condo) {
        throw new Error('Condomínio não encontrado');
      }

      // Buscar informações adicionais
      const [residents, drivers] = await Promise.all([
        FirestoreService.queryDocuments('residents', [
          { field: 'condoId', operator: '==', value: condoId }
        ]),
        FirestoreService.queryDocuments('drivers', [
          { field: 'condosServed', operator: 'array-contains', value: condoId }
        ])
      ]);

      return {
        id: condo.id,
        name: condo.name || '',
        address: condo.address || '',
        units: condo.units || 0,
        blocks: condo.blocks || 0,
        phone: condo.phone || '',
        email: condo.email || '',
        coverImageUrl: condo.coverImageUrl || null,
        verified: !!condo.verified,
        accessRules: condo.accessRules || [],
        socialMediaLinks: condo.socialMediaLinks || {},
        stats: {
          totalResidents: residents.length,
          totalDrivers: drivers.length,
          activeRequests: 0 // Você pode adicionar lógica para contar solicitações ativas
        }
      };
    } catch (error) {
      console.error('Erro ao buscar detalhes do condomínio:', error);
      throw error;
    }
  },

  /**
   * Verificar se o motorista pode solicitar acesso a um condomínio
   * @param {string} condoId - ID do condomínio
   * @returns {Promise<boolean>} Indica se o motorista pode solicitar acesso
   */
  async canDriverRequestAccess(condoId) {
    try {
      // Verificar se há usuário autenticado
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Buscar dados do motorista
      const driverDoc = await FirestoreService.getDocument('drivers', user.uid);
      
      if (!driverDoc) {
        throw new Error('Perfil de motorista não encontrado');
      }

      // Verificar status do motorista
      if (driverDoc.status !== 'active') {
        return false;
      }

      // Verificar se o motorista está disponível
      if (driverDoc.isAvailable === false) {
        return false;
      }

      // Buscar detalhes do condomínio
      const condoDoc = await FirestoreService.getDocument('condos', condoId);
      
      if (!condoDoc || condoDoc.status !== 'active') {
        return false;
      }

      // Verificar se o motorista está autorizado neste condomínio
      // Adicione lógicas adicionais conforme necessário, como:
      // - Verificação de serviço específico (entrega, transporte, etc)
      // - Restrições de horário
      // - Verificação de documentos

      return true;
    } catch (error) {
      console.error('Erro ao verificar acesso do motorista:', error);
      return false;
    }
  }
};

export default CondoSearchService;
