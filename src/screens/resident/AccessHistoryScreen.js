import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Button from '../../components/Button';

const AccessHistoryScreen = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Histórico de Acessos</Text>
      <Button mode="contained" onPress={() => navigation.navigate('AccessDetails', { requestId: '123' })}>
        Ver Detalhes (Teste)
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

export default AccessHistoryScreen;
