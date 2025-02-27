import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const CondoResidentsScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Moradores do Condomínio</Text>
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

export default CondoResidentsScreen;
