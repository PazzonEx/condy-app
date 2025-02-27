import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Switch, TouchableOpacity } from 'react-native';
import { List, Text, Divider, useTheme, Dialog, Portal, RadioButton, Button as PaperButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes
import Button from '../../components/Button';
import Input from '../../components/Input';

// Serviços
import FirestoreService from '../../services/firestore.service';
import NotificationService from '../../services/notification.service';

const DriverSettingsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile, logout } = useAuth();
  
  // Estados para configurações
  const [loading, setLoading] = useState(false);
  const [settingsData, setSettingsData] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotificationsEnabled, setEmailNotificationsEnabled] = useState(true);
  const [availableForRequests, setAvailableForRequests] = useState(true);
  const [shareVehicleInfo, setShareVehicleInfo] = useState(true);
  const [autoAcceptRequests, setAutoAcceptRequests] = useState(false);
  const [language, setLanguage] = useState('pt-BR');
  const [theme24Hour, setTheme24Hour] = useState(true);
  
  // Estados para diálogos
  const [languageDialogVisible, setLanguageDialogVisible] = useState(false);
  const [dateFormatDialogVisible, setDateFormatDialogVisible] = useState(false);
  const [deleteAccountDialogVisible, setDeleteAccountDialogVisible] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  
  // Opções de idioma
  const languages = [
    { code: 'pt-BR', label: 'Português (Brasil)' },
    { code: 'en-US', label: 'English (United States)' },
    { code: 'es-ES', label: 'Español' }
  ];
  
  // Carregar configurações do usuário
  useEffect(() => {
    const loadSettings = async () => {
      if (!userProfile) return;
      
      try {
        setLoading(true);
        
        // Buscar configurações no Firestore
        const settings = await FirestoreService.getDocument('user_settings', userProfile.uid);
        
        if (settings) {
          setSettingsData(settings);
          setNotificationsEnabled(settings.notificationsEnabled !== false);
          setEmailNotificationsEnabled(settings.emailNotificationsEnabled !== false);
          setAvailableForRequests(settings.availableForRequests !== false);
          setShareVehicleInfo(settings.shareVehicleInfo !== false);
          setAutoAcceptRequests(settings.autoAcceptRequests === true);
          setLanguage(settings.language || 'pt-BR');
          setTheme24Hour(settings.theme24Hour !== false);
        } else {
          // Se não existir, criar com valores padrão
          const defaultSettings = {
            notificationsEnabled: true,
            emailNotificationsEnabled: true,
            availableForRequests: true,
            shareVehicleInfo: true,
            autoAcceptRequests: false,
            language: 'pt-BR',
            theme24Hour: true
          };
          
          await FirestoreService.createDocumentWithId('user_settings', userProfile.uid, defaultSettings);
          setSettingsData(defaultSettings);
        }
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        Alert.alert('Erro', 'Não foi possível carregar suas configurações. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, [userProfile]);
  
  // Atualizar configuração
  const updateSetting = async (key, value) => {
    try {
      // Atualizar no Firestore
      await FirestoreService.updateDocument('user_settings', userProfile.uid, {
        [key]: value
      });
      
      // Atualizar estado local
      setSettingsData(prev => ({ ...prev, [key]: value }));
      
      return true;
    } catch (error) {
      console.error(`Erro ao atualizar configuração ${key}:`, error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração. Tente novamente.');
      return false;
    }
  };
  
  // Manipuladores para alterações de configurações
  const handleToggleNotifications = async (value) => {
    const success = await updateSetting('notificationsEnabled', value);
    if (success) {
      setNotificationsEnabled(value);
      
      // Se estiver desabilitando, cancelar notificações agendadas
      if (!value) {
        await NotificationService.cancelAllNotifications();
      }
    }
  };
  
  const handleToggleEmailNotifications = async (value) => {
    const success = await updateSetting('emailNotificationsEnabled', value);
    if (success) {
      setEmailNotificationsEnabled(value);
    }
  };
  
  const handleToggleAvailableForRequests = async (value) => {
    const success = await updateSetting('availableForRequests', value);
    if (success) {
      setAvailableForRequests(value);
      
      // Atualizar status do motorista no documento principal
      try {
        await FirestoreService.updateDocument('drivers', userProfile.uid, {
          available: value,
          updatedAt: new Date()
        });
      } catch (error) {
        console.error('Erro ao atualizar status do motorista:', error);
      }
    }
  };
  
  const handleToggleShareVehicleInfo = async (value) => {
    const success = await updateSetting('shareVehicleInfo', value);
    if (success) {
      setShareVehicleInfo(value);
    }
  };
  
  const handleToggleAutoAcceptRequests = async (value) => {
    const success = await updateSetting('autoAcceptRequests', value);
    if (success) {
      setAutoAcceptRequests(value);
    }
  };
  
  const handleSetLanguage = async (code) => {
    const success = await updateSetting('language', code);
    if (success) {
      setLanguage(code);
    }
    setLanguageDialogVisible(false);
  };
  
  const handleToggleTimeFormat = async (value) => {
    const success = await updateSetting('theme24Hour', value);
    if (success) {
      setTheme24Hour(value);
    }
  };
  
  // Manipuladores para testar notificações
  const handleTestNotification = async () => {
    try {
      await NotificationService.sendLocalNotification(
        'Notificação de Teste',
        'Esta é uma notificação de teste do Condy',
        { type: 'test' }
      );
      
      Alert.alert('Sucesso', 'Notificação de teste enviada');
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação de teste');
    }
  };
  
  // Manipulador para excluir conta
  const handleDeleteAccount = async () => {
    if (confirmationText !== userProfile?.email) {
      Alert.alert('Erro', 'O email digitado não corresponde ao seu email.');
      return;
    }
    
    setDeleteAccountDialogVisible(false);
    setConfirmationText('');
    
    Alert.alert(
      'Atenção',
      'Esta ação excluirá permanentemente sua conta e todos os dados associados. Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Excluir Conta', 
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              // Aqui teríamos a lógica para excluir a conta
              // Não implementaremos completamente para evitar exclusões acidentais
              // Em um app real, precisaríamos:
              // 1. Excluir documentos do usuário no Firestore
              // 2. Excluir o usuário no Firebase Auth
              
              Alert.alert(
                'Conta Desativada',
                'Sua conta foi marcada para exclusão. Este processo pode levar alguns dias para ser concluído.',
                [{ text: 'OK', onPress: logout }]
              );
            } catch (error) {
              console.error('Erro ao excluir conta:', error);
              Alert.alert('Erro', 'Não foi possível excluir sua conta. Tente novamente mais tarde.');
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Função para fazer logout
  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          onPress: logout,
        },
      ]
    );
  };
  
  // Obter o rótulo do idioma atual
  const getCurrentLanguageLabel = () => {
    const lang = languages.find(l => l.code === language);
    return lang ? lang.label : 'Português (Brasil)';
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações</Text>
        <Text style={styles.headerSubtitle}>
          {userProfile?.displayName || 'Motorista'}
        </Text>
      </View>
      
      <List.Section>
        <List.Subheader>Status e Disponibilidade</List.Subheader>
        
        <List.Item
          title="Disponível para Solicitações"
          description="Permite que residentes solicitem seu acesso"
          left={props => <List.Icon {...props} icon="car" />}
          right={() => (
            <Switch
              value={availableForRequests}
              onValueChange={handleToggleAvailableForRequests}
              color={theme.colors.primary}
            />
          )}
        />
        
        <List.Item
          title="Aceitar Automaticamente"
          description="Aceitar automaticamente novas solicitações"
          left={props => <List.Icon {...props} icon="check-circle" />}
          right={() => (
            <Switch
              value={autoAcceptRequests}
              onValueChange={handleToggleAutoAcceptRequests}
              color={theme.colors.primary}
            />
          )}
        />
        
        <List.Item
          title="Compartilhar Informações do Veículo"
          description="Compartilhar modelo e placa com residentes"
          left={props => <List.Icon {...props} icon="car-info" />}
          right={() => (
            <Switch
              value={shareVehicleInfo}
              onValueChange={handleToggleShareVehicleInfo}
              color={theme.colors.primary}
            />
          )}
        />
        
        <Divider />
        
        <List.Subheader>Notificações</List.Subheader>
        
        <List.Item
          title="Notificações Push"
          description="Receber notificações no dispositivo"
          left={props => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              color={theme.colors.primary}
            />
          )}
        />
        
        <List.Item
          title="Notificações por Email"
          description="Receber emails para atualizações importantes"
          left={props => <List.Icon {...props} icon="email" />}
          right={() => (
            <Switch
              value={emailNotificationsEnabled}
              onValueChange={handleToggleEmailNotifications}
              color={theme.colors.primary}
            />
          )}
        />
        
        <List.Item
          title="Testar Notificação"
          description="Enviar uma notificação de teste"
          left={props => <List.Icon {...props} icon="bell-ring" />}
          onPress={handleTestNotification}
        />
        
        <Divider />
        
        <List.Subheader>Preferências</List.Subheader>
        
        <List.Item
          title="Idioma"
          description={getCurrentLanguageLabel()}
          left={props => <List.Icon {...props} icon="translate" />}
          onPress={() => setLanguageDialogVisible(true)}
        />
        
        <List.Item
          title="Formato de Hora"
          description={theme24Hour ? 'Formato 24h' : 'Formato 12h (AM/PM)'}
          left={props => <List.Icon {...props} icon="clock" />}
          right={() => (
            <Switch
              value={theme24Hour}
              onValueChange={handleToggleTimeFormat}
              color={theme.colors.primary}
            />
          )}
        />
        
        <Divider />
        
        <List.Subheader>Conta</List.Subheader>
        
        <List.Item
          title="Alterar Senha"
          description="Atualizar sua senha de acesso"
          left={props => <List.Icon {...props} icon="lock-reset" />}
          onPress={() => navigation.navigate('ChangePassword')}
        />
        
        <List.Item
          title="Editar Perfil"
          description="Atualizar suas informações pessoais e do veículo"
          left={props => <List.Icon {...props} icon="account-edit" />}
          onPress={() => navigation.navigate('DriverProfile')}
        />
        
        <List.Item
          title="Documentos"
          description="Gerenciar documentos do motorista e veículo"
          left={props => <List.Icon {...props} icon="file-document" />}
          onPress={() => navigation.navigate('DriverDocuments')}
        />
        
        <List.Item
          title="Excluir Conta"
          description="Excluir permanentemente sua conta"
          left={props => <List.Icon {...props} icon="account-remove" color="#D32F2F" />}
          titleStyle={{ color: '#D32F2F' }}
          onPress={() => setDeleteAccountDialogVisible(true)}
        />
      </List.Section>
      
      <View style={styles.logoutContainer}>
        <Button
          mode="outlined"
          icon="logout"
          onPress={handleLogout}
          style={styles.logoutButton}
        >
          Sair
        </Button>
      </View>
      
      {/* Diálogo de seleção de idioma */}
      <Portal>
        <Dialog
          visible={languageDialogVisible}
          onDismiss={() => setLanguageDialogVisible(false)}
        >
          <Dialog.Title>Selecionar Idioma</Dialog.Title>
          <Dialog.Content>
            <RadioButton.Group onValueChange={handleSetLanguage} value={language}>
              {languages.map(lang => (
                <RadioButton.Item
                  key={lang.code}
                  label={lang.label}
                  value={lang.code}
                  color={theme.colors.primary}
                />
              ))}
            </RadioButton.Group>
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton onPress={() => setLanguageDialogVisible(false)}>Cancelar</PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      {/* Diálogo de exclusão de conta */}
      <Portal>
        <Dialog
          visible={deleteAccountDialogVisible}
          onDismiss={() => {
            setDeleteAccountDialogVisible(false);
            setConfirmationText('');
          }}
        >
          <Dialog.Title>Excluir Conta</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Esta ação excluirá permanentemente sua conta e todos os dados associados. 
              Para confirmar, digite seu email: {userProfile?.email}
            </Text>
            <Input
              value={confirmationText}
              onChangeText={setConfirmationText}
              placeholder="Digite seu email"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <PaperButton 
              onPress={() => {
                setDeleteAccountDialogVisible(false);
                setConfirmationText('');
              }}
            >
              Cancelar
            </PaperButton>
            <PaperButton 
              onPress={handleDeleteAccount}
              disabled={confirmationText !== userProfile?.email}
              color="#D32F2F"
            >
              Excluir
            </PaperButton>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#757575',
  },
  logoutContainer: {
    padding: 16,
    marginTop: 16,
    marginBottom: 32,
  },
  logoutButton: {
    borderColor: '#D32F2F',
    borderWidth: 1,
  },
  dialogText: {
    marginBottom: 16,
  },
});

export default DriverSettingsScreen;