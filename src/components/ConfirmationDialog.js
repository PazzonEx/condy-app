// src/components/ConfirmationDialog.js
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Dialog, Portal, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const ConfirmationDialog = ({
  visible,
  onDismiss,
  onConfirm,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  destructive = false,
  loading = false,
  icon = null
}) => {
  const theme = useTheme();
  
  // Determinar cor do botão de ação com base no modo destrutivo
  const actionColor = destructive ? '#F44336' : theme.colors.primary;
  
  // Determinar ícone a ser exibido
  const determineIcon = () => {
    if (icon) return icon;
    if (destructive) return 'alert-circle';
    return 'help-circle';
  };
  
  // Determinar cor do ícone
  const determineIconColor = () => {
    if (destructive) return '#F44336';
    return theme.colors.primary;
  };
  
  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={styles.dialog}
      >
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons 
            name={determineIcon()} 
            size={40} 
            color={determineIconColor()}
          />
        </View>
        
        <Dialog.Title style={styles.title}>{title}</Dialog.Title>
        
        <Dialog.Content>
          <Text style={styles.message}>{message}</Text>
        </Dialog.Content>
        
        <Dialog.Actions style={styles.actions}>
          <Button 
            mode="text"
            onPress={onDismiss}
            style={styles.cancelButton}
            labelStyle={styles.cancelButtonLabel}
            disabled={loading}
          >
            {cancelText}
          </Button>
          
          <Button 
            mode="contained"
            onPress={onConfirm}
            style={[styles.confirmButton, { backgroundColor: actionColor }]}
            labelStyle={styles.confirmButtonLabel}
            loading={loading}
            disabled={loading}
          >
            {confirmText}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
};

const styles = StyleSheet.create({
  dialog: {
    borderRadius: 16,
    padding: 8,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 8,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    justifyContent: 'space-between',
    padding: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  cancelButtonLabel: {
    fontSize: 14,
  },
  confirmButton: {
    flex: 1,
    marginLeft: 8,
  },
  confirmButtonLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
});

export default ConfirmationDialog;