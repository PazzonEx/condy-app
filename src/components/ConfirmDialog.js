// src/components/ConfirmDialog.js
import React from 'react';
import { Portal, Dialog, Button, Text } from 'react-native-paper';

const ConfirmDialog = ({
  visible,
  title = 'Confirmação',
  message = 'Tem certeza que deseja realizar esta ação?',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  confirmColor,
  loading = false
}) => {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onCancel}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text>{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button 
            onPress={onConfirm} 
            color={confirmColor}
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

export default ConfirmDialog;