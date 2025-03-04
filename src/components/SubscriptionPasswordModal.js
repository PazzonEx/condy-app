
// components/SubscriptionPasswordModal.js
import React, { useState } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../hooks/useAuth';

const SubscriptionPasswordModal = ({ visible, onClose, condoId, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { verifySubscriptionPassword } = useAuth();
  
  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setError('Senha não pode estar vazia');
      return;
    }
    console.log("condominioid", condoId)
      console.log("password", password)
    
    const isVerified = await verifySubscriptionPassword(condoId, password);
    
    if (isVerified) {
      setPassword('');
      setError('');
      onSuccess && onSuccess();
      onClose();
    } else {
      setError('Senha incorreta');
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Acesso Restrito</Text>
          <Text style={styles.subtitle}>Digite a senha para acessar as configurações de plano</Text>
          
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Senha de administrador"
            secureTextEntry
          />
          
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.confirmButton} onPress={handleVerifyPassword}>
              <Text style={styles.confirmButtonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 20,
    width: '80%',
    maxWidth: 400,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 4,
    padding: 10,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  cancelButtonText: {
    color: '#666',
  },
  confirmButton: {
    backgroundColor: '#007bff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 4,
  },
  confirmButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default SubscriptionPasswordModal;
