import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';
import Input from '../../components/Input';

// Serviços
import AuthService from '../../services/auth.service';

const ChangePasswordScreen = ({ navigation }) => {
  const theme = useTheme();
  const { currentUser } = useAuth();
  
  // Estados
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = 'Senha atual é obrigatória';
    }
    
    if (!newPassword) {
      newErrors.newPassword = 'Nova senha é obrigatória';
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  // Manipulador para alteração de senha
  const handleChangePassword = async () => {
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      // Reautenticar o usuário
      await AuthService.reauthenticate(currentPassword);
      
      // Alterar a senha
      await AuthService.updateUserPassword(currentUser, newPassword);
      
      // Limpar os campos
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      Alert.alert(
        'Senha Alterada',
        'Sua senha foi alterada com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      
      // Verificar o tipo de erro
      if (error.code === 'auth/wrong-password') {
        setErrors({ currentPassword: 'Senha atual incorreta' });
      } else {
        Alert.alert('Erro', 'Não foi possível alterar sua senha. Tente novamente mais tarde.');
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.headerContainer}>
            <MaterialCommunityIcons 
              name="lock-reset" 
              size={60} 
              color={theme.colors.primary} 
              style={styles.headerIcon} 
            />
            <Text style={styles.headerTitle}>Alterar Senha</Text>
            <Text style={styles.headerDescription}>
              Preencha os campos abaixo para alterar sua senha
            </Text>
          </View>
          
          <Input
            label="Senha Atual"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            error={errors.currentPassword}
            placeholder="Digite sua senha atual"
            disabled={loading}
          />
          
          <Input
            label="Nova Senha"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            error={errors.newPassword}
            placeholder="Digite sua nova senha"
            disabled={loading}
          />
          
          <Input
            label="Confirmar Nova Senha"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            error={errors.confirmPassword}
            placeholder="Digite novamente sua nova senha"
            disabled={loading}
          />
          
          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Requisitos de senha:</Text>
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons 
                name={newPassword.length >= 6 ? "check-circle" : "information"}
                size={16}
                color={newPassword.length >= 6 ? '#4CAF50' : theme.colors.accent}
              />
              <Text style={styles.requirementText}>Pelo menos 6 caracteres</Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialCommunityIcons 
                name={newPassword === confirmPassword && newPassword ? "check-circle" : "information"}
                size={16}
                color={newPassword === confirmPassword && newPassword ? '#4CAF50' : theme.colors.accent}
              />
              <Text style={styles.requirementText}>Senhas devem coincidir</Text>
            </View>
          </View>
          
          <Button
            mode="contained"
            onPress={handleChangePassword}
            loading={loading}
            disabled={loading}
            style={styles.saveButton}
          >
            Alterar Senha
          </Button>
          
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            disabled={loading}
            style={styles.cancelButton}
          >
            Cancelar
          </Button>
        </Card.Content>
      </Card>
      
      <Card style={styles.securityCard}>
        <Card.Content>
          <View style={styles.securityTipContainer}>
            <MaterialCommunityIcons 
              name="shield-lock" 
              size={24} 
              color={theme.colors.primary} 
              style={styles.securityIcon} 
            />
            <View style={styles.securityTipContent}>
              <Text style={styles.securityTipTitle}>Dica de Segurança</Text>
              <Text style={styles.securityTipText}>
                Use uma senha forte com letras, números e símbolos. Nunca compartilhe sua senha com terceiros.
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    borderRadius: 8,
    marginBottom: 16,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerDescription: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  passwordRequirements: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#1E88E5',
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  requirementText: {
    fontSize: 14,
    marginLeft: 8,
  },
  saveButton: {
    marginBottom: 12,
  },
  cancelButton: {
    marginBottom: 8,
  },
  securityCard: {
    borderRadius: 8,
    marginBottom: 24,
  },
  securityTipContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  securityIcon: {
    marginRight: 16,
  },
  securityTipContent: {
    flex: 1,
  },
  securityTipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  securityTipText: {
    fontSize: 14,
    color: '#555',
  },
});

export default ChangePasswordScreen;