import React from 'react';
import { StyleSheet, View, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Componentes personalizados
import Card from '../../components/Card';
import Button from '../../components/Button';

const UserTypeScreen = ({ navigation }) => {
  const theme = useTheme();

  // Tipos de usuário disponíveis
  const userTypes = [
    {
      id: 'resident',
      title: 'Morador',
      description: 'Solicite acesso para motoristas e entregadores no seu condomínio',
      icon: 'home-account',
      color: '#4CAF50', // Verde
    },
    {
      id: 'driver',
      title: 'Motorista',
      description: 'Receba solicitações de acesso a condomínios',
      icon: 'car',
      color: '#2196F3', // Azul
    },
    {
      id: 'condo',
      title: 'Condomínio',
      description: 'Gerencie o controle de acesso do seu condomínio',
      icon: 'office-building',
      color: '#FF9800', // Laranja
    }
  ];

  // Selecionar tipo de usuário e navegar para registro
  const handleSelectUserType = (userType) => {
    navigation.navigate('Register', { userType });
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Cabeçalho */}
        <View style={styles.header}>
          <Text style={styles.title}>Escolha seu perfil</Text>
          <Text style={styles.subtitle}>
            Selecione o tipo de usuário para se cadastrar
          </Text>
        </View>

        {/* Cards de tipos de usuário */}
        <View style={styles.cardsContainer}>
          {userTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={styles.cardWrapper}
              onPress={() => handleSelectUserType(type.id)}
            >
              <Card style={styles.card}>
                <View style={styles.cardContent}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: type.color },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={type.icon}
                      size={40}
                      color="white"
                    />
                  </View>

                  <View style={styles.cardTextContainer}>
                    <Text style={styles.cardTitle}>{type.title}</Text>
                    <Text style={styles.cardDescription}>
                      {type.description}
                    </Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))}
        </View>

        {/* Rodapé */}
        <View style={styles.footer}>
          <Text>Já tem uma conta? </Text>
          <Button
            mode="text"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          >
            Entrar
          </Button>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginVertical: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
  },
  cardsContainer: {
    width: '100%',
    maxWidth: 500,
  },
  cardWrapper: {
    marginBottom: 15,
  },
  card: {
    width: '100%',
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  iconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardDescription: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    flexDirection: 'row',
    marginTop: 20,
    alignItems: 'center',
  },
  loginButton: {
    margin: 0,
    padding: 0,
  },
});

export default UserTypeScreen;