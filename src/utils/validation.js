/**
 * Utilitários para validação de dados
 */

/**
 * Verifica se um email é válido
 * @param {string} email - Email a ser validado
 * @returns {boolean} - true se o email for válido
 */
export const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };
  
  /**
   * Valida uma senha
   * @param {string} password - Senha a ser validada
   * @returns {Object} - Objeto com resultado da validação
   */
  export const validatePassword = (password) => {
    const result = {
      valid: true,
      errors: []
    };
  
    if (!password || password.length < 6) {
      result.valid = false;
      result.errors.push('A senha deve ter pelo menos 6 caracteres');
    }
  
    return result;
  };
  
  /**
   * Valida dados de registro de usuário
   * @param {Object} data - Dados a serem validados
   * @returns {Object} - Objeto com resultados da validação
   */
  export const validateRegistration = (data) => {
    const { name, email, password, confirmPassword } = data;
    const errors = {};
  
    // Validar nome
    if (!name || !name.trim()) {
      errors.name = 'Nome é obrigatório';
    } else if (name.trim().length < 3) {
      errors.name = 'Nome deve ter pelo menos 3 caracteres';
    }
  
    // Validar email
    if (!email || !email.trim()) {
      errors.email = 'Email é obrigatório';
    } else if (!isValidEmail(email)) {
      errors.email = 'Email inválido';
    }
  
    // Validar senha
    if (!password) {
      errors.password = 'Senha é obrigatória';
    } else if (password.length < 6) {
      errors.password = 'Senha deve ter pelo menos 6 caracteres';
    }
  
    // Validar confirmação de senha
    if (password !== confirmPassword) {
      errors.confirmPassword = 'As senhas não coincidem';
    }
  
    return {
      valid: Object.keys(errors).length === 0,
      errors
    };
  };
  
  /**
   * Valida uma placa de veículo (formato brasileiro)
   * @param {string} plate - Placa a ser validada
   * @returns {boolean} - true se a placa for válida
   */
  export const isValidVehiclePlate = (plate) => {
    // Formato padrão (AAA-9999) ou Mercosul (AAA9A99)
    const plateRegex = /^[A-Z]{3}[0-9]{4}$|^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
    
    // Remover espaços, traços e converter para maiúsculas
    const formattedPlate = plate.replace(/[\s-]/g, '').toUpperCase();
    
    return plateRegex.test(formattedPlate);
  };
  
  /**
   * Valida um número de telefone
   * @param {string} phone - Telefone a ser validado
   * @returns {boolean} - true se o telefone for válido
   */
  export const isValidPhone = (phone) => {
    // Remover caracteres não numéricos
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Verificar se tem entre 10 e 11 dígitos (com ou sem DDD)
    return cleanPhone.length >= 10 && cleanPhone.length <= 11;
  };
  
  /**
   * Valida um CPF
   * @param {string} cpf - CPF a ser validado
   * @returns {boolean} - true se o CPF for válido
   */
  export const isValidCPF = (cpf) => {
    // Remover caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    
    // Verificar se tem 11 dígitos
    if (cpf.length !== 11) {
      return false;
    }
    
    // Verificar se todos os dígitos são iguais (caso inválido)
    if (/^(\d)\1+$/.test(cpf)) {
      return false;
    }
    
    // Validação dos dígitos verificadores
    let sum = 0;
    let remainder;
    
    // Primeiro dígito verificador
    for (let i = 1; i <= 9; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }
    
    if (remainder !== parseInt(cpf.substring(9, 10))) {
      return false;
    }
    
    // Segundo dígito verificador
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    }
    
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) {
      remainder = 0;
    }
    
    if (remainder !== parseInt(cpf.substring(10, 11))) {
      return false;
    }
    
    return true;
  };
  
  /**
   * Valida um CNPJ
   * @param {string} cnpj - CNPJ a ser validado
   * @returns {boolean} - true se o CNPJ for válido
   */
  export const isValidCNPJ = (cnpj) => {
    // Remover caracteres não numéricos
    const cleaned = cnpj.replace(/\D/g, '');
    
    // Verificar se tem 14 dígitos
    if (cleaned.length !== 14) {
      return false;
    }
    
    // Verificar se todos os dígitos são iguais (caso inválido)
    if (/^(\d)\1+$/.test(cleaned)) {
      return false;
    }
    
    // Tabela de multiplicadores para o cálculo dos dígitos verificadores
    const multiplier1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const multiplier2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    // Cálculo do primeiro dígito verificador
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cleaned.charAt(i)) * multiplier1[i];
    }
    
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    // Cálculo do segundo dígito verificador
    sum = 0;
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cleaned.charAt(i)) * multiplier2[i];
    }
    
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    // Verificar se os dígitos calculados são iguais aos dígitos informados
    return (
      parseInt(cleaned.charAt(12)) === digit1 && 
      parseInt(cleaned.charAt(13)) === digit2
    );
  };