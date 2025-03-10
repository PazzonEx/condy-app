// src/screens/admin/AdminSettingsScreen.js
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, ScrollView, Share, Linking } from 'react-native';
import { 
  Text, 
  List, 
  Switch, 
  Button, 
  Surface, 
  Divider, 
  Dialog, 
  Portal,
  useTheme
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Componentes
import ConfirmDialog from '../../components/ConfirmDialog';

const AdminSettingsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { currentUser, logout } = useAuth();
  
  // Estados
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [autoApproveMembers, setAutoApproveMembers] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Confirmar logout
  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      Alert.alert('Erro', 'Não foi possível fazer logout. Tente novamente.');
    } finally {
      setLoading(false);
      setShowLogoutDialog(false);
    }
  };
  
  // Navegar para tela de configurações de senha
  const navigateToPasswordSettings = () => {
    navigation.navigate('AdminSettingsPassword');
  };
  
  // Compartilhar aplicativo
  const shareApp = async () => {
    try {
      await Share.share({
        message: 'Experimente o Condy - a melhor forma de gerenciar acessos no seu condomínio! Baixe agora: https://condy.app',
        title: 'Condy - Gestão de Acesso para Condomínios'
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
    }
  };
  
  // Abrir site de suporte
  const openSupport = () => {
    Linking.openURL('https://condy.app/support');
  };
  
  // Abrir página de política de privacidade
  const openPrivacyPolicy = () => {
    Linking.openURL('https://condy.app/privacy');
  };
  
  // Abrir página de termos de uso
  const openTermsOfUse = () => {
    Linking.openURL('https://condy.app/terms');
  };
  
  return (
    <ScrollView style={styles.container}>
      {/* Informações da conta */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Informações da Conta</Text>
        <List.Item
          title="Perfil de administrador"
          description={currentUser?.email}
          left={props => <List.Icon {...props} icon="account" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={() => {}}
        />
        <List.Item
          title="Alterar senha de admin"
          description="Defina uma senha para funções administrativas"
          left={props => <List.Icon {...props} icon="lock" />}
          right={props => <List.Icon {...props} icon="chevron-right" />}
          onPress={navigateToPasswordSettings}
        />
      </Surface>
      
      {/* Notificações */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Notificações</Text>
        <List.Item
          title="Notificações push"
          description="Receber alertas em tempo real"
          left={props => <List.Icon {...props} icon="bell" />}
          right={() => (
            <Switch
              value={pushNotifications}
              onValueChange={setPushNotifications}
              color={theme.colors.primary}
            />
          )}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Notificações por email"
          description="Receber resumos por email"
          left={props => <List.Icon {...props} icon="email" />}
          right={() => (
            <Switch
              value={emailNotifications}
              onValueChange={setEmailNotifications}
              color={theme.colors.primary}
            />
          )}
        />
      </Surface>
      
      {/* Configurações gerais */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Configurações Gerais</Text>
        <List.Item
          title="Aprovação automática de residentes"
          description="Aprovar automaticamente novos moradores verificados pelo condomínio"
          left={props => <List.Icon {...props} icon="account-check" />}
          right={() => (
            <Switch
              value={autoApproveMembers}
              onValueChange={setAutoApproveMembers}
              color={theme.colors.primary}
            />
          )}
        />
      </Surface>
      
      {/* Suporte e ajuda */}
      <Surface style={styles.section}>
        <Text style={styles.sectionTitle}>Suporte e Ajuda</Text>
        <List.Item
          title="Suporte técnico"
          description="Entre em contato com nosso suporte"
          left={props => <List.Icon {...props} icon="headset" />}
          right={props => <List.Icon {...props} icon="open-in-new" />}
          onPress={openSupport}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Política de privacidade"
          left={props => <List.Icon {...props} icon="shield-account" />}
          right={props => <List.Icon {...props} icon="open-in-new" />}
          onPress={openPrivacyPolicy}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Termos de uso"
          left={props => <List.Icon {...props} icon="file-document" />}
          right={props => <List.Icon {...props} icon="open-in-new" />}
          onPress={openTermsOfUse}
        />
        <Divider style={styles.divider} />
        <List.Item
          title="Compartilhar aplicativo"
          left={props => <List.Icon {...props} icon="share-variant" />}
          onPress={shareApp}
        />
      </Surface>
      
      {/* Versão do app */}
      <Surface style={styles.section}>
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Versão 1.0.0</Text>
        </View>
      </Surface>
      
      {/* Logout */}
      <View style={styles.logoutContainer}>
        <Button 
          mode="outlined" 
          icon="logout" 
          onPress={() => setShowLogoutDialog(true)}
          style={styles.logoutButton}
          color="#F44336"
        >
          Sair
        </Button>
      </View>
      
      {/* Diálogo de confirmação de logout */}
      <Portal>
        <Dialog
          visible={showLogoutDialog}
          onDismiss={() => setShowLogoutDialog(false)}
        >
          <Dialog.Title>Fazer logout</Dialog.Title>
          <Dialog.Content>
            <Text>Tem certeza que deseja sair do aplicativo?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)}>Cancelar</Button>
            <Button 
              onPress={handleLogout} 
              loading={loading}
              disabled={loading}
              color="#F44336"
            >
              Sair
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  section: {
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  divider: {
    height: 1,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  versionText: {
    fontSize: 14,
    color: '#9E9E9E',
  },
  logoutContainer: {
    padding: 16,
    marginBottom: 32,
  },
  logoutButton: {
    borderColor: '#F44336',
  }
});

export default AdminSettingsScreen;