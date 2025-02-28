import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  Alert, 
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { 
  Text, 
  useTheme, 
  Card, 
  Chip, 
  Searchbar, 
  ActivityIndicator,
  Button as PaperButton
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import FirestoreService from '../../services/firestore.service';

// Hooks
import { useAuth } from '../../hooks/useAuth';

// Serviços
import CondoSearchService from '../../services/condo-search.service';
import AccessService from '../../services/access.service';

// Componentes personalizados
import Input from '../../components/Input';
import Button from '../../components/Button';

const { width } = Dimensions.get('window');

const DriverCondoSearchScreen = ({ navigation }) => {
  const theme = useTheme();
  const { userProfile } = useAuth();
  
  // Estados para busca de condomínios
  const [searchQuery, setSearchQuery] = useState('');
  const [condos, setCondos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCondo, setSelectedCondo] = useState(null);
  const [error, setError] = useState(null);

  // Estados para solicitação de acesso
  const [requestDetails, setRequestDetails] = useState({
    unit: '',
    block: '',
    comment: ''
  });
  const [requestLoading, setRequestLoading] = useState(false);
  // Carregar alguns condomínios ao montar o componente

  useEffect(() => {
    const loadCondos = async () => {
      try {
        setLoading(true);
        // Buscar todos os condomínios disponíveis
        const availableCondos = await CondoSearchService.searchCondos({
          onlyActive: true,
          maxResults: 50
        });
        
        console.log(`Carregados ${availableCondos.length} condomínios disponíveis`);
        setCondos(availableCondos);
        
        // Log para depuração
        if (availableCondos.length > 0) {
          console.log('Exemplo de condomínio:', JSON.stringify(availableCondos[0]));
        }
      } catch (error) {
        console.error('Erro ao carregar condomínios:', error);
        Alert.alert('Erro', 'Não foi possível carregar a lista de condomínios.');
      } finally {
        setLoading(false);
      }
    };
    
    loadCondos();
  }, []);

  // Carregar condomínios iniciais
  const loadInitialCondos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Buscar os primeiros 10 condomínios
      const condosList = await FirestoreService.getCollection('condos');
      
      // Limitar para os primeiros 10
      const limitedCondos = condosList.slice(0, 10);
      
      setCondos(limitedCondos);
      
      if (limitedCondos.length === 0) {
        setError('Nenhum condomínio encontrado. Tente buscar pelo nome.');
      }
    } catch (error) {
      console.error('Erro ao carregar condomínios:', error);
      setError('Não foi possível carregar a lista de condomínios');
    } finally {
      setLoading(false);
    }
  };

