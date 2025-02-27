import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, useTheme, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';

// Serviços
import AccessService from '../../services/access.service';
import FirestoreService from '../../services/firestore.service';
import { auth } from '../../config/firebase';
// Utilitários
import { isValidVehiclePlate } from '../../utils/validation';
import { formatVehiclePlate } from '../../utils/format';

const NewAccessRequestScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  const { currentUser } = auth; // Obtenha o usuário atual diretamente
  
  // Estados para formulário
  const [driverName, setDriverName] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [comment, setComment] = useState('');
  const [saveDriver, setSaveDriver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [savedDrivers, setSavedDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Verificar se o usuário está autenticado
  useEffect(() => {
    if (!currentUser) {
      Alert.alert(
        'Erro de Autenticação',
        'Você precisa estar logado para acessar esta tela.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [currentUser, navigation]);
  

  // Carregar motoristas salvos
  useEffect(() => {
    const loadSavedDrivers = async () => {
  const currentUser = auth.currentUser;
  
  if (!currentUser) return;
  
  try {
    setLoadingDrivers(true);
    
    // Buscar motoristas salvos pelo morador
    const conditions = [
      { field: 'residentId', operator: '==', value: currentUser.uid }, // Use auth.currentUser.uid diretamente
      { field: 'type', operator: '==', value: 'saved_driver' }
    ];
    
    const drivers = await FirestoreService.queryDocuments('saved_drivers', conditions);
    setSavedDrivers(drivers);
  } catch (error) {
    console.error('Erro ao carregar motoristas salvos:', error);
  } finally {
    setLoadingDrivers(false);
  }
};
    
    loadSavedDrivers();
  }, [userProfile]);

  // Selecionar motorista salvo
  const handleSelectDriver = (driver) => {
    setSelectedDriver(driver);
    setDriverName(driver.name);
    setVehiclePlate(driver.vehiclePlate);
    setVehicleModel(driver.vehicleModel || '');
  };

  // Limpar seleção
  const handleClearSelection = () => {
    setSelectedDriver(null);
    setDriverName('');
    setVehiclePlate('');
    setVehicleModel('');
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
      formattedText = formatVehiclePlate(limitedText);
    }
    
    setVehiclePlate(formattedText);
  };

  // Validar o formulário
  const validateForm = () => {
    const errors = {};

    if (!driverName.trim()) {
      errors.driverName = 'Nome do motorista é obrigatório';
    }

    if (!vehiclePlate.trim()) {
      errors.vehiclePlate = 'Placa do veículo é obrigatória';
    } else if (!isValidVehiclePlate(vehiclePlate)) {
      errors.vehiclePlate = 'Placa do veículo inválida';
    }

    if (!vehicleModel.trim()) {
      errors.vehicleModel = 'Modelo do veículo é obrigatório';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Manipulador para envio do formulário
  
const handleSubmit = async () => {
  if (!validateForm()) {
    return;
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    Alert.alert('Erro', 'Usuário não autenticado');
    return;
  }

  setLoading(true);

  try {
    // Salvar motorista, se marcado
    if (saveDriver && !selectedDriver) {
      try {
        await FirestoreService.createDocument('saved_drivers', {
          name: driverName,
          vehiclePlate: vehiclePlate.toUpperCase(),
          vehicleModel,
          residentId: currentUser.uid, // Use auth.currentUser.uid diretamente
          type: 'saved_driver'
        });
      } catch (error) {
        console.error('Erro ao salvar motorista:', error);
        // Continuar mesmo se falhar ao salvar o motorista
      }
    }
    
    // Preparar dados da solicitação
    const requestData = {
      driverName,
      vehiclePlate: vehiclePlate.toUpperCase(),
      vehicleModel,
      comment,
      type: 'driver',
      unit: userProfile?.unit || '',
      block: userProfile?.block || '',
      residentId: currentUser.uid, // Use auth.currentUser.uid diretamente
      condoId: userProfile?.condoId || 'temp_condo_id' // Use um valor padrão temporário
    };
    
    // Criar solicitação de acesso
    await AccessService.createAccessRequest(requestData);
    
    // Exibir mensagem de sucesso
    Alert.alert(
      'Sucesso',
      'Solicitação de acesso criada com sucesso',
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  } catch (error) {
    console.error('Erro ao criar solicitação:', error);
    Alert.alert('Erro', 'Não foi possível criar a solicitação de acesso');
  } finally {
    setLoading(false);
  }
};

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Text style={styles.title}>Nova Solicitação de Acesso</Text>
        
        {/* Seleção de motorista salvo */}
        {savedDrivers.length > 0 && (
          <View style={styles.savedDriversSection}>
            <Text style={styles.sectionTitle}>Motoristas Salvos</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.savedDriversList}
            >
              {savedDrivers.map((driver) => (
                <Card
                  key={driver.id}
                  style={[
                    styles.driverCard,
                    selectedDriver?.id === driver.id && {
                      borderColor: theme.colors.primary,
                      borderWidth: 2
                    }
                  ]}
                  onPress={() => handleSelectDriver(driver)}
                >
                  <MaterialCommunityIcons
                    name="account-circle"
                    size={30}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.driverName}>{driver.name}</Text>
                  <Text style={styles.driverPlate}>{driver.vehiclePlate}</Text>
                </Card>
              ))}
              
              <Card
                style={styles.newDriverCard}
                onPress={handleClearSelection}
              >
                <MaterialCommunityIcons
                  name="plus-circle"
                  size={30}
                  color={theme.colors.primary}
                />
                <Text style={styles.newDriverText}>Novo Motorista</Text>
              </Card>
            </ScrollView>
          </View>
        )}
        
        {/* Formulário principal */}
        <Input
          label="Nome do Motorista"
          value={driverName}
          onChangeText={setDriverName}
          error={formErrors.driverName}
          placeholder="Ex: João Silva"
          autoCapitalize="words"
          disabled={loading}
        />
        
        <Input
          label="Placa do Veículo"
          value={vehiclePlate}
          onChangeText={handleVehiclePlateChange}
          error={formErrors.vehiclePlate}
          placeholder="Ex: ABC1234"
          autoCapitalize="characters"
          disabled={loading}
        />
        
        <Input
          label="Modelo do Veículo"
          value={vehicleModel}
          onChangeText={setVehicleModel}
          error={formErrors.vehicleModel}
          placeholder="Ex: Sedan Preto"
          autoCapitalize="words"
          disabled={loading}
        />
        
        <Input
          label="Observações (opcional)"
          value={comment}
          onChangeText={setComment}
          placeholder="Informações adicionais..."
          multiline
          numberOfLines={3}
          disabled={loading}
        />
        
        {/* Opção para salvar motorista */}
        {!selectedDriver && (
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={saveDriver ? 'checked' : 'unchecked'}
              onPress={() => setSaveDriver(!saveDriver)}
              color={theme.colors.primary}
              disabled={loading}
            />
            <Text 
              style={styles.checkboxLabel} 
              onPress={() => setSaveDriver(!saveDriver)}
            >
              Salvar este motorista para futuras solicitações
            </Text>
          </View>
        )}
        
        {/* Botões de ação */}
        <Button
          mode="contained"
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
          style={styles.button}
        >
          Solicitar Acesso
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => navigation.goBack()}
          disabled={loading}
          style={styles.cancelButton}
        >
          Cancelar
        </Button>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  card: {
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  savedDriversSection: {
    marginBottom: 20,
  },
  savedDriversList: {
    flexDirection: 'row',
    paddingBottom: 10,
  },
  driverCard: {
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    width: 100,
  },
  driverName: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    fontWeight: 'bold',
  },
  driverPlate: {
    fontSize: 12,
    textAlign: 'center',
  },
  newDriverCard: {
    padding: 10,
    marginRight: 10,
    alignItems: 'center',
    width: 100,
    justifyContent: 'center',
  },
  newDriverText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxLabel: {
    marginLeft: 8,
  },
  button: {
    marginTop: 20,
  },
  cancelButton: {
    marginTop: 10,
  },
});

export default NewAccessRequestScreen;