// src/contexts/AuthContext.js (versão atualizada mantendo suas funcionalidades)
import { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '../config/firebase';
import AuthService from '../services/auth.service';
import FirestoreService from '../services/firestore.service';
import NotificationService from '../services/notification.service';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Contexto de autenticação
const AuthContext = createContext();

// Provider de autenticação
export function AuthProvider({ children }) {
  // Estados existentes
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubscriptionPasswordVerified, setIsSubscriptionPasswordVerified] = useState(false);
  
  // Novos estados
  const [initializing, setInitializing] = useState(true);
  const [notificationToken, setNotificationToken] = useState(null);

  // Efeito para monitorar o estado de autenticação
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        setLoading(true);
        
        if (user) {
          // Buscar informações adicionais do usuário no Firestore
          const userDoc = await FirestoreService.getDocument('users', user.uid);
          setUserProfile(userDoc);
          
          // Registrar token de notificação
          registerNotificationToken(user.uid);
          
          // Atualizar última atividade
          updateLastActive(user.uid);
          
          // Carregar dados específicos baseados no tipo de usuário
          if (userDoc?.type) {
            await loadUserTypeSpecificData(userDoc.type, user.uid);
          }
        } else {
          setUserProfile(null);
        }
      } catch (err) {
        console.error('Erro ao processar usuário autenticado:', err);
        setError(err.message);
      } finally {
        setLoading(false);
        setInitializing(false);
      }
    });

    // Cleanup da subscription
    return unsubscribe;
  }, []);

  // No AuthContext.js - no método loadUserTypeSpecificData
