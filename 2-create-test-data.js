// 2-create-test-data.js

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signOut 
} = require('firebase/auth');
const { 
  getFirestore, 
  doc, 
  setDoc, 
  collection,
  addDoc,
  serverTimestamp
} = require('firebase/firestore');

// Carrega as variáveis de ambiente do arquivo .env
require('dotenv').config();

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicializar o Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

// Dados para os condomínios
const condominiums = [
  {
    email: 'condo1@condy.com',
    password: 'teste123',
    displayName: 'Condomínio Jardim Real',
    address: 'Av. Paulista, 1000 - São Paulo, SP',
    units: 120,
    blocks: 4,
    plan: 'basic'
  },
  {
    email: 'condo2@condy.com',
    password: 'teste123',
    displayName: 'Residencial Vila Nova',
    address: 'Rua Augusta, 500 - São Paulo, SP',
    units: 80,
    blocks: 2,
    plan: 'premium'
  },
  {
    email: 'condo3@condy.com',
    password: 'teste123',
    displayName: 'Edifício Central Park',
    address: 'Av. Brigadeiro Faria Lima, 2000 - São Paulo, SP',
    units: 200,
    blocks: 6,
    plan: 'free'
  }
];

// Dados para os moradores (5 por condomínio)
function generateResidents(condoIndex) {
  const residents = [];
  
  for (let i = 1; i <= 5; i++) {
    residents.push({
      email: `morador${i}_condo${condoIndex+1}@condy.com`,
      password: 'teste123',
      displayName: `Morador ${i} do Condomínio ${condoIndex+1}`,
      unit: `${100 + i}`,
      block: String.fromCharCode(65 + (i % 4)), // A, B, C, D
      phone: `(11) 9${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`
    });
  }
  
  return residents;
}

// Dados para os motoristas
const drivers = [
  {
    email: 'motorista1@condy.com',
    password: 'teste123',
    displayName: 'João Motorista',
    vehiclePlate: 'ABC1234',
    vehicleModel: 'Honda Civic Preto',
    vehicleColor: 'Preto',
    vehicleYear: '2020',
    serviceType: 'app',
    phone: '(11) 91234-5678'
  },
  {
    email: 'motorista2@condy.com',
    password: 'teste123',
    displayName: 'Maria Motorista',
    vehiclePlate: 'DEF5678',
    vehicleModel: 'Toyota Corolla Prata',
    vehicleColor: 'Prata',
    vehicleYear: '2021',
    serviceType: 'app',
    phone: '(11) 92345-6789'
  },
  {
    email: 'motorista3@condy.com',
    password: 'teste123',
    displayName: 'Pedro Entregador',
    vehiclePlate: 'GHI9012',
    vehicleModel: 'Honda CG 160',
    vehicleColor: 'Vermelho',
    vehicleYear: '2019',
    serviceType: 'delivery',
    phone: '(11) 93456-7890'
  },
  {
    email: 'motorista4@condy.com',
    password: 'teste123',
    displayName: 'Ana Taxista',
    vehiclePlate: 'JKL3456',
    vehicleModel: 'VW Voyage Branco',
    vehicleColor: 'Branco',
    vehicleYear: '2018',
    serviceType: 'taxi',
    phone: '(11) 94567-8901'
  },
  {
    email: 'motorista5@condy.com',
    password: 'teste123',
    displayName: 'Carlos Motorista',
    vehiclePlate: 'MNO7890',
    vehicleModel: 'Fiat Uno Prata',
    vehicleColor: 'Prata',
    vehicleYear: '2017',
    serviceType: 'app',
    phone: '(11) 95678-9012'
  },
  {
    email: 'motorista6@condy.com',
    password: 'teste123',
    displayName: 'Juliana Entregadora',
    vehiclePlate: 'PQR1234',
    vehicleModel: 'Yamaha Factor 125',
    vehicleColor: 'Azul',
    vehicleYear: '2020',
    serviceType: 'delivery',
    phone: '(11) 96789-0123'
  },
  {
    email: 'motorista7@condy.com',
    password: 'teste123',
    displayName: 'Roberto Motorista',
    vehiclePlate: 'STU5678',
    vehicleModel: 'Hyundai HB20 Cinza',
    vehicleColor: 'Cinza',
    vehicleYear: '2019',
    serviceType: 'app',
    phone: '(11) 97890-1234'
  },
  {
    email: 'motorista8@condy.com',
    password: 'teste123',
    displayName: 'Patricia Taxista',
    vehiclePlate: 'VWX9012',
    vehicleModel: 'Chevrolet Cobalt Preto',
    vehicleColor: 'Preto',
    vehicleYear: '2018',
    serviceType: 'taxi',
    phone: '(11) 98901-2345'
  },
  {
    email: 'motorista9@condy.com',
    password: 'teste123',
    displayName: 'Marcelo Motorista',
    vehiclePlate: 'YZA3456',
    vehicleModel: 'Ford Ka Branco',
    vehicleColor: 'Branco',
    vehicleYear: '2021',
    serviceType: 'app',
    phone: '(11) 99012-3456'
  },
  {
    email: 'motorista10@condy.com',
    password: 'teste123',
    displayName: 'Fernanda Entregadora',
    vehiclePlate: 'BCD7890',
    vehicleModel: 'Honda NXR 160',
    vehicleColor: 'Preto',
    vehicleYear: '2020',
    serviceType: 'delivery',
    phone: '(11) 90123-4567'
  }
];

