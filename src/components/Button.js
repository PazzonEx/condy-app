// src/components/Button.js
import React from 'react';
import { Button as PaperButton } from 'react-native-paper';
import { COLORS } from '../styles/theme';

const Button = ({ children, mode = 'contained', style, labelStyle, ...props }) => {
  return (
    <PaperButton
      mode={mode}
      style={[
        { 
          borderRadius: 8,
          marginVertical: 8,
        }, 
        mode === 'contained' && { backgroundColor: COLORS.primary },
        style
      ]}
      labelStyle={[
        { 
          fontWeight: '600',
          fontSize: 16,
        },
        labelStyle
      ]}
      // Importante: passamos o children como conteúdo do botão e não como title
      {...props}
    >
      {children}
    </PaperButton>
  );
};

export default Button;