const loadUserTypeSpecificData = async (userType, userId) => {
  try {
    if (!userType || !userId) return;
    
    let typeSpecificData = null;
    let collectionName = ''; 
    
    switch (userType) {
      case 'driver':
        collectionName = 'drivers';
        break;
      case 'resident':
        collectionName = 'residents';
        break;
      case 'condo':
        collectionName = 'condos';
        break;
      case 'admin':
        collectionName = 'admins';
        break;
      default:
        return;
    }
    
    // Verificar se o documento existe
    typeSpecificData = await FirestoreService.getDocument(collectionName, userId);
    
    // Se não existir, criar um documento básico
    if (!typeSpecificData && collectionName) {
      console.log(`Criando documento básico em ${collectionName} para usuário ${userId}`);
      
      const userData = await FirestoreService.getDocument('users', userId);
      
      // Dados básicos para o documento
      const basicData = {
        name: userData?.displayName || '',
        email: userData?.email || '',
        status: 'pending_verification',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        profileComplete: false
      };
      
      // Criar o documento
      await FirestoreService.createDocumentWithId(collectionName, userId, basicData);
      
      // Buscar o documento recém-criado
      typeSpecificData = await FirestoreService.getDocument(collectionName, userId);
    }
    
    if (typeSpecificData) {
      // Atualizar perfil com dados específicos
      setUserProfile(prev => ({ ...prev, ...typeSpecificData }));
    }
  } catch (error) {
    console.error(`Erro ao carregar dados específicos de ${userType}:`, error);
  }
};
  
  // Registrar token de notificação (nova função)
  const registerNotificationToken = async (userId) => {
    try {
      // Obter token de notificação
      const token = await NotificationService.registerForPushNotificationsAsync();
      
      if (token) {
        setNotificationToken(token);
        
        // Salvar token no Firestore
        await NotificationService.saveTokenToFirestore(token);
      }
    } catch (error) {
      console.error('Erro ao registrar token de notificação:', error);
    }
  };
  
  // Atualizar última atividade do usuário (nova função)
  const updateLastActive = async (userId) => {
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        lastActive: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao atualizar última atividade:', error);
    }
  };

  // Função para verificar senha de acesso ao plano (mantida do seu código)
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
  
  // Resetar verificação ao sair da tela (mantida do seu código)
  const resetSubscriptionPasswordVerification = () => {
    setIsSubscriptionPasswordVerified(false);
  };
  
  // Função para definir/alterar a senha (mantida do seu código)
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
  
  // Função para criar senha inicial (mantida do seu código)
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

  const register = async (email, password, displayName, userType) => {
    setError(null);
    try {
      console.log("Registrando usuário do tipo:", userType); // Log para depuração
      
      // Registrar com Firebase Auth
      const userCredential = await AuthService.register(email, password, displayName);
      const user = userCredential.user;
      
      // Definir status com base no tipo de usuário
      let initialStatus = 'pending_verification';
      if (userType === 'admin') {
        initialStatus = 'active'; // Admins são ativados imediatamente
      }
      
      // Dados de usuário
      const userData = {
        email,
        displayName,
        type: userType, // Certifique-se de que isso está definido corretamente
        status: initialStatus,
        profileComplete: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        lastActive: serverTimestamp()
      };
      
      console.log("Salvando dados do usuário:", userData); // Log para depuração
      
      // Criar documento do usuário no Firestore
      await FirestoreService.createDocumentWithId('users', user.uid, userData);
      
      // Criar documento específico baseado no tipo de usuário
      await createUserTypeSpecificDocument(userType, user.uid, { 
        email, 
        name: displayName,
        status: initialStatus
      });
      
      // Atualizar perfil localmente para refletir as alterações
      setUserProfile({
        id: user.uid,
        ...userData
      });
      
      return user;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };
  // Criar documento específico baseado no tipo de usuário (nova função)
  const createUserTypeSpecificDocument = async (userType, userId, basicData) => {
    try {
      const timestamp = serverTimestamp();
      let collectionName = '';
      let extraData = {};
      
      switch (userType) {
        case 'driver':
          collectionName = 'drivers';
          extraData = {
            status: 'pending_verification',
            isAvailable: true,
            verificationStatus: 'pending'
          };
          break;
        case 'resident':
          collectionName = 'residents';
          extraData = {
            status: 'active'
          };
          break;
        case 'condo':
          collectionName = 'condos';
          extraData = {
            status: 'pending_verification',
            plan: 'free'
          };
          break;
        case 'admin':
          collectionName = 'admins';
          extraData = {
            role: 'admin',
            permissions: ['read', 'write']
          };
          break;
        default:
          return; // Tipo inválido, não criar documento
      }
      
      // Dados comuns
      const commonData = {
        ...basicData,
        createdAt: timestamp,
        updatedAt: timestamp
      };
      
      // Dados completos
      const documentData = {
        ...commonData,
        ...extraData
      };
      
      // Criar documento
      await FirestoreService.createDocumentWithId(collectionName, userId, documentData);
    } catch (error) {
      console.error(`Erro ao criar documento específico para ${userType}:`, error);
      throw error;
    }
  };

  // Login de usuário (melhorada)
  const login = async (email, password) => {
    setError(null);
    try {
      const result = await AuthService.login(email, password);
      
      // Salvar email no AsyncStorage para facilitar futuros logins
      await AsyncStorage.setItem('@auth_email', email);
      
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Logout de usuário (mantida do seu código)
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

  // Redefinir senha (mantida do seu código)
  const resetPassword = async (email) => {
    setError(null);
    try {
      return await AuthService.resetPassword(email);
    } catch (err) {
      setError(err.message);
      throw err;
    }
  };

  // Atualizar perfil do usuário (melhorada)
  // No AuthContext.js
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
      
      // Dados para atualização no Firestore
      const updateData = {
        ...userData,
        updatedAt: serverTimestamp()
      };
      
      if (profile.displayName) {
        updateData.displayName = profile.displayName;
      }
      
      if (profile.profileComplete !== undefined) {
        updateData.profileComplete = profile.profileComplete;
      }
      
      if (profile.status !== undefined) {
        updateData.status = profile.status;
      }
      
      // Atualizar dados no Firestore
      await FirestoreService.updateDocument('users', currentUser.uid, updateData);
      
      // Importante: Atualizar estado local ANTES de retornar
      setUserProfile(prev => ({
        ...prev,
        ...updateData,
        ...profile // Garantir que as props específicas do profile sejam aplicadas
      }));
      
      // Esperar um momento para garantir que o estado seja atualizado
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return true;
    }
    return false;
  } catch (err) {
    setError(err.message);
    throw err;
  }
};
const reloadUserProfile = async () => {
  if (currentUser) {
    try {
      // Buscar informações atualizadas do usuário no Firestore
      const userDoc = await FirestoreService.getDocument('users', currentUser.uid);
      setUserProfile(userDoc);
      
      // Recarregar dados específicos
      if (userDoc?.type) {
        await loadUserTypeSpecificData(userDoc.type, currentUser.uid);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao recarregar perfil:', error);
      return false;
    }
  }
  return false;
};

  // Valores expostos pelo contexto (atualizados incluindo todos os seus)
  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    loading,
    initializing,
    error,
    notificationToken,
    register,
    login,
    logout,
    reloadUserProfile,
    resetPassword,
    updateProfile,
    isSubscriptionPasswordVerified,
    verifySubscriptionPassword,
    resetSubscriptionPasswordVerification,
    setSubscriptionPassword,
    createInitialSubscriptionPassword,
    // Novas funções exportadas
    loadUserTypeSpecificData,
    updateLastActive
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook personalizado para usar o contexto de autenticação
export function useAuth() {
  return useContext(AuthContext);
}

export default { AuthProvider, useAuth };