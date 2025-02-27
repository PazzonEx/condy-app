// src/screens/condo/CondoSettingsScreen.js
import React from 'react';
import { View, StyleSheet, ScrollView ,Alert} from 'react-native';
import { List, Text, Divider, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Componentes
import Button from '../../components/Button';

const CondoSettingsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile, logout } = useAuth();
  
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
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Configurações</Text>
        <Text style={styles.headerSubtitle}>
          {userProfile?.displayName || 'Condomínio'}
        </Text>
      </View>
      
      <List.Section>
        <List.Subheader>Conta</List.Subheader>
        
        <List.Item
          title="Perfil"
          description="Editar informações do condomínio"
          left={props => <List.Icon {...props} icon="account-edit" />}
          onPress={() => navigation.navigate('CondoProfile')}
        />
        
        <List.Item
          title="Planos e Assinaturas"
          description="Gerenciar seu plano"
          left={props => <List.Icon {...props} icon="credit-card" />}
          onPress={() => navigation.navigate('CondoSubscription')}
        />
        
        <Divider />
        
        <List.Subheader>Aplicativo</List.Subheader>
        
        <List.Item
          title="Notificações"
          description="Configurar alertas e notificações"
          left={props => <List.Icon {...props} icon="bell" />}
          onPress={() => console.log('Notificações')}
        />
        
        <List.Item
          title="Aparência"
          description="Personalizar a interface"
          left={props => <List.Icon {...props} icon="palette" />}
          onPress={() => console.log('Aparência')}
        />
        
        <Divider />
        
        <List.Subheader>Suporte</List.Subheader>
        
        <List.Item
          title="Fale Conosco"
          description="Entre em contato com nosso suporte"
          left={props => <List.Icon {...props} icon="headset" />}
          onPress={() => console.log('Fale Conosco')}
        />
        
        <List.Item
          title="Sobre o App"
          description="Versão e informações legais"
          left={props => <List.Icon {...props} icon="information" />}
          onPress={() => console.log('Sobre')}
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
});

export default CondoSettingsScreen;