import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/Button';

const ProfileScreen = () => {
  const { userProfile, logout } = useAuth();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil do Morador</Text>
      <Text style={styles.info}>Nome: {userProfile?.displayName || 'Não definido'}</Text>
      <Text style={styles.info}>Email: {userProfile?.email || 'Não definido'}</Text>
      <Button mode="contained" onPress={logout} style={styles.button}>
        Sair
      </Button>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20
  },
  title: {
    fontSize: 24, 
    marginBottom: 20
  },
  info: {
    fontSize: 16,
    marginBottom: 10
  },
  button: {
    marginTop: 20
  }
});

export default ProfileScreen;
