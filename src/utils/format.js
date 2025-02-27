/**
 * Utilitários para formatação de dados
 */

/**
 * Formata uma data para exibição
 * @param {Date|string|Object} date - Data a ser formatada (Date, string ou timestamp do Firestore)
 * @param {Object} options - Opções de formatação
 * @returns {string} - Data formatada
 */
export const formatDate = (date, options = {}) => {
    if (!date) return '';
    
    // Converter para objeto Date
    let dateObj;
    if (date instanceof Date) {
      dateObj = date;
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else if (date?.toDate) {
      // Timestamp do Firestore
      dateObj = date.toDate();
    } else if (date?.seconds) {
      // Segundos timestamp do Firestore
      dateObj = new Date(date.seconds * 1000);
    } else {
      return '';
    }
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // Opções padrão
    const defaultOptions = {
      showTime: false,
      showSeconds: false,
      showDate: true,
      dateFormat: 'dd/MM/yyyy', // 'dd/MM/yyyy' ou 'MM/dd/yyyy'
      timeFormat: '24h', // '12h' ou '24h'
    };
    
    const settings = { ...defaultOptions, ...options };
    
    // Formatar a data
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    
    let formattedDate = '';
    
    if (settings.showDate) {
      if (settings.dateFormat === 'dd/MM/yyyy') {
        formattedDate = `${day}/${month}/${year}`;
      } else if (settings.dateFormat === 'MM/dd/yyyy') {
        formattedDate = `${month}/${day}/${year}`;
      } else {
        formattedDate = `${year}-${month}-${day}`;
      }
    }
    
    // Adicionar hora se necessário
    if (settings.showTime) {
      let hours = dateObj.getHours();
      const minutes = String(dateObj.getMinutes()).padStart(2, '0');
      const seconds = String(dateObj.getSeconds()).padStart(2, '0');
      let period = '';
      
      if (settings.timeFormat === '12h') {
        period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12; // Converter para formato 12h
      }
      
      let timeStr = `${String(hours).padStart(2, '0')}:${minutes}`;
      
      if (settings.showSeconds) {
        timeStr += `:${seconds}`;
      }
      
      if (settings.timeFormat === '12h') {
        timeStr += ` ${period}`;
      }
      
      // Combinar data e hora
      if (formattedDate) {
        formattedDate += ` ${timeStr}`;
      } else {
        formattedDate = timeStr;
      }
    }
    
    return formattedDate;
  };
  
  /**
   * Formata um valor monetário
   * @param {number} value - Valor a ser formatado
   * @param {string} currency - Código da moeda (padrão: 'BRL')
   * @param {string} locale - Localidade para formatação (padrão: 'pt-BR')
   * @returns {string} - Valor formatado
   */
  export const formatCurrency = (value, currency = 'BRL', locale = 'pt-BR') => {
    if (value === null || value === undefined) return '';
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
      }).format(value);
    } catch (error) {
      console.error('Erro ao formatar moeda:', error);
      return String(value);
    }
  };
  
  /**
   * Formata um número de telefone
   * @param {string} phone - Número a ser formatado
   * @returns {string} - Número formatado
   */
  export const formatPhone = (phone) => {
    if (!phone) return '';
    
    // Remover caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
      // Celular com DDD
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      // Telefone fixo com DDD
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length === 9) {
      // Celular sem DDD
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
    } else if (cleaned.length === 8) {
      // Telefone fixo sem DDD
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }
    
    // Retornar sem formatação se não se encaixar nos padrões
    return cleaned;
  };
  
  /**
   * Formata um CPF
   * @param {string} cpf - CPF a ser formatado
   * @returns {string} - CPF formatado
   */
  export const formatCPF = (cpf) => {
    if (!cpf) return '';
    
    // Remover caracteres não numéricos
    const cleaned = cpf.replace(/\D/g, '');
    
    if (cleaned.length !== 11) {
      return cleaned;
    }
    
    return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
  };
  
  /**
   * Formata um CNPJ
   * @param {string} cnpj - CNPJ a ser formatado
   * @returns {string} - CNPJ formatado
   */
  export const formatCNPJ = (cnpj) => {
    if (!cnpj) return '';
    
    // Remover caracteres não numéricos
    const cleaned = cnpj.replace(/\D/g, '');
    
    if (cleaned.length !== 14) {
      return cleaned;
    }
    
    return `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12)}`;
  };
  
  /**
   * Formata uma placa de veículo
   * @param {string} plate - Placa a ser formatada
   * @returns {string} - Placa formatada
   */
  export const formatVehiclePlate = (plate) => {
    if (!plate) return '';
    
    // Remover caracteres não alfanuméricos
    const cleaned = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    if (cleaned.length !== 7) {
      return cleaned;
    }
    
    // Verificar se é no formato Mercosul (AAA0A00)
    if (/^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/.test(cleaned)) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    
    // Formato padrão (AAA-9999)
    return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
  };
  
  /**
   * Trunca um texto com limite de caracteres
   * @param {string} text - Texto a ser truncado
   * @param {number} limit - Limite de caracteres
   * @param {string} suffix - Sufixo a ser adicionado (padrão: '...')
   * @returns {string} - Texto truncado
   */
  export const truncateText = (text, limit, suffix = '...') => {
    if (!text) return '';
    
    if (text.length <= limit) {
      return text;
    }
    
    return text.slice(0, limit).trim() + suffix;
  };
  
  /**
   * Converte o primeiro caractere de uma string para maiúsculo
   * @param {string} text - Texto a ser convertido
   * @returns {string} - Texto com o primeiro caractere em maiúsculo
   */
  export const capitalizeFirstLetter = (text) => {
    if (!text) return '';
    
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  
  /**
   * Converte a primeira letra de cada palavra para maiúsculo
   * @param {string} text - Texto a ser convertido
   * @returns {string} - Texto com as primeiras letras em maiúsculo
   */
  export const capitalizeWords = (text) => {
    if (!text) return '';
    
    return text
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };