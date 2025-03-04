import { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import AuthService from '../services/auth.service';
import FirestoreService from '../services/firestore.service';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../config/firebase';
// Contexto de autenticação
const AuthContext = createContext();

// Provider de autenticação
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isSubscriptionPasswordVerified, setIsSubscriptionPasswordVerified] = useState(false);
  

   // Efeito para monitorar o estado de autenticação
   useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(true);
      
      if (user) {
        try {
          // Buscar informações adicionais do usuário no Firestore
          const userDoc = await FirestoreService.getDocument('users', user.uid);
          setUserProfile(userDoc);
        } catch (err) {
          console.error('Erro ao buscar perfil do usuário:', err);
          setError(err.message);
        }
      } else {
        console.log("OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOPORAAAAAAAAAAAAAA perfil indefinido useAuth")
        setUserProfile(null);
      }
      
      setLoading(false);
    });

    // Cleanup da subscription
    return unsubscribe;
  }, []);

  // Função para verificar senha de acesso ao plano
  const verifySubscriptionPassword = async (condoId, password) => {
    try {
      const condoRef = doc(firestore, 'condos', condoId);
      const condoSnap = await getDoc(condoRef);
      console.log("condominioid", condoId);
      console.log("password", password);
      if (!condoSnap.exists()) {
        throw new Error('Condomínio não encontrado');
      }
      
      const condoData = condoSnap.data();
      
      // Verificar se a senha corresponde
      if (condoData.subscriptionPassword === password) {
        setIsSubscriptionPasswordVerified(true);
        return true;
      } else {
        setIsSubscriptionPasswordVerified(false);
        return false;
      }
    } catch (error) {
      console.error('Erro ao verificar senha:', error);
      return false;
    }
  };
  
  // Resetar verificação ao sair da tela
  const resetSubscriptionPasswordVerification = () => {
    setIsSubscriptionPasswordVerified(false);
  };
  
  // Função para definir/alterar a senha
  const setSubscriptionPassword = async (condoId, currentPassword, newPassword) => {
    try {
      // Primeiro verifica se a senha atual está correta
      const isVerified = await verifySubscriptionPassword(condoId, currentPassword);
      
      if (!isVerified) {
        throw new Error('Senha atual incorreta');
      }
      
      // Atualiza a senha
      const condoRef = doc(firestore, 'condos', condoId);
      await updateDoc(condoRef, {
        subscriptionPassword: newPassword
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      return false;
    }
  };
  
  // Função para criar senha inicial (primeira configuração)
  const createInitialSubscriptionPassword = async (condoId, password) => {
    try {
      const condoRef = doc(firestore, 'condos', condoId);
      const condoSnap = await getDoc(condoRef);
      
      if (!condoSnap.exists()) {
        throw new Error('Condomínio não encontrado');
      }
      
      const condoData = condoSnap.data();
      
      // Verifica se já existe uma senha configurada
      if (condoData.subscriptionPassword) {
        throw new Error('Senha já configurada');
      }
      
      // Define a senha inicial
      await updateDoc(condoRef, {
        subscriptionPassword: password
      });
      
      setIsSubscriptionPasswordVerified(true);
      return true;
    } catch (error) {
      console.error('Erro ao criar senha inicial:', error);
      return false;
    }
  };


 
  // Registrar um novo usuário
  const register = async (email, password, displayName, userType) => {
    setError(null);
    try {
      // Registrar com Firebase Auth
      const user = await AuthService.register(email, password, displayName);
      
      // Criar documento do usuário no Firestore
      await FirestoreService.createDocumentWithId('users', user.uid, {
        email,
        displayName,
        type: userType || 'resident', // tipo padrão
        status: 'active'
      });
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Login de usuário
  const login = async (email, password) => {
    setError(null);
    try {
      return await AuthService.login(email, password);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout de usuário
  const logout = async () => {
    setError(null);
    try {
      await AuthService.logout();
      return true;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Redefinir senha
  const resetPassword = async (email) => {
    setError(null);
    try {
      return await AuthService.resetPassword(email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Atualizar perfil do usuário
  const updateProfile = async (profile, userData) => {
    setError(null);
    try {
      if (currentUser) {
        // Atualizar perfil no Firebase Auth se necessário
        if (profile.displayName) {
          await AuthService.updateUserProfile(currentUser, { 
            displayName: profile.displayName 
          });
        }
        
        // Atualizar dados no Firestore
        const updatedData = userData || {};
        if (profile.displayName) {
          updatedData.displayName = profile.displayName;
        }
        
        await FirestoreService.updateDocument('users', currentUser.uid, updatedData);
        
        // Atualizar estado local
        setUserProfile(prev => ({ ...prev, ...updatedData }));
        
        return true;
      }
      return false;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Valores expostos pelo contexto
  const value = {
    currentUser,
    userProfile,
    loading,
    error,
    register,
    login,
    logout,
    resetPassword,
    updateProfile,
    isSubscriptionPasswordVerified,
    verifySubscriptionPassword,
    resetSubscriptionPasswordVerification,
    setSubscriptionPassword,
    createInitialSubscriptionPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook personalizado para usar o contexto de autenticação
export function useAuth() {
  return useContext(AuthContext);
}