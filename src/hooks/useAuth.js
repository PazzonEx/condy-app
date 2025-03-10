// src/contexts/AuthContext.js (versão integrada com funcionalidade de cancelamento)
import { useState, useEffect, useContext, createContext } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, firestore } from '../config/firebase';
import AuthService from '../services/auth.service';
import FirestoreService from '../services/firestore.service';
import NotificationService from '../services/notification.service';
import { doc, getDoc, updateDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
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
  const [isAdmin, setIsAdmin] = useState(false);

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
          
          // Verificar se é admin
          if (userDoc?.type === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
          
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
          setIsAdmin(false);
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
// No hook useAuth.js, modifique a função loadUserTypeSpecificData
const loadUserTypeSpecificData = async (userType, userId) => {
  try {
    if (!userType || !userId) {
      console.error('Tipo de usuário ou ID não fornecidos');
      return;
    }
    
    console.log(`Carregando dados específicos para usuário tipo: ${userType}, ID: ${userId}`);
    
    let collectionName = '';
    
    // Determinar a coleção correta com base no tipo
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
        console.error(`Tipo de usuário desconhecido: ${userType}`);
        return;
    }
    
    // Verificar se o documento existe
    let typeSpecificData = await FirestoreService.getDocument(collectionName, userId);
    
    // Se não existir, tentar restaurar o documento correto
    if (!typeSpecificData) {
      console.log(`Documento não encontrado em ${collectionName} para ID ${userId}`);
      
      // Verificar o tipo real no documento do usuário
      const userDoc = await FirestoreService.getDocument('users', userId);
      const actualUserType = userDoc?.type || userType;
      
      if (actualUserType !== userType) {
        console.log(`Corrigindo tipo de usuário: ${userType} -> ${actualUserType}`);
        
        // Determinar a coleção correta novamente
        let actualCollectionName = '';
        switch (actualUserType) {
          case 'driver':
            actualCollectionName = 'drivers';
            break;
          case 'resident':
            actualCollectionName = 'residents';
            break;
          case 'condo':
            actualCollectionName = 'condos';
            break;
          case 'admin':
            actualCollectionName = 'admins';
            break;
          default:
            console.error(`Tipo de usuário desconhecido: ${actualUserType}`);
            return;
        }
        
        // Verificar na coleção correta
        typeSpecificData = await FirestoreService.getDocument(actualCollectionName, userId);
      }
      
      // Se ainda não existir, criar na coleção correta
      if (!typeSpecificData) {
        console.log(`Criando documento básico em ${collectionName} para usuário ${userId}`);
        
        // Dados básicos para o documento
        const userData = await FirestoreService.getDocument('users', userId);
        const basicData = {
          name: userData?.displayName || '',
          email: userData?.email || '',
          status: 'pending_verification',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          profileComplete: false,
          type: userType
        };
        
        // Criar o documento na coleção correta
        await FirestoreService.createDocumentWithId(collectionName, userId, basicData);
        
        // Buscar o documento recém-criado
        typeSpecificData = await FirestoreService.getDocument(collectionName, userId);
      }
    }
    
    if (typeSpecificData) {
      // Atualizar perfil com dados específicos
      setUserProfile(prev => ({ ...prev, ...typeSpecificData }));
    }
  } catch (error) {
    console.error(`Erro ao carregar dados específicos de ${userType}:`, error);
  }
};
  // Registrar token de notificação
  const registerNotificationToken = async (userId) => {
    try {
      const token = await NotificationService.registerForPushNotificationsAsync();
      
      if (token) {
        setNotificationToken(token);
        await NotificationService.saveTokenToFirestore(token);
      } else {
        console.log('Continuing without notification token');
      }
    } catch (error) {
      console.error('Erro ao registrar token de notificação wrro do notificatio emprementar mais tarde:', error);
      // Continuar sem o token
    }
  };
  // Atualizar última atividade do usuário
  const updateLastActive = async (userId) => {
    try {
      await updateDoc(doc(firestore, 'users', userId), {
        lastActive: serverTimestamp()
      });
    } catch (error) {
      console.error('Erro ao atualizar última atividade:', error);
    }
  };

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
  
  // Função para criar senha inicial
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

// Em src/hooks/useAuth.js
// Em src/hooks/useAuth.js

const register = async (email, password, displayName, userType) => {
  setError(null);
  try {
    // Log para debugar a passagem de parâmetros
    console.log(`Register chamado com parâmetros: email=${email}, displayName=${displayName}, userType=${userType}`);
    
    // Garantir que o userType seja um valor válido
    if (!userType || !['resident', 'driver', 'condo', 'admin'].includes(userType)) {
      console.error(`Tipo de usuário inválido ou não especificado: ${userType}`);
      throw new Error('Tipo de usuário inválido ou não especificado');
    }
    
    
    // Registrar com Firebase Auth
    const userCredential = await AuthService.register(email, password, displayName, userType);
    const user = userCredential.user;
    
    if (!user) {
      throw new Error('Falha ao criar usuário (retorno nulo)');
    }
    
    // Dados de usuário com tipo garantido
    const userData = {
      id: user.uid,
      email,
      displayName,
      type: userType,
      status: userType === 'admin' ? 'active' : 'pending_verification',
      profileComplete: false, // Explicitamente setar como falso
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastActive: serverTimestamp()
    };
    
    console.log("Salvando dados do usuário:", userData);
    
    // Criar documento do usuário no Firestore
    await FirestoreService.createDocumentWithId('users', user.uid, userData);
    
    // Criar documento específico baseado no tipo de usuário
    await createUserTypeSpecificDocument(userType, user.uid, { 
      email, 
      name: displayName,
      status: userType === 'admin' ? 'active' : 'pending_verification',
      profileComplete: false // Adicionar esse campo
    });
    
    // Atualizar perfil localmente para refletir as alterações
    setUserProfile({
      ...userData,
      profileComplete: false
    });
    
    return user;
  } catch (err) {
    console.error("Erro completo durante o registro:", err);
    setError(err.message);
    throw err;
  }
};
// Em src/hooks/useAuth.js
const createUserTypeSpecificDocument = async (userType, userId, basicData) => {
  try {
    // Log para debug
    console.log(`Criando documento específico para: tipo=${userType}, userId=${userId}`);
    
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
        console.error(`ERRO CRÍTICO: Tipo inválido (${userType}) ao criar documento específico`);
        collectionName = 'residents'; // Fallback para evitar erro
    }
    
    console.log(`Coletando que será usada: ${collectionName}`);
    
    // Dados comuns
    const commonData = {
      ...basicData,
      createdAt: timestamp,
      updatedAt: timestamp,
      // Importante: sempre incluir o tipo no documento
      type: userType
    };
    
    // Dados completos
    const documentData = {
      ...commonData,
      ...extraData
    };
    
    // Verificar se o usuário existe para evitar erros
    try {
      await FirestoreService.createDocumentWithId(collectionName, userId, documentData);
      console.log(`Documento criado com sucesso em ${collectionName} para usuário ${userId}`);
    } catch (docError) {
      console.error(`Erro ao criar documento em ${collectionName}:`, docError);
      throw docError;
    }
  } catch (error) {
    console.error(`Erro ao criar documento específico para ${userType}:`, error);
    throw error;
  }
};
  // Login de usuário
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

  // Logout de usuário - Implementada com funcionalidade de limpeza de dados
  const logout = async () => {
    try {
      await AuthService.logout();
      
      // Limpar estados locais
      setCurrentUser(null);
      setUserProfile(null);
      setIsAdmin(false);
      setNotificationToken(null);
      setIsSubscriptionPasswordVerified(false);
      
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      throw error;
    }
  };
  
  // Função para cancelar cadastro e limpar dados - ATUALIZADA
