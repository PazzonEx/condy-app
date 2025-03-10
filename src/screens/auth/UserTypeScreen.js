import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  Platform,
  SafeAreaView,
  StatusBar
} from 'react-native';
import { 
  Text, 
  Surface, 
  useTheme, 
  IconButton,
  Button
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Constantes
const { width, height } = Dimensions.get('window');

const UserTypeScreen = ({ navigation }) => {
  const theme = useTheme();
  
  // Estados
  const [selectedType, setSelectedType] = useState(null);
  
  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(50)).current;
  const cardScales = [
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current,
    useRef(new Animated.Value(1)).current
  ];
  
  // Efeito para animar entrada
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  
  // Selecionar tipo de usuário
  const handleSelectType = (type) => {
    console.log(`Tipo de usuário selecionado: ${type}`);
    setSelectedType(type);

      // Armazenar o tipo selecionado também no AsyncStorage como backup
  AsyncStorage.setItem('@user_type', type);
    
    // Animar card selecionado
    const animations = cardScales.map((scale, index) => {
      return Animated.timing(scale, {
        toValue: ['resident', 'driver', 'condo'].indexOf(type) === index ? 1.05 : 0.95,
        duration: 300,
        useNativeDriver: true,
      });
    });
    
    Animated.parallel(animations).start(() => {
      // Navegar para tela de cadastro após a animação
      setTimeout(() => {
        navigation.navigate('Register', { userType: type });
      }, 300);
    });
  };
  
  // Voltar para tela anterior
  const handleGoBack = () => {
    navigation.goBack();
  };
  
  // Obter estilo do card baseado no tipo selecionado
  const getCardStyle = (type, index) => {
    const selected = selectedType === type;
    return [
      styles.userTypeCard,
      {
        transform: [{
          scale: cardScales[index]
        }],
        borderColor: selected ? getUserTypeColor(type) : 'transparent',
        borderWidth: selected ? 2 : 0,
      }
    ];
  };
  
  // Obter cor baseada no tipo de usuário
  const getUserTypeColor = (type) => {
    switch (type) {
      case 'driver':
        return '#FF9800';
      case 'condo':
        return '#4CAF50';
      default:
        return '#2196F3';
    }
  };
  
  // Obter gradiente de cor para background do ícone
  const getIconBackground = (type) => {
    const color = getUserTypeColor(type);
    return { backgroundColor: color + '20' }; // Adiciona 20% de opacidade
  };
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <IconButton
            icon="arrow-left"
            size={24}
            onPress={handleGoBack}
            style={styles.backButton}
          />
        </View>
        
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: translateYAnim }]
            }
          ]}
        >
          <Animatable.Text 
            animation="fadeInUp" 
            delay={300} 
            style={styles.title}
          >
            Quem é você?
          </Animatable.Text>
          <Animatable.Text 
            animation="fadeInUp" 
            delay={400} 
            style={styles.subtitle}
          >
            Selecione o tipo de conta que melhor se enquadra ao seu perfil.
            Isso nos ajudará a personalizar sua experiência.
          </Animatable.Text>
          
          {/* Opção: Morador */}
          <Animatable.View animation="fadeInUp" delay={500} useNativeDriver>
            <TouchableOpacity
              style={getCardStyle('resident', 0)}
              onPress={() => handleSelectType('resident')}
              activeOpacity={0.9}
            >
              <Surface style={styles.userTypeCardInner}>
                <View style={[styles.iconContainer, getIconBackground('resident')]}>
                  <MaterialCommunityIcons name="home-account" size={32} color={getUserTypeColor('resident')} />
                </View>
                <View style={styles.userTypeTextContainer}>
                  <Text style={styles.userTypeTitle}>Morador</Text>
                  <Text style={styles.userTypeDescription}>
                    Você mora em um condomínio e deseja liberar acesso para motoristas
                  </Text>
                </View>
                <MaterialCommunityIcons 
                  name={selectedType === 'resident' ? "check-circle" : "chevron-right"} 
                  size={24} 
                  color={selectedType === 'resident' ? getUserTypeColor('resident') : '#BDBDBD'} 
                />
              </Surface>
            </TouchableOpacity>
          </Animatable.View>
          
          {/* Opção: Motorista */}
          <Animatable.View animation="fadeInUp" delay={600} useNativeDriver>
            <TouchableOpacity
              style={getCardStyle('driver', 1)}
              onPress={() => handleSelectType('driver')}
              activeOpacity={0.9}
            >
              <Surface style={styles.userTypeCardInner}>
                <View style={[styles.iconContainer, getIconBackground('driver')]}>
                  <MaterialCommunityIcons name="car" size={32} color={getUserTypeColor('driver')} />
                </View>
                <View style={styles.userTypeTextContainer}>
                  <Text style={styles.userTypeTitle}>Motorista</Text>
                  <Text style={styles.userTypeDescription}>
                    Você é motorista de aplicativo, taxista ou entregador que acessa condomínios
                  </Text>
                </View>
                <MaterialCommunityIcons 
                  name={selectedType === 'driver' ? "check-circle" : "chevron-right"} 
                  size={24} 
                  color={selectedType === 'driver' ? getUserTypeColor('driver') : '#BDBDBD'} 
                />
              </Surface>
            </TouchableOpacity>
          </Animatable.View>
          
          {/* Opção: Condomínio */}
          <Animatable.View animation="fadeInUp" delay={700} useNativeDriver>
            <TouchableOpacity
              style={getCardStyle('condo', 2)}
              onPress={() => handleSelectType('condo')}
              activeOpacity={0.9}
            >
              <Surface style={styles.userTypeCardInner}>
                <View style={[styles.iconContainer, getIconBackground('condo')]}>
                  <MaterialCommunityIcons name="office-building" size={32} color={getUserTypeColor('condo')} />
                </View>
                <View style={styles.userTypeTextContainer}>
                  <Text style={styles.userTypeTitle}>Condomínio</Text>
                  <Text style={styles.userTypeDescription}>
                    Você é um administrador ou porteiro de condomínio que gerencia acessos
                  </Text>
                </View>
                <MaterialCommunityIcons 
                  name={selectedType === 'condo' ? "check-circle" : "chevron-right"} 
                  size={24} 
                  color={selectedType === 'condo' ? getUserTypeColor('condo') : '#BDBDBD'} 
                />
              </Surface>
            </TouchableOpacity>
          </Animatable.View>
          
          {selectedType && (
            <Animatable.View animation="fadeIn" delay={300}>
              <Button 
                mode="contained" 
                onPress={() => navigation.navigate('Register', { userType: selectedType })}
                style={styles.continueButton}
                labelStyle={styles.continueButtonText}
              >
                Continuar
              </Button>
            </Animatable.View>
          )}
          
          <Animatable.Text 
            animation="fadeIn" 
            delay={800} 
            style={styles.footnote}
          >
            Você pode mudar o tipo de conta mais tarde nas configurações do aplicativo.
          </Animatable.Text>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  contentContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 16,
    paddingHorizontal: 16,
  },
  backButton: {
    margin: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#212121',
  },
  subtitle: {
    fontSize: 16,
    color: '#757575',
    marginBottom: 32,
    lineHeight: 22,
  },
  userTypeCard: {
    borderRadius: 12,
    marginBottom: 16,
    elevation: 0,
  },
  userTypeCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  userTypeTextContainer: {
    flex: 1,
  },
  userTypeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userTypeDescription: {
    fontSize: 14,
    color: '#757575',
    lineHeight: 20,
  },
  continueButton: {
    marginTop: 16,
    marginBottom: 24,
    paddingVertical: 8,
    borderRadius: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  footnote: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 16,
  }
});

export default UserTypeScreen;