// Função para criar um usuário
async function createUser(userData, type) {
  try {
    // Garantir que não há usuário autenticado
    await signOut(auth);
    
    console.log(`Criando ${type}: ${userData.displayName} (${userData.email})`);
    
    // Criar usuário no Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const uid = userCredential.user.uid;
    
    // Criar documento no users
    await setDoc(doc(firestore, 'users', uid), {
      email: userData.email,
      displayName: userData.displayName,
      type: type,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return uid;
  } catch (error) {
    console.error(`Erro ao criar ${type} ${userData.email}:`, error);
    return null;
  }
}

// Criar condomínio
async function createCondo(condoData) {
  const uid = await createUser(condoData, 'condo');
  
  if (uid) {
    await setDoc(doc(firestore, 'condos', uid), {
      name: condoData.displayName,
      address: condoData.address,
      units: condoData.units,
      blocks: condoData.blocks,
      email: condoData.email,
      phone: condoData.phone || '(11) 5555-5555',
      plan: condoData.plan || 'basic',
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Condomínio criado com ID: ${uid}`);
  }
  
  return uid;
}

// Criar morador
async function createResident(residentData, condoId) {
  const uid = await createUser(residentData, 'resident');
  
  if (uid) {
    await setDoc(doc(firestore, 'residents', uid), {
      name: residentData.displayName,
      email: residentData.email,
      unit: residentData.unit,
      block: residentData.block,
      phone: residentData.phone,
      condoId: condoId,
      status: 'active',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Morador criado com ID: ${uid}`);
  }
  
  return uid;
}

// Criar motorista
async function createDriver(driverData) {
  const uid = await createUser(driverData, 'driver');
  
  if (uid) {
    await setDoc(doc(firestore, 'drivers', uid), {
      name: driverData.displayName,
      email: driverData.email,
      vehiclePlate: driverData.vehiclePlate,
      vehicleModel: driverData.vehicleModel,
      vehicleColor: driverData.vehicleColor,
      vehicleYear: driverData.vehicleYear,
      serviceType: driverData.serviceType,
      phone: driverData.phone,
      status: 'active',
      verificationStatus: 'verified',
      isAvailable: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log(`Motorista criado com ID: ${uid}`);
  }
  
  return uid;
}

// Criar solicitações de acesso de exemplo
async function createAccessRequests(residentIds, driverIds, condoIds) {
  try {
    console.log('\nCriando solicitações de acesso...');
    
    // Status possíveis para as solicitações
    const statuses = ['pending', 'authorized', 'denied', 'arrived', 'entered', 'completed'];
    
    // Para cada condomínio, criar algumas solicitações
    for (let i = 0; i < condoIds.length; i++) {
      const condoId = condoIds[i];
      const residentIdsForCondo = residentIds.filter((_, index) => Math.floor(index / 5) === i);
      
      console.log(`\nCriando solicitações para o condomínio ${i+1} (${condoId})...`);
      
      // Criar 15 solicitações aleatórias para o condomínio
      for (let j = 0; j < 15; j++) {
        // Selecionar morador e motorista aleatório
        const residentId = residentIdsForCondo[Math.floor(Math.random() * residentIdsForCondo.length)];
        const driverId = driverIds[Math.floor(Math.random() * driverIds.length)];
        const driverIndex = Math.floor(Math.random() * driverIds.length);
        const driver = drivers[driverIndex];
        
        // Selecionar status aleatório (com maior probabilidade para pending e authorized)
        const statusIndex = Math.floor(Math.random() * (j < 5 ? 2 : statuses.length));
        const status = statuses[statusIndex];
        
        // Data de criação aleatória nos últimos 30 dias
        const createdAtDate = new Date();
        createdAtDate.setDate(createdAtDate.getDate() - Math.floor(Math.random() * 30));
        
        // Criar solicitação
        const requestData = {
          residentId: residentId,
          driverId: driverId,
          condoId: condoId,
          status: status,
          driverName: driver.displayName,
          vehiclePlate: driver.vehiclePlate,
          vehicleModel: driver.vehicleModel,
          unit: `${100 + (j % 5)}`,
          block: String.fromCharCode(65 + (j % 4)),
          type: driver.serviceType === 'delivery' ? 'delivery' : 'driver',
          comment: `Solicitação de teste ${j+1} do condomínio ${i+1}`,
          createdAt: createdAtDate,
          updatedAt: new Date()
        };
        
        const docRef = await addDoc(collection(firestore, 'access_requests'), requestData);
        console.log(`Solicitação criada com ID: ${docRef.id}, Status: ${status}`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao criar solicitações de acesso:', error);
    return false;
  }
}

// Função principal para criar dados de teste
async function createTestData() {
  console.log('=== CRIANDO DADOS DE TESTE PARA O CONDY ===\n');
  
  try {
    // 1. Criar condomínios
    console.log('\n--- Criando Condomínios ---\n');
    const condoIds = [];
    
    for (const condoData of condominiums) {
      const condoId = await createCondo(condoData);
      if (condoId) {
        condoIds.push(condoId);
      }
    }
    
    // 2. Criar moradores
    console.log('\n--- Criando Moradores ---\n');
    const residentIds = [];
    
    for (let i = 0; i < condominiums.length; i++) {
      const residents = generateResidents(i);
      
      for (const residentData of residents) {
        const residentId = await createResident(residentData, condoIds[i]);
        if (residentId) {
          residentIds.push(residentId);
        }
      }
    }
    
    // 3. Criar motoristas
    console.log('\n--- Criando Motoristas ---\n');
    const driverIds = [];
    
    for (const driverData of drivers) {
      const driverId = await createDriver(driverData);
      if (driverId) {
        driverIds.push(driverId);
      }
    }
    
    // 4. Criar solicitações de acesso
    await createAccessRequests(residentIds, driverIds, condoIds);
    
    console.log('\n=== CRIAÇÃO DE DADOS DE TESTE CONCLUÍDA ===');
    console.log('\nDados criados:');
    console.log(`- ${condoIds.length} condomínios`);
    console.log(`- ${residentIds.length} moradores`);
    console.log(`- ${driverIds.length} motoristas`);
    console.log('- 45 solicitações de acesso (15 por condomínio)');
    
    console.log('\nCredenciais de acesso para os testes:');
    console.log('\nCondomínios:');
    condominiums.forEach((condo, i) => {
      console.log(`- ${condo.displayName}: ${condo.email} / ${condo.password}`);
    });
    
    console.log('\nMoradores (exemplos):');
    console.log(`- Morador 1 do Condomínio 1: morador1_condo1@condy.com / teste123`);
    console.log(`- Morador 1 do Condomínio 2: morador1_condo2@condy.com / teste123`);
    console.log(`- Morador 1 do Condomínio 3: morador1_condo3@condy.com / teste123`);
    
    console.log('\nMotoristas (exemplos):');
    console.log(`- ${drivers[0].displayName}: ${drivers[0].email} / teste123`);
    console.log(`- ${drivers[1].displayName}: ${drivers[1].email} / teste123`);
    console.log(`- ${drivers[2].displayName}: ${drivers[2].email} / teste123`);
    
    console.log('\nAgora você pode fazer login no aplicativo e testar o fluxo completo!');
  } catch (error) {
    console.error('Erro ao criar dados de teste:', error);
  }
}

// Executar criação de dados
createTestData().catch(console.error);