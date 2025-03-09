// src/screens/shared/PendingApprovalScreen.js
import React from 'react';
import { View, StyleSheet, Image } from 'react-native';
import { Text, Button, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import LottieView from 'lottie-react-native';

const PendingApprovalScreen = () => {
  const theme = useTheme();
  const { userProfile, logout } = useAuth();
  
  // Obter informações relevantes com base no tipo de usuário
  const getUserTypeInfo = () => {
    switch (userProfile?.type) {
      case 'resident':
        return {
          title: 'Aguardando aprovação do condomínio',
          description: 'Seu cadastro foi enviado e está aguardando aprovação pelo administrador do condomínio.',
          icon: 'home-account',
          color: '#2196F3'
        };
      case 'driver':
        return {
          title: 'Cadastro em análise',
          description: 'Seus documentos estão sendo analisados. Você receberá uma notificação quando seu cadastro for aprovado.',
          icon: 'car',
          color: '#FF9800'
        };
      case 'condo':
        return {
          title: 'Condomínio em verificação',
          description: 'Estamos verificando as informações do seu condomínio. Isso geralmente leva até 48 horas úteis.',
          icon: 'office-building',
          color: '#4CAF50'
        };
      default:
        return {
          title: 'Cadastro em análise',
          description: 'Seu cadastro está sendo analisado. Por favor, aguarde a aprovação.',
          icon: 'account-clock',
          color: '#9C27B0'
        };
    }
  };
  
  const info = getUserTypeInfo();

  return (
    <View style={styles.container}>
      <Surface style={styles.card}>
        <View style={[styles.iconContainer, { backgroundColor: info.color + '20' }]}>
          <MaterialCommunityIcons name={info.icon} size={48} color={info.color} />
        </View>
        
        <Text style={styles.title}>{info.title}</Text>
        
        <View style={styles.animationContainer}>
          <LottieView
            source={require('../../assets/animations/waiting.json')}
            autoPlay
            loop
            style={styles.animation}
          />
        </View>
        
        <Text style={styles.description}>{info.description}</Text>
        
        <Text style={styles.infoText}>
          Não se preocupe, você receberá uma notificação assim que seu cadastro for aprovado.
        </Text>
        
        <Button
          mode="outlined"
          onPress={logout}
          style={styles.logoutButton}
        >
          Sair
        </Button>
      </Surface>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F5F5F5',
  },
  card: {
    padding: 24,
    borderRadius: 12,
    elevation: 4,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  animationContainer: {
    width: 200,
    height: 200,
    marginVertical: 16,
  },
  animation: {
    width: '100%',
    height: '100%',
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 24,
  },
  infoText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  logoutButton: {
    width: '100%',
  }
});

export default PendingApprovalScreen;