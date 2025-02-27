import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Text, Card, Divider, useTheme, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';
import Input from '../../components/Input';

// Serviços
import FirestoreService from '../../services/firestore.service';

const DriverProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile, logout, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  
  // Campos de edição
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  
  // Carregar dados do motorista
  useEffect(() => {
    const loadDriverData = async () => {
      if (!userProfile) return;
      
      try {
        setLoading(true);
        
        // Buscar dados do motorista
        const driverDoc = await FirestoreService.getDocument('drivers', userProfile.uid);
        
        if (driverDoc) {
          // Se o documento existe, use os dados
          setDriverData(driverDoc);
          
          // Preencher campos de edição
          setName(driverDoc.name || userProfile.displayName || '');
          setPhone(driverDoc.phone || '');
          setVehicleModel(driverDoc.vehicleModel || '');
          setVehiclePlate(driverDoc.vehiclePlate || '');
        } else {
          // Se o documento não existe, crie com dados iniciais
          const initialData = {
            name: userProfile.displayName || '',
            email: userProfile.email || '',
            status: 'active',
            type: 'driver'
          };
          
          // Criar documento no Firestore
          await FirestoreService.createDocumentWithId('drivers', userProfile.uid, initialData);
          
          // Atualizar estado local
          setDriverData(initialData);
          setName(initialData.name);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do motorista:', error);
        // Em caso de erro, pelo menos defina valores padrão
        setName(userProfile.displayName || '');
        setPhone('');
        setVehicleModel('');
        setVehiclePlate('');
      } finally {
        setLoading(false);
      }
    };
    
    loadDriverData();
  }, [userProfile]);
  
  // Salvar alterações no perfil
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      // Dados a serem atualizados
      const updatedData = {
        name,
        phone,
        vehicleModel,
        vehiclePlate: vehiclePlate.toUpperCase()
      };
      
      // Atualizar dados no Firestore
      await FirestoreService.updateDocument('drivers', userProfile.uid, updatedData);
      
      // Atualizar displayName no Auth se necessário
      if (name !== userProfile.displayName) {
        await updateProfile({ displayName: name });
      }
      
      // Atualizar estado local
      setDriverData(prev => ({ ...prev, ...updatedData }));
      
      // Sair do modo de edição
      setEditMode(false);
      
      Alert.alert('Sucesso', 'Perfil atualizado com sucesso');
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      Alert.alert('Erro', 'Não foi possível atualizar seu perfil. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };
  
  // Cancelar edição
  const handleCancelEdit = () => {
    // Restaurar valores originais
    setName(driverData?.name || userProfile?.displayName || '');
    setPhone(driverData?.phone || '');
    setVehicleModel(driverData?.vehicleModel || '');
    setVehiclePlate(driverData?.vehiclePlate || '');
    
    // Sair do modo de edição
    setEditMode(false);
  };
  
  // Função para fazer logout
  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair?',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sair',
          onPress: logout,
        },
      ]
    );
  };
  
  if (loading && !driverData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>Carregando perfil...</Text>
      </View>
    );
  }
  
  return (
    <ScrollView style={styles.container}>
      {/* Cabeçalho do perfil */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {driverData?.photoURL ? (
            <Image source={{ uri: driverData.photoURL }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}>
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userType}>Motorista</Text>
        </View>
      </View>
      
      {/* Informações pessoais */}
      <Card style={styles.card}>
        <Card.Title title="Informações Pessoais" />
        <Card.Content>
          {editMode ? (
            // Modo de edição
            <>
              <Input
                label="Nome"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
                autoCapitalize="words"
              />
              
              <Input
                label="Telefone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Seu telefone"
                keyboardType="phone-pad"
              />
            </>
          ) : (
            // Modo de visualização
            <>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Nome</Text>
                  <Text style={styles.infoValue}>{name || 'Não informado'}</Text>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Telefone</Text>
                  <Text style={styles.infoValue}>{phone || 'Não informado'}</Text>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="email" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{userProfile?.email || 'Não informado'}</Text>
                </View>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Informações do veículo */}
      <Card style={styles.card}>
        <Card.Title title="Informações do Veículo" />
        <Card.Content>
          {editMode ? (
            // Modo de edição
            <>
              <Input
                label="Modelo do Veículo"
                value={vehicleModel}
                onChangeText={setVehicleModel}
                placeholder="Ex: Sedan Preto"
                autoCapitalize="words"
              />
              
              <Input
                label="Placa do Veículo"
                value={vehiclePlate}
                onChangeText={setVehiclePlate}
                placeholder="Ex: ABC1234"
                autoCapitalize="characters"
              />
            </>
          ) : (
            // Modo de visualização
            <>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="car" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Modelo do Veículo</Text>
                  <Text style={styles.infoValue}>{vehicleModel || 'Não informado'}</Text>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="car-side" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Placa do Veículo</Text>
                  <Text style={styles.infoValue}>{vehiclePlate || 'Não informada'}</Text>
                </View>
              </View>
            </>
          )}
        </Card.Content>
      </Card>
      
      {/* Estatísticas */}
      <Card style={styles.card}>
        <Card.Title title="Estatísticas" />
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Acessos pendentes</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Acessos concluídos</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Total de acessos</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Botões de ação */
      // Adicione no DriverProfileScreen, dentro dos botões de ação:

<Button
  mode="outlined"
  icon="bell"
  onPress={async () => {
    try {
      // Importar serviço de notificação
      const NotificationService = require('../../services/notification.service').default;
      
      // Enviar notificação de teste
      await NotificationService.sendLocalNotification(
        'Notificação de Teste',
        'Esta é uma notificação de teste do Condy',
        { type: 'test' }
      );
      
      Alert.alert('Sucesso', 'Notificação de teste enviada');
    } catch (error) {
      console.error('Erro ao enviar notificação de teste:', error);
      Alert.alert('Erro', 'Não foi possível enviar a notificação de teste');
    }
  }}
  style={styles.actionButton}
>
  Testar Notificação
</Button>}
      <View style={styles.actionsContainer}>
        {editMode ? (
          // Botões para salvar/cancelar edição
          <>
            <Button
              mode="contained"
              icon="content-save"
              onPress={handleSaveProfile}
              loading={loading}
              disabled={loading}
              style={styles.actionButton}
            >
              Salvar Alterações
            </Button>
            
            <Button
              mode="outlined"
              icon="cancel"
              onPress={handleCancelEdit}
              disabled={loading}
              style={styles.actionButton}
            >
              Cancelar
            </Button>
          </>
        ) : (
          // Botões para editar/logout
          <>
            <Button
              mode="contained"
              icon="account-edit"
              onPress={() => setEditMode(true)}
              style={styles.actionButton}
            >
              Editar Perfil
            </Button>
            
            <Button
              mode="outlined"
              icon="logout"
              onPress={handleLogout}
              style={styles.actionButton}
            >
              Sair
            </Button>
          </>
        )}
      </View>
      
      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarContainer: {
    marginRight: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 36,
    color: 'white',
    fontWeight: 'bold',
  },
  headerInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  userType: {
    fontSize: 16,
    color: '#757575',
  },
  card: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  icon: {
    marginRight: 16,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: '#757575',
  },
  infoValue: {
    fontSize: 16,
  },
  divider: {
    marginVertical: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },
  actionsContainer: {
    padding: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: '#757575',
  },
  spacer: {
    height: 40,
  },
});

export default DriverProfileScreen;