// src/components/LoadingOverlay.js
import React from 'react';
import { 
  View, 
  StyleSheet, 
  ActivityIndicator, 
  Modal,
  Text,
  Animated,
  Dimensions
} from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import * as Animatable from 'react-native-animatable';
import LottieView from 'lottie-react-native';

const { width, height } = Dimensions.get('window');

const LoadingOverlay = ({ 
  visible = false, 
  text = 'Carregando...', 
  transparent = true, 
  useLottie = false,
  size = 'large'
}) => {
  const theme = useTheme();
  
  // Se não estiver visível, não renderizar
  if (!visible) return null;
  
  // Renderizar com lottie animation
  if (useLottie) {
    return (
      <Modal transparent={transparent} visible={visible}>
        <BlurView intensity={50} tint="dark" style={styles.container}>
          <Animatable.View 
            animation="fadeIn" 
            duration={300} 
            style={styles.lottieContainer}
          >
            <LottieView
              source={require('../assets/animations/waiting.json')}
              autoPlay
              loop
              style={styles.lottieAnimation}
            />
            <Text style={styles.loadingText}>{text}</Text>
          </Animatable.View>
        </BlurView>
      </Modal>
    );
  }
  
  // Renderizar com ActivityIndicator padrão
  return (
    <Modal transparent={transparent} visible={visible}>
      <View style={styles.container}>
        <Animatable.View 
          animation="fadeIn" 
          duration={300}
        >
          <Surface style={styles.loadingCard}>
            <ActivityIndicator 
              size={size} 
              color={theme.colors.primary} 
              style={styles.indicator} 
            />
            <Text style={styles.loadingText}>{text}</Text>
          </Surface>
        </Animatable.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  loadingCard: {
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    minWidth: 200,
  },
  indicator: {
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
  },
  lottieContainer: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lottieAnimation: {
    width: 120,
    height: 120,
  }
});

export default LoadingOverlay;