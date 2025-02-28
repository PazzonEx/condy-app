import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, useTheme, ActivityIndicator, Badge, Button as PaperButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Button from '../../components/Button';
import Input from '../../components/Input';

// Serviços
import FirestoreService from '../../services/firestore.service';
import StorageService from '../../services/storage.service';

const DriverProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile, logout, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [driverData, setDriverData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [photoURL, setPhotoURL] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  
  // Campos de edição
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleColor, setVehicleColor] = useState('');
  const [vehicleYear, setVehicleYear] = useState('');
  const [serviceType, setServiceType] = useState('');
  
  // Disponibilidade
  const [isAvailable, setIsAvailable] = useState(true);
  
  // Estatísticas
  const [stats, setStats] = useState({
    totalTrips: 0,
    pendingRequests: 0,
    completedTrips: 0,
    rating: 0
  });
  
  // Carregar dados do motorista
  useEffect(() => {
    // Correção para o arquivo DriverProfileScreen.js

// Corrigir o tratamento de valores undefined em índices e arrays
const loadDriverData = async () => {
  if (!userProfile) return;
  
  try {
    setLoading(true);
    
    // Buscar dados do motorista
    const driverDoc = await FirestoreService.getDocument('drivers', userProfile.uid);
    
    if (driverDoc) {
      setDriverData(driverDoc);
      setPhotoURL(driverDoc.photoURL || null);
      setVerificationStatus(driverDoc.verificationStatus || 'pending');
      
      // Preencher campos de edição com verificações de nulos
      setName(driverDoc.name || userProfile.displayName || '');
      setPhone(driverDoc.phone || '');
      setVehicleModel(driverDoc.vehicleModel || '');
      setVehiclePlate(driverDoc.vehiclePlate || '');
      setVehicleColor(driverDoc.vehicleColor || '');
      setVehicleYear(driverDoc.vehicleYear || '');
      setServiceType(driverDoc.serviceType || '');
      setIsAvailable(driverDoc.isAvailable !== false); // default para true
    } else {
      // Se o documento não existe, crie com dados iniciais
      const initialData = {
        name: userProfile.displayName || '',
        email: userProfile.email || '',
        status: 'active',
        type: 'driver',
        verificationStatus: 'pending',
        isAvailable: true,
        // Adicione campos vazios para evitar erros de undefined
        phone: '',
        vehicleModel: '',
        vehiclePlate: '',
        vehicleColor: '',
        vehicleYear: '',
        serviceType: ''
      };
      
      try {
        // Criar documento no Firestore
        await FirestoreService.createDocumentWithId('drivers', userProfile.uid, initialData);
        
        // Atualizar estado local
        setDriverData(initialData);
        setName(initialData.name);
        setVerificationStatus('pending');
      } catch (innerError) {
        console.error('Erro ao criar documento de motorista:', innerError);
        // Mesmo com erro, definir estados básicos para evitar erros de renderização
        setDriverData({});
        setName(userProfile.displayName || '');
      }
    }
  } catch (error) {
    console.error('Erro ao carregar dados do motorista:', error);
    Alert.alert('Erro', 'Não foi possível carregar seus dados. Tente novamente mais tarde.');
    
    // Mesmo com erro, definir estados básicos para evitar erros de renderização
    setDriverData({});
    setName(userProfile.displayName || '');
  } finally {
    setLoading(false);
  }
};
    
    loadDriverData();
  }, [userProfile]);
  
  // Alternar disponibilidade
  const toggleAvailability = async () => {
    try {
      const newAvailability = !isAvailable;
      
      // Atualizar no Firestore
      await FirestoreService.updateDocument('drivers', userProfile.uid, {
        isAvailable: newAvailability
      });
      
      // Atualizar estado local
      setIsAvailable(newAvailability);
      setDriverData(prev => ({ ...prev, isAvailable: newAvailability }));
      
      Alert.alert(
        'Status Atualizado', 
        `Você está ${newAvailability ? 'disponível' : 'indisponível'} para novas solicitações.`
      );
    } catch (error) {
      console.error('Erro ao atualizar disponibilidade:', error);
      Alert.alert('Erro', 'Não foi possível atualizar seu status. Tente novamente.');
    }
  };

  // Escolher foto de perfil
  const handleChoosePhoto = async () => {
    try {
      // Solicitar permissão para acessar a biblioteca de mídia
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário conceder permissão para acessar a galeria.');
        return;
      }
      
      // Abrir seletor de imagem
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setUploadingPhoto(true);
        
        // Fazer upload da imagem
        const uri = result.assets[0].uri;
        const filename = uri.split('/').pop();
        const path = `profile_photos/${userProfile.uid}/${filename}`;
        
        const uploadResult = await StorageService.uploadFile(path, uri);
        
        // Atualizar URL da foto
        setPhotoURL(uploadResult.url);
        
        // Atualizar documento no Firestore
        await FirestoreService.updateDocument('drivers', userProfile.uid, {
          photoURL: uploadResult.url
        });
        
        setUploadingPhoto(false);
        Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao escolher foto:', error);
      setUploadingPhoto(false);
      Alert.alert('Erro', 'Não foi possível atualizar a foto de perfil. Tente novamente.');
    }
  };

  // Formatar placa do veículo
  const handleVehiclePlateChange = (text) => {
    // Remover caracteres não alfanuméricos
    const cleanedText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    
    // Limitar a 7 caracteres
    const limitedText = cleanedText.substring(0, 7);
    
    // Formatar com hífen após os 3 primeiros caracteres
    let formattedText = limitedText;
    if (limitedText.length > 3) {
      formattedText = `${limitedText.substring(0, 3)}-${limitedText.substring(3)}`;
    }
    
    setVehiclePlate(formattedText);
  };

  // Salvar alterações no perfil
  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      
      // Validar dados
      if (!name.trim()) {
        Alert.alert('Erro', 'O nome é obrigatório');
        setLoading(false);
        return;
      }
      
      if (!vehiclePlate.trim()) {
        Alert.alert('Erro', 'A placa do veículo é obrigatória');
        setLoading(false);
        return;
      }
      
      if (!vehicleModel.trim()) {
        Alert.alert('Erro', 'O modelo do veículo é obrigatório');
        setLoading(false);
        return;
      }
      
      if (!phone.trim()) {
        Alert.alert('Erro', 'O telefone é obrigatório');
        setLoading(false);
        return;
      }
      
      // Dados a serem atualizados
      const updatedData = {
        name,
        phone,
        vehicleModel,
        vehiclePlate: vehiclePlate.toUpperCase(),
        vehicleColor,
        vehicleYear,
        serviceType
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
    setVehicleColor(driverData?.vehicleColor || '');
    setVehicleYear(driverData?.vehicleYear || '');
    setServiceType(driverData?.serviceType || '');
    
    // Sair do modo de edição
    setEditMode(false);
  };

  // Formatar exibição do tipo de serviço
  const getServiceTypeLabel = (type) => {
    switch (type) {
      case 'app':
        return 'Aplicativo de transporte';
      case 'delivery':
        return 'Entregador';
      case 'private':
        return 'Motorista particular';
      case 'taxi':
        return 'Taxista';
      default:
        return type || 'Não informado';
    }
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
          {uploadingPhoto ? (
            <ActivityIndicator size="large" color={theme.colors.primary} style={styles.avatar} />
          ) : photoURL ? (
            <TouchableOpacity onPress={handleChoosePhoto} disabled={!editMode}>
              <Image source={{ uri: photoURL }} style={styles.avatar} />
              {editMode && (
                <View style={styles.editPhotoButton}>
                  <MaterialCommunityIcons name="camera" size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.avatarPlaceholder, { backgroundColor: theme.colors.primary }]}
              onPress={handleChoosePhoto}
              disabled={!editMode}
            >
              <Text style={styles.avatarText}>
                {name.charAt(0).toUpperCase()}
              </Text>
              {editMode && (
                <View style={styles.editPhotoButton}>
                  <MaterialCommunityIcons name="camera" size={20} color="white" />
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.headerInfo}>
          <Text style={styles.userName}>{name}</Text>
          <Text style={styles.userType}>Motorista</Text>
          
          <View style={styles.badgesContainer}>
            {/* Badge de verificação */}
            <View style={[
              styles.statusBadge,
              {
                backgroundColor: 
                  verificationStatus === 'verified' ? '#4CAF50' : 
                  verificationStatus === 'pending' ? '#FFC107' : '#F44336'
              }
            ]}>
              <MaterialCommunityIcons 
                name={
                  verificationStatus === 'verified' ? 'check-circle' : 
                  verificationStatus === 'pending' ? 'clock-outline' : 'close-circle'
                } 
                size={14} 
                color="white" 
              />
              <Text style={styles.statusBadgeText}>
                {verificationStatus === 'verified' ? 'Verificado' : 
                 verificationStatus === 'pending' ? 'Pendente' : 'Rejeitado'}
              </Text>
            </View>
            
            {/* Badge de disponibilidade */}
            <View style={[
              styles.statusBadge,
              { backgroundColor: isAvailable ? '#4CAF50' : '#757575' }
            ]}>
              <MaterialCommunityIcons 
                name={isAvailable ? 'car' : 'car-off'} 
                size={14} 
                color="white" 
              />
              <Text style={styles.statusBadgeText}>
                {isAvailable ? 'Disponível' : 'Indisponível'}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      {/* Botão de alternância de disponibilidade */}
      <Card style={styles.availabilityCard}>
        <Card.Content style={styles.availabilityContent}>
          <View style={styles.availabilityTextContainer}>
            <Text style={styles.availabilityTitle}>
              {isAvailable ? 'Você está disponível' : 'Você está indisponível'}
            </Text>
            <Text style={styles.availabilityDescription}>
              {isAvailable 
                ? 'Você está recebendo solicitações de acesso' 
                : 'Você não está recebendo novas solicitações'}
            </Text>
          </View>
          
          <PaperButton 
            mode="contained"
            onPress={toggleAvailability}
            style={[
              styles.availabilityButton,
              { backgroundColor: isAvailable ? '#F44336' : '#4CAF50' }
            ]}
          >
            {isAvailable ? 'Ficar Indisponível' : 'Ficar Disponível'}
          </PaperButton>
        </Card.Content>
      </Card>
      
      {/* Informações pessoais */}
      <Card style={styles.card}>
        <Card.Title title="Informações Pessoais" />
        <Card.Content>
          {editMode ? (
            // Modo de edição
            <>
              <Input
                label="Nome completo"
                value={name}
                onChangeText={setName}
                placeholder="Seu nome completo"
                autoCapitalize="words"
              />
              
              <Input
                label="Telefone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Seu telefone de contato"
                keyboardType="phone-pad"
              />
              
              <Input
                label="Tipo de Serviço"
                value={serviceType}
                onChangeText={setServiceType}
                placeholder="Ex: Aplicativo, Taxista, Entregador"
                autoCapitalize="words"
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
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="briefcase" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Tipo de Serviço</Text>
                  <Text style={styles.infoValue}>{getServiceTypeLabel(serviceType)}</Text>
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
                onChangeText={handleVehiclePlateChange}
                placeholder="Ex: ABC1234"
                autoCapitalize="characters"
              />
              
              <View style={styles.rowInputs}>
                <Input
                  label="Cor"
                  value={vehicleColor}
                  onChangeText={setVehicleColor}
                  placeholder="Ex: Preto"
                  autoCapitalize="words"
                  style={styles.halfInput}
                />
                
                <Input
                  label="Ano"
                  value={vehicleYear}
                  onChangeText={setVehicleYear}
                  placeholder="Ex: 2022"
                  keyboardType="numeric"
                  style={styles.halfInput}
                />
              </View>
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
              
              {(vehicleColor || vehicleYear) && (
                <>
                  <Divider style={styles.divider} />
                  
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="palette" size={24} color="#555" style={styles.icon} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Detalhes</Text>
                      <Text style={styles.infoValue}>
                        {vehicleColor ? `Cor: ${vehicleColor}` : ''}
                        {vehicleColor && vehicleYear ? ' • ' : ''}
                        {vehicleYear ? `Ano: ${vehicleYear}` : ''}
                      </Text>
                    </View>
                  </View>
                </>
              )}
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
              <Text style={styles.statValue}>{stats.totalTrips}</Text>
              <Text style={styles.statLabel}>Total de Viagens</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.pendingRequests}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.rating.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Avaliação</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
      
      {/* Botões de ação */}
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
              icon="cog"
              onPress={() => navigation.navigate('DriverSettings')}
              style={styles.actionButton}
            >
              Configurações
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
  editPhotoButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
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
    marginBottom: 8,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
  },
  statusBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  availabilityCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
  },
  availabilityContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  availabilityTextContainer: {
    flex: 1,
  },
  availabilityTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  availabilityDescription: {
    fontSize: 14,
    color: '#757575',
  },
  availabilityButton: {
    marginLeft: 16,
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
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
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