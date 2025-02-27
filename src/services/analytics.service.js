// src/services/analytics.service.js
import { firestore } from '../config/firebase';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';

const AnalyticsService = {
  /**
   * Gerar relatório de acessos por período
   * @param {string} condoId ID do condomínio
   * @param {Date} startDate Data inicial
   * @param {Date} endDate Data final
   * @returns {Promise<Object>} Dados estatísticos
   */
  async generateAccessReport(condoId, startDate, endDate) {
    try {
      const accessQuery = query(
        collection(firestore, 'access_requests'),
        where('condoId', '==', condoId),
        where('createdAt', '>=', Timestamp.fromDate(startDate)),
        where('createdAt', '<=', Timestamp.fromDate(endDate)),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(accessQuery);
      const accessData = [];
      
      querySnapshot.forEach(doc => {
        accessData.push({ id: doc.id, ...doc.data() });
      });
      
      // Processar estatísticas
      const stats = {
        totalRequests: accessData.length,
        byStatus: {
          pending: accessData.filter(req => req.status === 'pending').length,
          authorized: accessData.filter(req => req.status === 'authorized').length,
          denied: accessData.filter(req => req.status === 'denied').length,
          arrived: accessData.filter(req => req.status === 'arrived').length,
          entered: accessData.filter(req => req.status === 'entered').length,
          completed: accessData.filter(req => req.status === 'completed').length,
          canceled: accessData.filter(req => req.status === 'canceled').length,
        },
        byDay: {},
        byTimeOfDay: {
          morning: 0,   // 6-12h
          afternoon: 0, // 12-18h
          evening: 0,   // 18-22h
          night: 0      // 22-6h
        },
        topDrivers: {},
        topUnits: {}
      };
      
      // Processar estatísticas por dia, motorista e unidade
      accessData.forEach(req => {
        if (req.createdAt) {
          const date = req.createdAt.toDate();
          const dateStr = date.toISOString().split('T')[0];
          const hours = date.getHours();
          
          // Contagem por dia
          if (!stats.byDay[dateStr]) stats.byDay[dateStr] = 0;
          stats.byDay[dateStr]++;
          
          // Contagem por período do dia
          if (hours >= 6 && hours < 12) stats.byTimeOfDay.morning++;
          else if (hours >= 12 && hours < 18) stats.byTimeOfDay.afternoon++;
          else if (hours >= 18 && hours < 22) stats.byTimeOfDay.evening++;
          else stats.byTimeOfDay.night++;
          
          // Contagem por motorista
          if (req.driverName) {
            if (!stats.topDrivers[req.driverName]) stats.topDrivers[req.driverName] = 0;
            stats.topDrivers[req.driverName]++;
          }
          
          // Contagem por unidade
          const unitKey = `${req.unit}${req.block ? `-${req.block}` : ''}`;
          if (req.unit) {
            if (!stats.topUnits[unitKey]) stats.topUnits[unitKey] = 0;
            stats.topUnits[unitKey]++;
          }
        }
      });
      
      // Converter para arrays ordenados
      stats.topDrivers = Object.entries(stats.topDrivers)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      stats.topUnits = Object.entries(stats.topUnits)
        .map(([unit, count]) => ({ unit, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      // Converter byDay para um formato mais útil para gráficos
      stats.byDayArray = Object.entries(stats.byDay)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      return stats;
    } catch (error) {
      console.error('Erro ao gerar relatório de acessos:', error);
      throw error;
    }
  },

  /**
   * Obter estatísticas rápidas para o dashboard
   * @param {string} condoId ID do condomínio
   * @returns {Promise<Object>} Estatísticas do último mês
   */
  async getQuickStats(condoId) {
    try {
      // Definir período para o último mês
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      // Obter dados do último mês
      const stats = await this.generateAccessReport(condoId, startDate, endDate);
      
      // Calcular estatísticas adicionais
      const approvalRate = stats.totalRequests > 0 ? 
        ((stats.byStatus.authorized + stats.byStatus.entered + stats.byStatus.completed) / stats.totalRequests * 100).toFixed(1) : 
        0;
      
      const denialRate = stats.totalRequests > 0 ? 
        (stats.byStatus.denied / stats.totalRequests * 100).toFixed(1) : 
        0;
      
      // Adicionar ao objeto de estatísticas
      stats.approvalRate = approvalRate;
      stats.denialRate = denialRate;
      
      // Dados para gráfico de tendência diária
      const lastSevenDays = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        lastSevenDays.push({
          date: dateStr,
          count: stats.byDay[dateStr] || 0
        });
      }
      
      stats.lastSevenDays = lastSevenDays;
      
      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas rápidas:', error);
      throw error;
    }
  }
};

export default AnalyticsService;