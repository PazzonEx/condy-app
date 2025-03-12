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
import FirestoreService from "./firestore.service"
    
// Serviço de autenticação
const AuthService = {
  // Registrar um novo usuário
  // Modifique a função register em src/services/auth.service.js
// Em src/services/auth.service.js
async register(email, password, displayName, userType) {
  try {
    console.log(`AuthService.register chamado com: email=${email}, displayName=${displayName}, userType=${userType}`);

    // Registrar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    
    // Verificação extra para garantir que temos um objeto userCredential válido
    if (!userCredential) {
      console.error("Falha na criação do usuário - objeto userCredential não retornado");
      // Em vez de lançar erro, vamos tentar obter o usuário atual
      const currentUser = auth.currentUser;
      if (currentUser) {
        // Se tivermos o usuário atual, use-o em vez de falhar
        console.log("Usando auth.currentUser como fallback");
        
        // Atualizar o perfil com nome de exibição
        if (displayName) {
          await updateProfile(currentUser, { displayName });
        }
        
        return { user: currentUser }; // Retornar em formato compatível
      } else {
        throw new Error('Falha ao criar usuário no Firebase Auth');
      }
    }
    
    const user = userCredential.user;

    // Verificação adicional
    if (!user) {
      console.error("Usuário criado mas não retornado corretamente");
      const currentUser = auth.currentUser;
      if (currentUser) {
        return { user: currentUser }; // Fallback para usuário atual
      }
      throw new Error('Falha na criação do usuário - objeto user não disponível');
    }
    
    // Garantir que temos um tipo de usuário válido
    if (!userType || !['resident', 'driver', 'condo', 'admin'].includes(userType)) {
      console.warn(`Tipo de usuário inválido ou não especificado: ${userType}, usando 'resident' como padrão`);
      userType = 'resident';
    }
    
    // Atualizar o perfil com nome de exibição
    if (displayName) {
      await updateProfile(user, { displayName });
    }
    
    // Criar documento de usuário com o tipo correto
    await FirestoreService.createDocumentWithId('users', user.uid, {
      email,
      displayName,
      type: userType,
      status: 'pending_verification',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    // Criar documento específico na coleção correta
    const specificCollectionName = userType + 's'; // driver -> drivers, condo -> condos, etc.
    await FirestoreService.createDocumentWithId(specificCollectionName, user.uid, {
      email,
      name: displayName,
      status: 'pending_verification',
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`Usuário registrado com sucesso. Tipo: ${userType}, ID: ${user.uid}`);
    return { user }; // Retornar objeto com user para manter consistência
  } catch (error) {
    console.error('Erro detalhado ao registrar usuário:', error);
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