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

const ResidentProfileScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile, logout, updateProfile } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [residentData, setResidentData] = useState(null);
  const [condoData, setCondoData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [photoURL, setPhotoURL] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Campos de edição
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [unit, setUnit] = useState('');
  const [block, setBlock] = useState('');
  const [condoId, setCondoId] = useState('');
  const [availableCondos, setAvailableCondos] = useState([]);
  const [searchCondoQuery, setSearchCondoQuery] = useState('');
  const [showCondosList, setShowCondosList] = useState(false);

  // Carregar dados do residente
  useEffect(() => {
    const loadResidentData = async () => {
      if (!userProfile) return;
      
      try {
        setLoading(true);
        
        // Buscar dados do residente
        const residentDoc = await FirestoreService.getDocument('residents', userProfile.uid);
        
        if (residentDoc) {
          setResidentData(residentDoc);
          setPhotoURL(residentDoc.photoURL);
          
          // Preencher campos de edição
          setName(residentDoc.name || userProfile.displayName || '');
          setPhone(residentDoc.phone || '');
          setUnit(residentDoc.unit || '');
          setBlock(residentDoc.block || '');
          setCondoId(residentDoc.condoId || '');
          
          // Buscar dados do condomínio se houver ID
          if (residentDoc.condoId) {
            const condoDoc = await FirestoreService.getDocument('condos', residentDoc.condoId);
            if (condoDoc) {
              setCondoData(condoDoc);
            }
          }
        } else {
          // Se o documento não existe, crie com dados iniciais
          const initialData = {
            name: userProfile.displayName || '',
            email: userProfile.email || '',
            status: 'active',
            type: 'resident'
          };
          
          // Criar documento no Firestore
          await FirestoreService.createDocumentWithId('residents', userProfile.uid, initialData);
          
          // Atualizar estado local
          setResidentData(initialData);
          setName(initialData.name);
        }
        
        // Carregar condomínios disponíveis
        const condos = await FirestoreService.getCollection('condos');
        setAvailableCondos(condos);
        
      } catch (error) {
        console.error('Erro ao carregar dados do residente:', error);
        Alert.alert('Erro', 'Não foi possível carregar seus dados. Tente novamente mais tarde.');
      } finally {
        setLoading(false);
      }
    };
    
    loadResidentData();
  }, [userProfile]);

  // Filtrar condomínios com base na pesquisa
  const filteredCondos = searchCondoQuery.trim() === '' 
    ? availableCondos 
    : availableCondos.filter(condo => 
        condo.name?.toLowerCase().includes(searchCondoQuery.toLowerCase()) ||
        condo.address?.toLowerCase().includes(searchCondoQuery.toLowerCase())
      );

  // Selecionar condomínio da lista
  const handleSelectCondo = (condo) => {
    setCondoId(condo.id);
    setCondoData(condo);
    setShowCondosList(false);
    setSearchCondoQuery('');
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
        await FirestoreService.updateDocument('residents', userProfile.uid, {
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
      
      // Dados a serem atualizados
      const updatedData = {
        name,
        phone,
        unit,
        block,
        condoId
      };
      
      // Atualizar dados no Firestore
      await FirestoreService.updateDocument('residents', userProfile.uid, updatedData);
      
      // Atualizar displayName no Auth se necessário
      if (name !== userProfile.displayName) {
        await updateProfile({ displayName: name });
      }
      
      // Atualizar estado local
      setResidentData(prev => ({ ...prev, ...updatedData }));
      
      // Buscar dados atualizados do condomínio se houver alteração
      if (condoId && condoId !== residentData?.condoId) {
        const condoDoc = await FirestoreService.getDocument('condos', condoId);
        if (condoDoc) {
          setCondoData(condoDoc);
        }
      }
      
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
    setName(residentData?.name || userProfile?.displayName || '');
    setPhone(residentData?.phone || '');
    setUnit(residentData?.unit || '');
    setBlock(residentData?.block || '');
    setCondoId(residentData?.condoId || '');
    
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

  if (loading && !residentData) {
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
            <TouchableOpacity onPress={handleChoosePhoto} disabled={editMode}>
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
          <Text style={styles.userType}>Morador</Text>
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
      
      {/* Informações do condomínio */}
      <Card style={styles.card}>
        <Card.Title title="Informações do Condomínio" />
        <Card.Content>
          {editMode ? (
            // Modo de edição
            <>
              <View style={styles.condoSearchContainer}>
                <Input
                  label="Condomínio"
                  value={searchCondoQuery}
                  onChangeText={(text) => {
                    setSearchCondoQuery(text);
                    setShowCondosList(true);
                  }}
                  placeholder="Pesquisar condomínio..."
                  right={
                    <TouchableOpacity 
                      style={styles.searchButton}
                      onPress={() => setShowCondosList(!showCondosList)}
                    >
                      <MaterialCommunityIcons name="magnify" size={24} color={theme.colors.primary} />
                    </TouchableOpacity>
                  }
                />
                
                {showCondosList && filteredCondos.length > 0 && (
                  <Card style={styles.dropdownCard}>
                    <ScrollView style={styles.dropdownList} nestedScrollEnabled={true}>
                      {filteredCondos.map(condo => (
                        <TouchableOpacity
                          key={condo.id}
                          style={styles.dropdownItem}
                          onPress={() => handleSelectCondo(condo)}
                        >
                          <MaterialCommunityIcons 
                            name="office-building" 
                            size={20} 
                            color="#555" 
                            style={styles.dropdownIcon} 
                          />
                          <View>
                            <Text style={styles.dropdownItemText}>{condo.name}</Text>
                            <Text style={styles.dropdownItemSubtext}>{condo.address}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </Card>
                )}
                
                {showCondosList && searchCondoQuery.trim() !== '' && filteredCondos.length === 0 && (
                  <Card style={styles.dropdownCard}>
                    <View style={styles.noResultsContainer}>
                      <Text style={styles.noResultsText}>Nenhum condomínio encontrado</Text>
                    </View>
                  </Card>
                )}
              </View>
              
              {condoData && (
                <View style={styles.selectedCondoContainer}>
                  <Text style={styles.selectedCondoTitle}>Condomínio selecionado:</Text>
                  <View style={styles.selectedCondo}>
                    <MaterialCommunityIcons name="office-building" size={20} color="#555" />
                    <View style={styles.selectedCondoInfo}>
                      <Text style={styles.selectedCondoName}>{condoData.name}</Text>
                      <Text style={styles.selectedCondoAddress}>{condoData.address}</Text>
                    </View>
                  </View>
                </View>
              )}
              
              <Input
                label="Unidade"
                value={unit}
                onChangeText={setUnit}
                placeholder="Ex: 101"
                keyboardType="numeric"
              />
              
              <Input
                label="Bloco"
                value={block}
                onChangeText={setBlock}
                placeholder="Ex: A"
                autoCapitalize="characters"
              />
            </>
          ) : (
            // Modo de visualização
            <>
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="office-building" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Condomínio</Text>
                  <Text style={styles.infoValue}>{condoData?.name || 'Não informado'}</Text>
                </View>
              </View>
              
              {condoData?.address && (
                <>
                  <Divider style={styles.divider} />
                  
                  <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="map-marker" size={24} color="#555" style={styles.icon} />
                    <View style={styles.infoContent}>
                      <Text style={styles.infoLabel}>Endereço</Text>
                      <Text style={styles.infoValue}>{condoData.address}</Text>
                    </View>
                  </View>
                </>
              )}
              
              <Divider style={styles.divider} />
              
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="home" size={24} color="#555" style={styles.icon} />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Unidade</Text>
                  <Text style={styles.infoValue}>
                    {unit ? `${unit}${block ? ` • Bloco ${block}` : ''}` : 'Não informado'}
                  </Text>
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
              <Text style={styles.statLabel}>Pendentes</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Em andamento</Text>
            </View>
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>0</Text>
              <Text style={styles.statLabel}>Concluídas</Text>
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
              onPress={() => navigation.navigate('Settings')}
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
  condoSearchContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  searchButton: {
    padding: 8,
  },
  dropdownCard: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#757575',
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#757575',
  },
  selectedCondoContainer: {
    marginTop: 8,
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  selectedCondoTitle: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  selectedCondo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectedCondoInfo: {
    marginLeft: 10,
    flex: 1,
  },
  selectedCondoName: {
    fontSize: 14,
    fontWeight: '500',
  },
  selectedCondoAddress: {
    fontSize: 12,
    color: '#757575',
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

export default ResidentProfileScreen;
