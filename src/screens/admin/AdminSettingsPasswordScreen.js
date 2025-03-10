// src/screens/admin/AdminSettingsPasswordScreen.js
import React, { useState } from 'react';
import { View, StyleSheet, Alert, ScrollView, Keyboard } from 'react-native';
import { 
  Text, 
  TextInput, 
  Button, 
  Surface, 
  HelperText,
  useTheme
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Hooks
import { useAuth } from '../../hooks/useAuth';
import { useAdmin } from '../../hooks/useAdmin';

// Componentes
import LoadingOverlay from '../../components/LoadingOverlay';

const AdminSettingsPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser } = useAuth();
  
  // Estados
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Validar formulário
  const validateForm = () => {
    const newErrors = {};
    let isValid = true;
    
    // Validar senha atual
    if (!currentPassword.trim()) {
      newErrors.currentPassword = 'A senha atual é obrigatória';
      isValid = false;
    }
    
    // Validar nova senha
    if (!newPassword.trim()) {
      newErrors.newPassword = 'A nova senha é obrigatória';
      isValid = false;
    } else if (newPassword.length < 6) {
      newErrors.newPassword = 'A senha deve ter pelo menos 6 caracteres';
      isValid = false;
    }
    
    // Validar confirmação de senha
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Confirme a nova senha';
      isValid = false;
    } else if (confirmPassword !== newPassword) {
      newErrors.confirmPassword = 'As senhas não coincidem';
      isValid = false;
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  // Salvar nova senha
  const handleSavePassword = async () => {
    if (!validateForm()) return;
    
    Keyboard.dismiss();
    setLoading(true);
    
    try {
      // Verificar senha atual
      await useAuth().reauthenticate(currentPassword);
      
      // Atualizar senha
      await useAuth().updateUserPassword(currentUser, newPassword);
      
      // Mostrar mensagem de sucesso
      Alert.alert(
        'Senha Atualizada',
        'Sua senha de administrador foi atualizada com sucesso.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      
      let errorMessage = 'Não foi possível atualizar a senha. Tente novamente.';
      
      if (error.code === 'auth/wrong-password') {
        errorMessage = 'A senha atual está incorreta.';
        setErrors({ ...errors, currentPassword: errorMessage });
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'A nova senha é muito fraca. Escolha uma senha mais forte.';
        setErrors({ ...errors, newPassword: errorMessage });
      } else {
        Alert.alert('Erro', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Surface style={styles.formCard}>
          <Text style={styles.title}>Alterar Senha de Administrador</Text>
          <Text style={styles.subtitle}>
            Esta senha protege as funções administrativas do aplicativo.
          </Text>
          
          {/* Senha atual */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Senha atual"
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                if (errors.currentPassword) {
                  setErrors({ ...errors, currentPassword: undefined });
                }
              }}
              secureTextEntry={!showCurrentPassword}
              mode="outlined"
              error={!!errors.currentPassword}
              style={styles.input}
              right={
                <TextInput.Icon
                  name={showCurrentPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                  color={theme.colors.placeholder}
                />
              }
            />
            <HelperText type="error" visible={!!errors.currentPassword}>
              {errors.currentPassword}
            </HelperText>
          </View>
          
          {/* Nova senha */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Nova senha"
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                if (errors.newPassword) {
                  setErrors({ ...errors, newPassword: undefined });
                }
              }}
              secureTextEntry={!showNewPassword}
              mode="outlined"
              error={!!errors.newPassword}
              style={styles.input}
              right={
                <TextInput.Icon
                  name={showNewPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowNewPassword(!showNewPassword)}
                  color={theme.colors.placeholder}
                />
              }
            />
            <HelperText type="error" visible={!!errors.newPassword}>
              {errors.newPassword}
            </HelperText>
          </View>
          
          {/* Confirmar nova senha */}
          <View style={styles.inputContainer}>
            <TextInput
              label="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) {
                  setErrors({ ...errors, confirmPassword: undefined });
                }
              }}
              secureTextEntry={!showConfirmPassword}
              mode="outlined"
              error={!!errors.confirmPassword}
              style={styles.input}
              right={
                <TextInput.Icon
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  color={theme.colors.placeholder}
                />
              }
            />
            <HelperText type="error" visible={!!errors.confirmPassword}>
              {errors.confirmPassword}
            </HelperText>
          </View>
          
          <View style={styles.passwordTips}>
            <Text style={styles.tipsTitle}>Dicas para uma senha forte:</Text>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color="#4CAF50"
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>Use pelo menos 8 caracteres</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color="#4CAF50"
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>Combine letras maiúsculas e minúsculas</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color="#4CAF50"
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>Inclua números e caracteres especiais</Text>
            </View>
            <View style={styles.tipItem}>
              <MaterialCommunityIcons 
                name="check-circle" 
                size={16} 
                color="#4CAF50"
                style={styles.tipIcon}
              />
              <Text style={styles.tipText}>Evite senhas óbvias ou já usadas</Text>
            </View>
          </View>
        </Surface>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.cancelButton}
            disabled={loading}
          >
            Cancelar
          </Button>
          
          <Button
            mode="contained"
            onPress={handleSavePassword}
            style={styles.saveButton}
            loading={loading}
            disabled={loading}
          >
            Salvar
          </Button>
        </View>
      </ScrollView>
      
      <LoadingOverlay visible={loading} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  formCard: {
    padding: 16,
    borderRadius: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  passwordTips: {
    backgroundColor: '#F5F5F5',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  tipIcon: {
    marginRight: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#757575',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  saveButton: {
    flex: 1,
    marginLeft: 8,
  }
});

export default AdminSettingsPasswordScreen;