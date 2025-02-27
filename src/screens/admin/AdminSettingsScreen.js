import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import Button from '../../components/Button';

const AdminSettingsScreen = () => {
  const { logout } = useAuth();
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Configurações do Admin</Text>
      <Button mode="contained" onPress={logout}>
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
  }
});

export default AdminSettingsScreen;
