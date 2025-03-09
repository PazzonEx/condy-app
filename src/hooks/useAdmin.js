// src/hooks/useAdmin.js
import { useState } from 'react';
import { useAuth } from './useAuth';
import FirestoreService from '../services/firestore.service';
import { serverTimestamp } from 'firebase/firestore';

export const useAdmin = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Credenciais fixas para admin (melhor seria armazenar no .env)
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
 
  // Login como admin
  const adminLogin = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
      return result;
    } catch (error) {
      setError('Credenciais de administrador inválidas');
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Atualizar status de um usuário (aprovar/rejeitar)
  const updateUserStatus = async (userId, newStatus, notes = '') => {
    setLoading(true);
    setError(null);
    
    try {
      // Obter perfil do usuário
      const userDoc = await FirestoreService.getDocument('users', userId);
      
      if (!userDoc) {
        throw new Error('Usuário não encontrado');
      }
      
      // Atualizar status no documento principal
      await FirestoreService.updateDocument('users', userId, {
        status: newStatus,
        statusUpdatedAt: serverTimestamp(),
        statusNotes: notes
      });
      
      // Atualizar também no documento específico do tipo
      if (userDoc.type) {
        let collectionName = '';
        
        switch (userDoc.type) {
          case 'driver':
            collectionName = 'drivers';
            break;
          case 'resident':
            collectionName = 'residents';
            break;
          case 'condo':
            collectionName = 'condos';
            break;
        }
        
        if (collectionName) {
          await FirestoreService.updateDocument(collectionName, userId, {
            status: newStatus,
            statusUpdatedAt: serverTimestamp(),
            statusNotes: notes
          });
        }
      }
      
      return true;
    } catch (error) {
      setError(`Erro ao atualizar status: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  return {
    adminLogin,
    updateUserStatus,
    loading,
    error
  };
};