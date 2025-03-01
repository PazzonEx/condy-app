import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, Image, TouchableOpacity } from 'react-native';
import { Text, Card, Divider, useTheme, ActivityIndicator, IconButton } from 'react-native-paper';
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

const CondoProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile, logout, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [condoData, setCondoData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [photoURL, setPhotoURL] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Campos de edição
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [units, setUnits] = useState('');
  const [blocks, setBlocks] = useState('');
  
  // Carregar dados do condomínio
  useEffect(() => {
    const loadCondoData = async () => {
      if (!userProfile) return;
      
      try {
        setLoading(true);
        
        // Buscar dados do condomínio
        const condoDoc = await FirestoreService.getDocument('condos', userProfile.id);
        
        if (condoDoc) {
          setCondoData(condoDoc);
          setPhotoURL(condoDoc.photoURL);
          
          // Preencher campos de edição
          setName(condoDoc.name || userProfile.displayName || '');
          setPhone(condoDoc.phone || '');
          setAddress(condoDoc.address || '');
          setUnits(condoDoc.units ? String(condoDoc.units) : '');
          setBlocks(condoDoc.blocks ? String(condoDoc.blocks) : '');
        } else {
          // Se o documento não existe, crie com dados iniciais
          const initialData = {
            name: userProfile.displayName || '',
            email: userProfile.email || '',
            status: 'active',
            type: 'condo'
          };
          
          // Criar documento no Firestore
          await FirestoreService.createDocumentWithId('condos', userProfile.id, initialData);
          
          // Atualizar estado local
          setCondoData(initialData);
          setName(initialData.name);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do condomínio:', error);
        Alert.alert('Erro', 'Não foi possível carregar seus dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCondoData();
  }, [userProfile]);

  // Escolher foto do condomínio
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
        const path = `condo_photos/${userProfile.id}/${filename}`;
        
        const uploadResult = await StorageService.uploadFile(path, uri);
        
        // Atualizar URL da foto
        setPhotoURL(uploadResult.url);
        
        // Atualizar documento no Firestore
        await FirestoreService.updateDocument('condos', userProfile.id, {
          photoURL: uploadResult.url
        });
        
        setUploadingPhoto(false);
        Alert.alert('Sucesso', 'Foto do condomínio atualizada com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao escolher foto:', error);
      setUploadingPhoto(false);
      Alert.alert('Erro', 'Não foi possível atualizar a foto do condomínio. Tente novamente.');
    }
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
      
      if (!address.trim()) {
        Alert.alert('Erro', 'O endereço é obrigatório');
        setLoading(false);
        return;
      }
      
      // Dados a serem atualizados
      const updatedData = {
        name,
        phone,
        address,
        units: units ? parseInt(units, 10) : 0,
        blocks: blocks ? parseInt(blocks, 10) : 0
      };
      
      // Atualizar dados no Firestore
      await FirestoreService.updateDocument('condos', userProfile.id, updatedData);
      
      // Atualizar displayName no Auth se necessário
      if (name !== userProfile.displayName) {
        await updateProfile({ displayName: name });
      }
      
      // Atualizar estado local
      setCondoData(prev => ({ ...prev, ...updatedData }));
      
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
    setName(condoData?.name || userProfile?.displayName || '');
    setPhone(condoData?.phone || '');
    setAddress(condoData?.address || '');
    setUnits(condoData?.units ? String(condoData.units) : '');
    setBlocks(condoData?.blocks ? String(condoData.blocks) : '');
    
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

  if (loading && !condoData) {
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
              <MaterialCommunityIcons name="office-building" size={40} color="white" />
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
          <Text style={styles.userType}>Condomínio</Text>
          {condoData?.plan && (
            <View style={styles.planBadge}>
              <Text style={styles.planText}>
                Plano {condoData.plan === 'free' ? 'Gratuito' : 
                       condoData.plan === 'basic' ? 'Básico' : 'Premium'}
              </Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Informações do condomínio */}
      <Card style={styles.card}>
        <Card.Title title="Informações do Condomínio" />
        <Card.Content>
          {editMode ? (
            // Modo de edição
            <>
              <Input
                label="Nome do Condomínio"
                value={name}
                onChangeText={setName}
                placeholder="Nome do condomínio"
                autoCapitalize="words"
              />
              
              <Input
                label="Telefone"
                value={phone}
                onChangeText={setPhone}
                placeholder="Telefone do condomínio"
                keyboardType="phone-pad"
              />
              
              <Input
                label="Endereço"
                value={address}
                onChangeText={setAddress}
                placeholder="Endereço completo"
                autoCapitalize="words"
              />
              
              <View style={styles.rowInputs}>
                <Input
                  label="Número de Unidades"
                  value={units}
                  onChangeText={setUnits}
                  placeholder="Ex: 100"
                  keyboardType="numeric"
                  style={styles.halfInput}
                />
                
                <Input
                  label="Número de Blocos"
                  value={blocks}
                  onChangeText={setBlocks}
                  placeholder="Ex: 4"
                  keyboardType="numeric"
                  style={styles.halfInput}
                />
              </View>
            </>
          ) : (
            // Modo de visualização
            <>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="office-building" size={24} color="#555" style={styles.icon} />
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
                <MaterialCommunityIcons name="map-marker" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Endereço</Text>
                  <Text style={styles.infoValue}>{address || 'Não informado'}</Text>
                </View>
              </View>
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="home-city" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Estrutura</Text>
                  <Text style={styles.infoValue}>
                    {units ? `${units} unidades` : 'Número de unidades não informado'}
                    {blocks && units ? ` • ${blocks} blocos` : blocks ? `${blocks} blocos` : ''}
                  </Text>
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
      
      {/* Estatísticas */}
      <Card style={styles.card}>
        <Card.Title 
          title="Estatísticas" 
          right={(props) => (
            <IconButton 
              {...props} 
              icon="chart-bar" 
              onPress={() => navigation.navigate('CondoDashboard')} 
            />
          )}
        />
        <Card.Content>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{condoData?.stats?.totalRequests || 0}</Text>
              <Text style={styles.statLabel}>Total de Acessos</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{condoData?.stats?.pendingRequests || 0}</Text>
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{condoData?.stats?.totalResidents || 0}</Text>
              <Text style={styles.statLabel}>Moradores</Text>
            </View>
          </View>
          
          <Button
            mode="outlined"
            icon="chart-bar"
            onPress={() => navigation.navigate('CondoDashboard')}
            style={styles.dashboardButton}
          >
            Ver Dashboard Completo
          </Button>
        </Card.Content>
      </Card>
      
      {/* Plano de assinatura */}
      <Card style={styles.card}>
        <Card.Title title="Plano de Assinatura" />
        <Card.Content>
          <View style={styles.planRow}>
            <MaterialCommunityIcons 
              name={
                condoData?.plan === 'premium' ? 'crown' : 
                condoData?.plan === 'basic' ? 'shield-check' : 'shield'
              } 
              size={36} 
              color={
                condoData?.plan === 'premium' ? '#FFC107' : 
                condoData?.plan === 'basic' ? '#4CAF50' : '#757575'
              } 
              style={styles.planIcon} 
            />
            
            <View style={styles.planInfo}>
              <Text style={styles.planName}>
                Plano {condoData?.plan === 'free' ? 'Gratuito' : 
                       condoData?.plan === 'basic' ? 'Básico' : 'Premium'}
              </Text>
              
              {condoData?.subscription?.endDate && (
                <Text style={styles.planExpiry}>
                  Válido até: {new Date(condoData.subscription.endDate.seconds * 1000).toLocaleDateString()}
                </Text>
              )}
            </View>
          </View>
          
          <Button
            mode="outlined"
            icon="credit-card"
            onPress={() => navigation.navigate('CondoSubscription')}
            style={styles.upgradeButton}
          >
            {condoData?.plan === 'free' ? 'Fazer Upgrade' : 'Gerenciar Assinatura'}
          </Button>
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
              onPress={() => navigation.navigate('CondoSettings')}
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
  },
  planBadge: {
    marginTop: 8,
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  planText: {
    color: '#1E88E5',
    fontSize: 12,
    fontWeight: 'bold',
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
  rowInputs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
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
  dashboardButton: {
    marginTop: 16,
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  planIcon: {
    marginRight: 16,
  },
  planInfo: {
    flex: 1,
  },
  planName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  planExpiry: {
    fontSize: 14,
    color: '#757575',
  },
  upgradeButton: {
    marginTop: 8,
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

export default CondoProfileScreen;