// Atualizar a função searchCondos
const searchCondos = async () => {
  if (searchQuery.trim().length < 2) {
    Alert.alert('Aviso', 'Digite pelo menos 2 caracteres para buscar');
    return;
  }

  try {
    setLoading(true);
    console.log(`Buscando condomínios com a query: "${searchQuery}"`);
    
    const results = await CondoSearchService.searchCondos({
      query: searchQuery,
      onlyActive: true,
      maxResults: 20
    });
    
    console.log(`Encontrados ${results.length} condomínios`);
    
    // Adicionar log para verificar a estrutura dos resultados
    if (results.length > 0) {
      console.log('Exemplo de resultado:', JSON.stringify(results[0]));
    }
    
    setCondos(results);
    
    if (results.length === 0) {
      Alert.alert('Resultado', 'Nenhum condomínio encontrado');
    }
  } catch (error) {
    console.error('Erro na busca:', error);
    Alert.alert('Erro', 'Não foi possível buscar condomínios');
  } finally {
    setLoading(false);
  }
};

    // Enviar solicitação de acesso
    const handleSubmitAccessRequest = async () => {
      // Validações
      if (!selectedCondo) {
        Alert.alert('Erro', 'Selecione um condomínio');
        return;
      }
  
      if (!requestDetails.unit.trim()) {
        Alert.alert('Erro', 'Informe a unidade');
        return;
      }
  
      try {
        setRequestLoading(true);
  
        // Preparar dados da solicitação com informações claras do condomínio
        const requestData = {
          driverId: userProfile.uid,
          driverName: userProfile.displayName,
          vehiclePlate: userProfile.vehiclePlate || '',
          vehicleModel: userProfile.vehicleModel || '',
          condoId: selectedCondo.id,
          condoName: selectedCondo.name, // Incluir nome do condomínio
          condoAddress: selectedCondo.address, // Incluir endereço do condomínio
          unit: requestDetails.unit,
          block: requestDetails.block,
          comment: requestDetails.comment,
          status: 'pending',
          type: 'driver'
        };
  
        await AccessService.createAccessRequest(requestData);
  
        Alert.alert(
          'Sucesso', 
          `Solicitação de acesso enviada para o condomínio ${selectedCondo.name}!`,
          [{ 
            text: 'OK', 
            onPress: () => {
              setSelectedCondo(null);
              setRequestDetails({
                unit: '',
                block: '',
                comment: ''
              });
              navigation.navigate('Home'); // Retornar à tela principal
            } 
          }]
        );
      } catch (error) {
        console.error('Erro ao criar solicitação:', error);
        Alert.alert('Erro', 'Não foi possível enviar a solicitação');
      } finally {
        setRequestLoading(false);
      }
    };

  // Renderizar cartão de condomínio
  const renderCondoCard = (condo) => (
    <TouchableOpacity 
      key={condo.id}
      onPress={() => setSelectedCondo(condo)}
      style={[
        styles.condoCard,
        selectedCondo?.id === condo.id && styles.selectedCondoCard
      ]}
    >
      <View style={styles.condoImagePlaceholder}>
        <MaterialCommunityIcons 
          name="office-building" 
          size={40} 
          color={theme.colors.primary} 
        />
      </View>
      
      <View style={styles.condoDetails}>
        <View style={styles.condoHeader}>
          <Text style={styles.condoName} numberOfLines={1}>
            {condo.name}
          </Text>
          {condo.verified && (
            <MaterialCommunityIcons 
              name="check-circle" 
              size={16} 
              color={theme.colors.primary} 
            />
          )}
        </View>
        
        <Text style={styles.condoAddress} numberOfLines={2}>
          {condo.address}
        </Text>
        
        <View style={styles.condoInfo}>
          <Chip icon="home" style={styles.infoChip}>
            {condo.units} Unidades
          </Chip>
          <Chip icon="map-marker" style={styles.infoChip}>
            {condo.blocks} Blocos
          </Chip>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <ScrollView 
      style={styles.container}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Solicitar Acesso</Text>
        <Text style={styles.headerSubtitle}>
          Busque o condomínio para solicitar entrada
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Buscar condomínio por nome ou endereço"
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={searchCondos}
          style={styles.searchBar}
        />
        <PaperButton 
          mode="contained" 
          onPress={searchCondos}
          style={styles.searchButton}
        >
          <MaterialCommunityIcons name="magnify" size={24} />
        </PaperButton>
      </View>

      {loading ? (
        <ActivityIndicator 
          animating={true} 
          color={theme.colors.primary} 
          style={styles.loader} 
        />
      ) : (
        <ScrollView 
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.condoList}
        >
          {condos.map(renderCondoCard)}
        </ScrollView>
      )}

      {selectedCondo && (
        <Card style={styles.formCard}>
          <Card.Title 
            title={`Solicitar Acesso - ${selectedCondo.name}`}
            subtitle="Preencha os detalhes da sua entrada"
          />
          <Card.Content>
            <Input
              label="Unidade"
              value={requestDetails.unit}
              onChangeText={(text) => setRequestDetails(prev => ({...prev, unit: text}))}
              placeholder="Número da unidade"
              keyboardType="numeric"
            />
            
            <Input
              label="Bloco (opcional)"
              value={requestDetails.block}
              onChangeText={(text) => setRequestDetails(prev => ({...prev, block: text}))}
              placeholder="Bloco do condomínio"
              autoCapitalize="characters"
            />
            
            <Input
              label="Observações (opcional)"
              value={requestDetails.comment}
              onChangeText={(text) => setRequestDetails(prev => ({...prev, comment: text}))}
              multiline
              numberOfLines={3}
              placeholder="Informações adicionais para o condomínio"
            />
            
            <Button
              mode="contained"
              onPress={handleSubmitAccessRequest}
              loading={requestLoading}
              disabled={requestLoading}
              style={styles.submitButton}
            >
              Solicitar Acesso
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
  },
  searchBar: {
    flex: 1,
    marginRight: 10,
  },
  searchButton: {
    height: 50,
    justifyContent: 'center',
  },
  loader: {
    marginTop: 20,
  },
  condoList: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  condoCard: {
    width: width * 0.8,
    backgroundColor: 'white',
    borderRadius: 10,
    marginRight: 16,
    elevation: 3,
    flexDirection: 'row',
    padding: 10,
  },
  selectedCondoCard: {
    borderWidth: 2,
    borderColor: '#1E88E5',
  },
  condoImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginRight: 10,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  condoDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  condoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  condoName: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  condoAddress: {
    fontSize: 14,
    color: '#757575',
    marginVertical: 8,
  },
  condoInfo: {
    flexDirection: 'row',
  },
  infoChip: {
    marginRight: 8,
  },
  formCard: {
    margin: 16,
  },
  submitButton: {
    marginTop: 16,
  }
});

export default DriverCondoSearchScreen;