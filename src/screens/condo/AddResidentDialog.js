import React from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  SafeAreaView
} from 'react-native';

const AddResidentDialog = ({
  dialogVisible,
  setDialogVisible,
  newName,
  setNewName,
  newEmail,
  setNewEmail,
  newUnit,
  setNewUnit,
  newBlock,
  setNewBlock,
  newPhone,
  setNewPhone,
  createResidentAccount,
  loading
}) => {
  return (
    <Modal
      visible={dialogVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setDialogVisible(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <View style={styles.dialogContainer}>
            <View style={styles.dialogHeader}>
              <Text style={styles.dialogTitle}>Adicionar Morador</Text>
            </View>
            
            <ScrollView style={styles.dialogContent}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Nome Completo</Text>
                <TextInput
                  style={styles.input}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Nome do morador"
                  autoCapitalize="words"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={newEmail}
                  onChangeText={setNewEmail}
                  placeholder="Email do morador"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Unidade</Text>
                <TextInput
                  style={styles.input}
                  value={newUnit}
                  onChangeText={setNewUnit}
                  placeholder="Número da unidade"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Bloco (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={newBlock}
                  onChangeText={setNewBlock}
                  placeholder="Bloco do condomínio"
                  autoCapitalize="characters"
                />
              </View>
              
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Telefone (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={newPhone}
                  onChangeText={setNewPhone}
                  placeholder="Telefone do morador"
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>
            
            <View style={styles.dialogActions}>
              <TouchableOpacity 
                onPress={() => setDialogVisible(false)}
                style={styles.buttonCancel}
              >
                <Text style={styles.buttonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                onPress={createResidentAccount}
                disabled={loading}
                style={[
                  styles.buttonAdd,
                  loading && styles.buttonDisabled
                ]}
              >
                <Text style={styles.buttonAddText}>
                  {loading ? 'Processando...' : 'Adicionar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    width: '100%',
    maxWidth: 500,
    flex: 1,
    justifyContent: 'center',
  },
  dialogContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    margin: 20,
    maxHeight: '90%',
    width: '90%',
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dialogHeader: {
    marginBottom: 20,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
  },
  dialogContent: {
    flexGrow: 0,
    maxHeight: 400,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 6,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F5F5F5',
  },
  dialogActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 20,
  },
  buttonCancel: {
    padding: 10,
    marginRight: 10,
  },
  buttonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  buttonAdd: {
    backgroundColor: '#007AFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  buttonAddText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
  },
});

export default AddResidentDialog;