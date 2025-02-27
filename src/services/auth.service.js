import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword
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
  
    // Obter usuário atual
    getCurrentUser() {
      return auth.currentUser;
    }
  };
  
  export default AuthService;
  