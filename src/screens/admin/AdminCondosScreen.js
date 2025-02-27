import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const AdminCondosScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gerenciar Condomínios</Text>
      <Text>Tela a ser implementada</Text>
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

export default AdminCondosScreen;
