import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Card as PaperCard, useTheme } from 'react-native-paper';

// Componente de card personalizado
const Card = ({ 
  children, 
  style, 
  onPress, 
  mode = 'elevated',
  elevation = 2
}) => {
  const theme = useTheme();

  return (
    <PaperCard
      style={[
        styles.card,
        { 
          backgroundColor: theme.colors.surface,
          elevation: elevation
        },
        style
      ]}
      mode={mode}
      onPress={onPress}
    >
      <PaperCard.Content style={styles.content}>
        {children}
      </PaperCard.Content>
    </PaperCard>
  );
};

// Componente para o título do card
const CardTitle = ({ children, style }) => {
  const theme = useTheme();

  return (
    <PaperCard.Title
      title={children}
      titleStyle={[
        styles.title,
        { color: theme.colors.primary },
        style
      ]}
    />
  );
};

// Componente para a seção do card
const CardSection = ({ children, style }) => {
  return <View style={[styles.section, style]}>{children}</View>;
};

// Componente para as ações do card
const CardActions = ({ children, style }) => {
  return (
    <PaperCard.Actions style={[styles.actions, style]}>
      {children}
    </PaperCard.Actions>
  );
};

// Estilos
const styles = StyleSheet.create({
  card: {
    marginVertical: 8,
    marginHorizontal: 0,
    borderRadius: 10,
  },
  content: {
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  section: {
    marginVertical: 8,
  },
  actions: {
    justifyContent: 'flex-end',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
});

// Exportar componentes
Card.Title = CardTitle;
Card.Section = CardSection;
Card.Actions = CardActions;

export default Card;