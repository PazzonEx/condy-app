// src/services/auth-helper.service.js
import { auth } from '../config/firebase';

const AuthHelperService = {
  /**
   * Verifica se há um usuário autenticado
   * @param {boolean} throwError Se deve lançar um erro se não estiver autenticado
   * @returns {Object|null} Usuário autenticado ou null
   */
  getAuthenticatedUser(throwError = true) {
    const currentUser = auth.currentUser;
    
    if (!currentUser && throwError) {
      throw new Error('Usuário não autenticado');
    }
    
    return currentUser;
  },
  
  /**
   * Retorna o ID do usuário autenticado
   * @param {string} defaultId ID padrão a ser retornado se não houver usuário autenticado
   * @returns {string|null} ID do usuário ou defaultId
   */
  getAuthUserId(defaultId = null) {
    const user = this.getAuthenticatedUser(false);
    return user ? user.uid : defaultId;
  }
};

export default AuthHelperService;