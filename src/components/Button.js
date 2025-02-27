import React from 'react';
import { StyleSheet } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';

// Componente de botão personalizado
const Button = ({ mode = 'contained', style, children, loading = false, disabled = false, ...props }) => {
  return (
    <PaperButton
      mode={mode}
      style={[
        styles.button,
        mode === 'outlined' && styles.outlined,
        style
      ]}
      labelStyle={styles.buttonLabel}
      loading={loading}
      disabled={disabled || loading}
      {...props}
    >
      {children}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    marginVertical: 10,
    paddingVertical: 2,
    borderRadius: 8,
  },
  buttonLabel: {
    fontSize: 16,
    lineHeight: 26,
    fontWeight: 'bold',
    padding: 4
  },
  outlined: {
    borderWidth: 1,
  }
});

export default Button;