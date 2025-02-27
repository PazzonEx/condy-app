import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { Text, useTheme, Checkbox, Divider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Hooks personalizados
import { useAuth } from '../../hooks/useAuth';

// Componentes personalizados
import Input from '../../components/Input';
import Button from '../../components/Button';
import Card from '../../components/Card';
import AutocompleteInput from '../../components/AutocompleteInput';

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
  const [searchDriver, setSearchDriver] = useState('');
  const [allDrivers, setAllDrivers] = useState([]);
  const [showSearchSection, setShowSearchSection] = useState(false);

  // Verificar se o usuário está autenticado
  useEffect(() => {
    if (!auth.currentUser) {
      Alert.alert(
        'Erro de Autenticação',
        'Você precisa estar logado para acessar esta tela.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  }, [navigation]);
  
  // Carregar motoristas salvos
  useEffect(() => {
    const loadSavedDrivers = async () => {
      const currentUser = auth.currentUser;
      
      if (!currentUser) return;
      
      try {
        setLoadingDrivers(true);
        
        // Buscar motoristas salvos pelo morador
        const conditions = [
          { field: 'residentId', operator: '==', value: currentUser.uid },
          { field: 'type', operator: '==', value: 'saved_driver' }
        ];
        
        const drivers = await FirestoreService.queryDocuments('saved_drivers', conditions);
        setSavedDrivers(drivers);
        
        // Buscar todos os motoristas do sistema (limitados a 100)
        const allDriversConditions = [
          { field: 'type', operator: '==', value: 'driver' }
        ];
        
        const allDriversQuery = await FirestoreService.queryDocuments(
          'users', 
          allDriversConditions, 
          { field: 'displayName', direction: 'asc' },
          100
        );
        
        // Obter detalhes adicionais dos motoristas
        const driversWithDetails = await Promise.all(
          allDriversQuery.map(async (driver) => {
            try {
              const details = await FirestoreService.getDocument('drivers', driver.id);
              return {
                ...driver,
                ...(details || {}),
                id: driver.id
              };
            } catch (err) {
              return driver;
            }
          })
        );
        
        setAllDrivers(driversWithDetails);
      } catch (error) {
        console.error('Erro ao carregar motoristas:', error);
        Alert.alert('Erro', 'Não foi possível carregar a lista de motoristas.');
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
    setVehiclePlate(driver.vehiclePlate || '');
    setVehicleModel(driver.vehicleModel || '');
    setSearchDriver('');
  };

  // Limpar seleção
  const handleClearSelection = () => {
    setSelectedDriver(null);
    setDriverName('');
    setVehiclePlate('');
    setVehicleModel('');
  };
  
  // Selecionar motorista da pesquisa
  const handleSelectSearchedDriver = (driver) => {
    setSelectedDriver(driver);
    setDriverName(driver.name || driver.displayName);
    setVehiclePlate(driver.vehiclePlate || '');
    setVehicleModel(driver.vehicleModel || '');
    setSearchDriver('');
    setShowSearchSection(false);
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
            residentId: currentUser.uid,
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
        residentId: currentUser.uid,
        driverId: selectedDriver?.type === 'driver' ? selectedDriver.id : null,
        condoId: userProfile?.condoId || 'temp_condo_id'
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

  // Filtrar motoristas para autocomplete
  const filterDrivers = (data, query) => {
    if (!query || query.length < 2) return [];
    
    const queryLower = query.toLowerCase();
    return data.filter(driver => {
      const name = (driver.name || driver.displayName || '').toLowerCase();
      const plate = (driver.vehiclePlate || '').toLowerCase();
      return name.includes(queryLower) || plate.includes(queryLower);
    });
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <Card style={styles.card}>
        <Text style={styles.title}>Nova Solicitação de Acesso</Text>
        
        {/* Abas de seleção de modo */}
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[
              styles.tab, 
              !showSearchSection && styles.activeTab
            ]}
            onPress={() => setShowSearchSection(false)}
          >
            <MaterialCommunityIcons 
              name="account-multiple" 
              size={20} 
              color={!showSearchSection ? theme.colors.primary : '#757575'} 
            />
            <Text 
              style={[
                styles.tabText, 
                !showSearchSection && { color: theme.colors.primary, fontWeight: 'bold' }
              ]}
            >
              Motoristas Salvos
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.tab, 
              showSearchSection && styles.activeTab
            ]}
            onPress={() => setShowSearchSection(true)}
          >
            <MaterialCommunityIcons 
              name="account-search" 
              size={20} 
              color={showSearchSection ? theme.colors.primary : '#757575'} 
            />
            <Text 
              style={[
                styles.tabText, 
                showSearchSection && { color: theme.colors.primary, fontWeight: 'bold' }
              ]}
            >
              Buscar Motorista
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Seleção de motorista salvo */}
        {!showSearchSection && (
          <View style={styles.savedDriversSection}>
            {savedDrivers.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.savedDriversList}
                contentContainerStyle={styles.savedDriversContent}
              >
                {savedDrivers.map((driver) => (
                  <TouchableOpacity
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
                    <Text style={styles.driverPlate}>{driver.vehiclePlate || 'Sem placa'}</Text>
                  </TouchableOpacity>
                ))}
                
                <TouchableOpacity
                  style={styles.newDriverCard}
                  onPress={handleClearSelection}
                >
                  <MaterialCommunityIcons
                    name="plus-circle"
                    size={30}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.newDriverText}>Novo Motorista</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <View style={styles.noDriversContainer}>
                <Text style={styles.noDriversText}>
                  Não há motoristas salvos.
                </Text>
                <Text style={styles.noDriversSubtext}>
                  Adicione um novo motorista abaixo.
                </Text>
              </View>
            )}
          </View>
        )}
        
        {/* Pesquisa de motorista */}
        {showSearchSection && (
          <View style={styles.searchSection}>
            <AutocompleteInput
              label="Buscar Motorista"
              value={searchDriver}
              onChangeText={setSearchDriver}
              data={allDrivers}
              textKey="displayName"
              subtextKey="vehiclePlate"
              iconName="account"
              onSelect={handleSelectSearchedDriver}
              placeholder="Digite o nome do motorista..."
              disabled={loading}
              minChars={2}
              filterFunction={filterDrivers}
            />
          </View>
        )}
        
        <Divider style={styles.divider} />
        
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
            <TouchableOpacity 
              style={styles.checkboxLabel} 
              onPress={() => setSaveDriver(!saveDriver)}
              disabled={loading}
            >
              <Text>Salvar este motorista para futuras solicitações</Text>
            </TouchableOpacity>
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
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#1E88E5',
  },
  tabText: {
    marginLeft: 8,
    color: '#757575',
  },
  divider: {
    marginVertical: 16,
  },
  savedDriversSection: {
    marginBottom: 20,
  },
  savedDriversList: {
    flexDirection: 'row',
    paddingBottom: 10,
  },
  savedDriversContent: {
    paddingRight: 10,
  },
  driverCard: {
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    width: 100,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    elevation: 2,
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
    color: '#757575',
  },
  newDriverCard: {
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    width: 100,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  newDriverText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 5,
    color: '#757575',
  },
  noDriversContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 20,
  },
  noDriversText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  noDriversSubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  searchSection: {
    marginBottom: 16,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxLabel: {
    flex: 1,
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