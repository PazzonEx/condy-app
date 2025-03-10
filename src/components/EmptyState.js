// src/components/EmptyState.js
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EmptyState = ({
  icon = 'information-outline',
  title = 'Nenhum item encontrado',
  description = 'Não há itens para mostrar no momento',
  buttonText = null,
  onButtonPress = null,
  color,
  style
}) => {
  const theme = useTheme();
  const iconColor = color || theme.colors.primary;
  
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name={icon} size={64} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      
      {buttonText && onButtonPress && (
        <Button 
          mode="outlined" 
          onPress={onButtonPress}
          style={styles.button}
        >
          {buttonText}
        </Button>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    marginBottom: 24,
  },
  button: {
    minWidth: 120,
  }
});

export default EmptyState;