const cancelRegistration = async (userType) => {
  try {
    if (!currentUser) {
      throw new Error('Usuário não autenticado');
    }
    
    // Determinar coleção com base no tipo de usuário
    let collectionName = '';
    switch (userType) {
      case 'resident':
        collectionName = 'residents';
        break;
      case 'driver':
        collectionName = 'drivers';
        break;
      case 'condo':
        collectionName = 'condos';
        break;
      default:
        throw new Error('Tipo de usuário inválido');
    }
    
    // Excluir documento específico do tipo de usuário
    if (collectionName) {
      try {
        await FirestoreService.deleteDocument(collectionName, currentUser.uid);
      } catch (err) {
        console.log(`Erro ao excluir documento em ${collectionName}:`, err);
        // Continuar mesmo com erro
      }
    }
    
    // Excluir documento de usuário
    try {
      await FirestoreService.deleteDocument('users', currentUser.uid);
    } catch (err) {
      console.log('Erro ao excluir documento de usuário:', err);
      // Continuar mesmo com erro
    }
    
    // Tentar excluir conta de autenticação
    try {
      await AuthService.deleteAccount(currentUser);
    } catch (deleteError) {
      console.log('Erro ao excluir conta de autenticação:', deleteError);
      // Se o erro for de autenticação recente, apenas fazemos logout
      if (deleteError.code === 'auth/requires-recent-login') {
        console.log('Não foi possível excluir a conta devido a auth/requires-recent-login. Fazendo apenas logout.');
        // Não interromper o fluxo, apenas continuar para o logout
      } else {
        // Para outros erros, pode ser útil propagar
        throw deleteError;
      }
    }
    
    // Fazer logout - sempre executado
    await logout();
    
    return true;
  } catch (error) {
    console.error('Erro ao cancelar cadastro:', error);
    // Se o erro for de autenticação recente, ainda queremos fazer logout
    if (error.code === 'auth/requires-recent-login') {
      await logout();
      return true;
    }
    throw error;
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

  // Recarregar perfil do usuário
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

  // Reautenticar usuário (necessário para operações sensíveis) - NOVA FUNÇÃO
  const reauthenticate = async (password) => {
    if (!currentUser) throw new Error('Usuário não autenticado');

    try {
      await AuthService.reauthenticate(currentUser.email, password);
      return true;
    } catch (error) {
      console.error('Erro ao reautenticar:', error);
      throw error;
    }
  };

  // Atualizar senha do usuário - NOVA FUNÇÃO
  const updateUserPassword = async (newPassword) => {
    try {
      if (!currentUser) throw new Error('Usuário não autenticado');
      
      await AuthService.updatePassword(currentUser, newPassword);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  };

  // Valores expostos pelo contexto (atualizados incluindo todos os seus + novos)
  const value = {
    currentUser,
    userProfile,
    setUserProfile,
    loading,
    initializing,
    error,
    isAdmin,
    notificationToken,
    register,
    login,
    logout,
    cancelRegistration, // Nova função para cancelar cadastro
    reloadUserProfile,
    resetPassword,
    updateProfile,
    reauthenticate, // Nova função para reautenticar
    updateUserPassword, // Nova função para atualizar senha
    isSubscriptionPasswordVerified,
    verifySubscriptionPassword,
    resetSubscriptionPasswordVerification,
    setSubscriptionPassword,
    createInitialSubscriptionPassword,
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