import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getFirestore } from 'firebase/firestore';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

import { useAuth } from '../../hooks/useAuth';

const CondoSubscriptionPasswordScreen = ({ navigation, route }) => {
  const { currentUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isInitialSetup, setIsInitialSetup] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Verificar se é configuração inicial ou alteração
    const checkInitialSetup = async () => {
      try {
        setLoading(true);
        const db = getFirestore();
        const condoRef = doc(db, 'condos', currentUser.uid);
        const condoSnap = await getDoc(condoRef);
        
        if (condoSnap.exists() && condoSnap.data().subscriptionPassword) {
          setIsInitialSetup(false);
        } else {
          setIsInitialSetup(true);
        }
      } catch (error) {
        console.error('Erro ao verificar configuração de senha:', error);
        Alert.alert('Erro', 'Não foi possível verificar a configuração de senha.');
      } finally {
        setLoading(false);
      }
    };
    
    checkInitialSetup();
  }, [currentUser.uid]);
  
  const validateForm = () => {
    setError('');
    
    // Para configuração inicial, não precisa da senha atual
    if (!isInitialSetup && !currentPassword) {
      setError('Senha atual é obrigatória');
      return false;
    }
    
    if (!newPassword) {
      setError('Nova senha é obrigatória');
      return false;
    }
    
    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem');
      return false;
    }
    
    return true;
  };
  
  const handleSavePassword = async () => {
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      const db = getFirestore();
      const condoRef = doc(db, 'condos', currentUser.uid);
      
      if (!isInitialSetup) {
        // Verificar senha atual antes de atualizar
        const condoSnap = await getDoc(condoRef);
        
        if (!condoSnap.exists()) {
          throw new Error('Condomínio não encontrado');
        }
        
        const currentStoredPassword = condoSnap.data().subscriptionPassword;
        
        if (currentPassword !== currentStoredPassword) {
          setError('Senha atual incorreta');
          setLoading(false);
          return;
        }
      }
      
      // Atualizar senha
      await updateDoc(condoRef, {
        subscriptionPassword: newPassword
      });
      
      Alert.alert(
        'Sucesso',
        isInitialSetup 
          ? 'Senha configurada com sucesso!' 
          : 'Senha alterada com sucesso!',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      console.error('Erro ao salvar senha:', err);
      setError(err.message || 'Erro ao salvar senha');
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>
        {isInitialSetup ? 'Configurar Senha de Administrador' : 'Alterar Senha de Administrador'}
      </Text>
      
      <Text style={styles.description}>
        Esta senha protege o acesso às configurações de plano e assinatura do condomínio.
        {isInitialSetup ? '\nEsta é a primeira configuração da senha.' : ''}
      </Text>
      
      {!isInitialSetup && (
        <TextInput
          style={styles.input}
          placeholder="Senha atual"
          secureTextEntry
          value={currentPassword}
          onChangeText={setCurrentPassword}
        />
      )}
      
      <TextInput
        style={styles.input}
        placeholder="Nova senha"
        secureTextEntry
        value={newPassword}
        onChangeText={setNewPassword}
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirmar nova senha"
        secureTextEntry
        value={confirmPassword}
        onChangeText={setConfirmPassword}
      />
      
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      
      <TouchableOpacity style={styles.saveButton} onPress={handleSavePassword}>
        <Text style={styles.saveButtonText}>Salvar</Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.cancelButton} 
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.cancelButtonText}>Cancelar</Text>
      </TouchableOpacity>
      
      <View style={styles.noteContainer}>
        <Text style={styles.noteText}>
          Nota: Esta senha é diferente da sua senha de login. Ela serve apenas para proteger
          as configurações de plano e assinatura do condomínio.
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'white',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  errorText: {
    color: 'red',
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: '#007bff',
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  saveButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  cancelButton: {
    padding: 16,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  noteContainer: {
    marginTop: 24,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#007bff',
  },
  noteText: {
    fontSize: 14,
    color: '#666',
  }
});

export default CondoSubscriptionPasswordScreen;