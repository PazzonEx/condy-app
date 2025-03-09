// src/utils/masks.js

/**
 * Máscara para CPF (formato: XXX.XXX.XXX-XX)
 * @param {string} value - Valor a ser formatado
 * @returns {string} Valor formatado
 */
export const maskCPF = (value) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // Formata o CPF (XXX.XXX.XXX-XX)
    let formatted = '';
    if (cleaned.length <= 3) {
      formatted = cleaned;
    } else if (cleaned.length <= 6) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3)}`;
    } else if (cleaned.length <= 9) {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6)}`;
    } else {
      formatted = `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9, 11)}`;
    }
    
    return formatted;
  };
  
  /**
   * Máscara para CNPJ (formato: XX.XXX.XXX/XXXX-XX)
   * @param {string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  export const maskCNPJ = (value) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // Formata o CNPJ (XX.XXX.XXX/XXXX-XX)
    let formatted = '';
    if (cleaned.length <= 2) {
      formatted = cleaned;
    } else if (cleaned.length <= 5) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2)}`;
    } else if (cleaned.length <= 8) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5)}`;
    } else if (cleaned.length <= 12) {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8)}`;
    } else {
      formatted = `${cleaned.slice(0, 2)}.${cleaned.slice(2, 5)}.${cleaned.slice(5, 8)}/${cleaned.slice(8, 12)}-${cleaned.slice(12, 14)}`;
    }
    
    return formatted;
  };
  
  /**
   * Máscara para telefone (formato: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
   * @param {string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  export const maskPhone = (value) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // Formata o telefone ((XX) XXXXX-XXXX ou (XX) XXXX-XXXX)
    let formatted = '';
    if (cleaned.length <= 2) {
      formatted = cleaned.length ? `(${cleaned}` : '';
    } else if (cleaned.length <= 6) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
    } else if (cleaned.length <= 10) {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else {
      formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`;
    }
    
    return formatted;
  };
  
  /**
   * Máscara para CEP (formato: XXXXX-XXX)
   * @param {string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  export const maskCEP = (value) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // Formata o CEP (XXXXX-XXX)
    if (cleaned.length <= 5) {
      return cleaned;
    } else {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 8)}`;
    }
  };
  
  /**
   * Máscara para placa de veículo (formato: ABC-1234 ou ABC1D23)
   * @param {string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  export const maskLicensePlate = (value) => {
    if (!value) return '';
    
    // Remove caracteres especiais e converte para maiúsculas
    const cleaned = value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Formata a placa (ABC-1234 ou ABC1D23)
    if (cleaned.length <= 3) {
      return cleaned;
    }
    
    // Para placa no formato antigo (ABC-1234)
    if (cleaned.length <= 7 && /^\D{3}\d{4}$/.test(cleaned)) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    
    // Para placa no formato Mercosul (ABC1D23)
    if (cleaned.length <= 7) {
      return cleaned;
    }
    
    return cleaned.slice(0, 7); // Limitar ao tamanho máximo
  };
  
  /**
   * Máscara para CNH (formato: XXXXXXXXXXX)
   * @param {string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  export const maskCNH = (value) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // CNH tem 11 dígitos, sem formatação especial
    return cleaned.slice(0, 11);
  };
  
  /**
   * Máscara para cartão de crédito (formato: XXXX XXXX XXXX XXXX)
   * @param {string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  export const maskCreditCard = (value) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // Formata o cartão de crédito (XXXX XXXX XXXX XXXX)
    const chunks = [];
    for (let i = 0; i < cleaned.length && i < 16; i += 4) {
      chunks.push(cleaned.slice(i, i + 4));
    }
    
    return chunks.join(' ');
  };
  
  /**
   * Máscara para data (formato: DD/MM/YYYY)
   * @param {string} value - Valor a ser formatado
   * @returns {string} Valor formatado
   */
  export const maskDate = (value) => {
    if (!value) return '';
    
    // Remove caracteres não numéricos
    const cleaned = value.replace(/\D/g, '');
    
    // Formata a data (DD/MM/YYYY)
    if (cleaned.length <= 2) {
      return cleaned;
    } else if (cleaned.length <= 4) {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else {
      return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
  };
  
  /**
   * Remove todos os caracteres não numéricos
   * @param {string} value - Valor a ser limpo
   * @returns {string} Valor contendo apenas números
   */
  export const numbersOnly = (value) => {
    if (!value) return '';
    return value.replace(/\D/g, '');
  };