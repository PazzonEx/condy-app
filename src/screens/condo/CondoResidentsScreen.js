import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert,   
  Modal,
  TouchableOpacity,
  TextInput,  
  KeyboardAvoidingView,
  Platform,
  SafeAreaView
} from 'react-native';
import AddResidentDialog from './AddResidentDialog';

import { 
  Text, 
  Card, 
  Divider, 
  useTheme, 
  FAB,
  Dialog, 
  Portal,
  RadioButton,
  ActivityIndicator,
  Button as PaperButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks
import { useAuth } from '../../hooks/useAuth';
import { auth } from '../../config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';

// Componentes personalizados

// Serviços
import FirestoreService from '../../services/firestore.service';
import AuthService from '../../services/auth.service';

const CondoResidentsScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile, logout } = useAuth();

  // Estados para gerenciamento de moradores
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [newResident, setNewResident] = useState({})
  const [newName, setNewName]= useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newBlock, setNewBlock] = useState("");
  const [newPhone, setNewPhone] = useState("");
  
  const [selectedUnit, setSelectedUnit] = useState('');

  // Carregar moradores do condomínio
  useEffect(() => {
    loadResidents();
  }, [userProfile]);

  const loadResidents = async () => {
    try {
      setLoading(true);
      // Buscar moradores do condomínio atual
      const condoResidents = await FirestoreService.queryDocuments('residents', [
        { field: 'condoId', operator: '==', value: userProfile.id  }
      ]);
      
      setResidents(condoResidents);
    } catch (error) {
      //console.error('Erro ao carregar moradores:', error);
      
    } finally {
      setLoading(false);
    }
  };

  // Criar conta para morador
  const createResidentAccount = async () => {

    setNewResident({
      name: newName,
      email: newEmail,
      unit: newUnit,
      block: newBlock,
      phone: newPhone
    });
    // Validações

    const { name, email, unit, block, phone } = newResident;
    
    if (!name.trim()) {
      Alert.alert('Erro', 'Nome é obrigatório');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Erro', 'Email é obrigatório');
      return;
    }
    
    if (!unit.trim()) {
      Alert.alert('Erro', 'Unidade é obrigatória');
      return;
    }

    try {
      setLoading(true);
      
      // Gerar senha temporária
      const tempPassword = Math.random().toString(36).slice(-8);
      
      // Criar usuário no Firebase Auth
      const user = await AuthService.register(email, tempPassword, name);
      try {
        console.log('Enviando email de redefinição de senha para:', email);
        console.log('auth:', auth);
        await sendPasswordResetEmail(auth, email);
        
      } catch (error) {
        console.error('Erro ao enviar email de redefinição de senha:', error);
        throw error;
      }
     
    
      
      Alert.alert(
        'Conta Criada', 
        `Conta criada para ${name}.Senha provisoria ${tempPassword}. Um email de redefinição de senha foi enviado.`
      );
      
     // Limpar formulário
      setNewResident({
        name: '', 
        email: '',
        unit: '',
        block: '',
        phone: ''
      });
       // Função para fazer logout
  const handleLogout = () => {
    Alert.alert(
      'Continuação do cadastro',
      'Continue o cadastro do morador ou deixar ele redifinir a senha?',
      [
        {
          text: 'Continuar cadastro',
          style: 'cancel',
        },
        {
          text: 'Sair',
          onPress: logout,
        },
      ]
    );
  };
  handleLogout()
    } catch (error) {
      console.error('Erro ao criar conta de morador:', error);
      Alert.alert('Erro', error.message || 'Não foi possível criar a conta');
    } finally {
      setLoading(false);
    }
  };

  // Excluir morador
  const deleteResident = async (residentId) => {
    Alert.alert(
      'Confirmação',
      'Tem certeza que deseja remover este morador?',
      [
        {
          text: 'Cancelar',
          style: 'cancel'
        },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              // Excluir documentos do morador
              await FirestoreService.deleteDocument('residents', residentId);
              await FirestoreService.deleteDocument('users', residentId);
              
              // Recarregar lista
              loadResidents();
              
              Alert.alert('Sucesso', 'Morador removido com sucesso');
            } catch (error) {
              console.error('Erro ao excluir morador:', error);
              Alert.alert('Erro', 'Não foi possível remover o morador');
            }
          }
        }
      ]
    );
  };
  
  // Renderizar cartão de morador
  const renderResidentCard = (resident) => (
    <Card key={resident.id} style={styles.residentCard}>
      <Card.Content style={styles.residentCardContent}>
        <View style={styles.residentInfo}>
          <MaterialCommunityIcons 
            name="account-circle" 
            size={40} 
            color={theme.colors.primary} 
          />
          <View style={styles.residentDetails}>
            <Text style={styles.residentName}>{resident.name}</Text>
            <Text style={styles.residentSubtitle}>
              Unidade: {resident.unit}
              {resident.block ? ` • Bloco ${resident.block}` : ''}
            </Text>
            <Text style={styles.residentContact}>{resident.email}</Text>
            {resident.phone && (
              <Text style={styles.residentContact}>{resident.phone}</Text>
            )}
          </View>
        </View>
        
        <View style={styles.residentActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => {
              // TODO: Implementar edição de morador
              Alert.alert('Em Desenvolvimento', 'Funcionalidade de edição em breve');
            }}
          >
            <MaterialCommunityIcons 
              name="pencil" 
              size={24} 
              color={theme.colors.primary} 
            />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={() => deleteResident(resident.id)}
          >
            <MaterialCommunityIcons 
              name="delete" 
              size={24} 
              color={theme.colors.error} 
            />
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Moradores</Text>
        <Text style={styles.headerSubtitle}>
          Gerencie os moradores do seu condomínio
        </Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator 
            size="large" 
            color={theme.colors.primary} 
          />
        </View>
      ) : residents.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="account-multiple-outline" 
            size={64} 
            color="#BDBDBD" 
          />
          <Text style={styles.emptyTitle}>Nenhum morador cadastrado</Text>
          <Text style={styles.emptySubtitle}>
            Adicione moradores ao seu condomínio
          </Text>
        </View>
      ) : (
        <ScrollView 
          style={styles.listContainer}
          contentContainerStyle={styles.listContent}
        >
          {residents.map(renderResidentCard)}
        </ScrollView>
      )}

      <FAB
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        icon="plus"
        onPress={() => setDialogVisible(true)}
      />

      {/* Diálogo de Adicionar Morador */}
      <AddResidentDialog
        dialogVisible={dialogVisible}
        setDialogVisible={setDialogVisible}
        newName={newName}
        setNewName={setNewName}
        newEmail={newEmail}
        setNewEmail={setNewEmail}
        newUnit={newUnit}
        setNewUnit={setNewUnit}
        newBlock={newBlock}
        setNewBlock={setNewBlock}
        newPhone={newPhone}
        setNewPhone={setNewPhone}
        createResidentAccount={createResidentAccount}
        loading={loading}
      />
      
    
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop:35,
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#757575',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  residentCard: {
    marginBottom: 16,
    borderRadius: 8,
  },
  residentCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  residentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  residentDetails: {
    marginLeft: 16,
    flex: 1,
  },
  residentName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  residentSubtitle: {
    fontSize: 14,
    color: '#757575',
    marginVertical: 4,
  },
  residentContact: {
    fontSize: 12,
    color: '#757575',
  },
  residentActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CondoResidentsScreen; 