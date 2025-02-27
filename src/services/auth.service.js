import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential
} from 'firebase/auth';
import { auth } from '../config/firebase';

// Serviço de autenticação
const AuthService = {
  // Registrar um novo usuário
  async register(email, password, displayName) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      // Atualizar o perfil do usuário com o nome
      if (displayName) {
        await updateProfile(userCredential.user, { displayName });
      }
      return userCredential.user;
    } catch (error) {
      console.error('Erro ao registrar usuário:', error);
      throw error;
    }
  },

  // Login de usuário
  async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return userCredential.user;
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      throw error;
    }
  },

  // Logout de usuário
  async logout() {
    try {
      await signOut(auth);
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  },

  // Enviar email de redefinição de senha
  async resetPassword(email) {
    try {
      await sendPasswordResetEmail(auth, email);
      return true;
    } catch (error) {
      console.error('Erro ao enviar email de redefinição de senha:', error);
      throw error;
    }
  },

  // Atualizar perfil do usuário
  async updateUserProfile(user, profile) {
    try {
      await updateProfile(user, profile);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      throw error;
    }
  },

  // Atualizar email do usuário
  async updateUserEmail(user, newEmail) {
    try {
      await updateEmail(user, newEmail);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar email:', error);
      throw error;
    }
  },

  // Atualizar senha do usuário
  async updateUserPassword(user, newPassword) {
    try {
      await updatePassword(user, newPassword);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  },

  // Reautenticar usuário (necessário para operações sensíveis como alterar senha ou email)
  async reauthenticate(currentPassword) {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      return true;
    } catch (error) {
      console.error('Erro ao reautenticar usuário:', error);
      throw error;
    }
  },

  // Verificar se o email existe no sistema
  async checkEmailExists(email) {
    try {
      // Esta é uma solução simples, mas não ideal
      // O Firebase não tem API direta para verificar se um email existe
      // No futuro, poderíamos implementar uma Firebase Function para isso
      
      try {
        await sendPasswordResetEmail(auth, email);
        // Se não lançar erro, o email existe
        return true;
      } catch (error) {
        // Se o erro for de usuário não encontrado, retornamos false
        if (error.code === 'auth/user-not-found') {
          return false;
        }
        // Para outros erros, propagamos
        throw error;
      }
    } catch (error) {
      console.error('Erro ao verificar email:', error);
      throw error;
    }
  },
  
  // Excluir conta de usuário
  async deleteAccount() {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      await user.delete();
      return true;
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      throw error;
    }
  },

  // Obter usuário atual
  getCurrentUser() {
    return auth.currentUser;
  }
};

export default AuthService;