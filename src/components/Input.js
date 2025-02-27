import React, { useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { TextInput } from 'react-native-paper';

// Componente de input personalizado
const Input = ({ 
  label, 
  value, 
  onChangeText, 
  error, 
  secureTextEntry = false, 
  disabled = false,
  keyboardType = 'default',
  placeholder,
  style,
  ...props 
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        label={label}
        value={value}
        onChangeText={onChangeText}
        mode="outlined"
        style={styles.input}
        secureTextEntry={secureTextEntry && !showPassword}
        disabled={disabled}
        keyboardType={keyboardType}
        placeholder={placeholder}
        error={!!error}
        right={
          secureTextEntry ? (
            <TextInput.Icon
              icon={showPassword ? 'eye-off' : 'eye'}
              onPress={handleTogglePassword}
            />
          ) : null
        }
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 8,
  },
  input: {
    backgroundColor: 'white',
  },
  error: {
    fontSize: 14,
    color: '#f13a59',
    paddingHorizontal: 4,
    paddingTop: 4,
  },
});

export default Input;