/**
 * Script para inicializar o Firebase com dados básicos
 * 
 * Este script deve ser executado em um ambiente Node.js com as
 * credenciais Firebase configuradas corretamente no arquivo .env
 */

// Imports
const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
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

// Dados para inicialização
const adminUser = {
  email: 'admin@condy.com',
  password: 'admin123',
  displayName: 'Administrador',
  type: 'admin',
  status: 'active'
};

const condoUser = {
  email: 'condo@condy.com',
  password: 'condo123',
  displayName: 'Condomínio Exemplo',
  type: 'condo',
  status: 'active'
};

const residentUser = {
  email: 'resident@condy.com',
  password: 'resident123',
  displayName: 'Morador Exemplo',
  type: 'resident',
  status: 'active'
};

const driverUser = {
  email: 'driver@condy.com',
  password: 'driver123',
  displayName: 'Motorista Exemplo',
  type: 'driver',
  status: 'active'
};

// Cria um usuário no Firebase Auth e no Firestore
async function createUser(userData) {
  try {
    // Verificar se já existe usuário logado
    if (auth.currentUser) {
      await signOut(auth);
    }
    
    console.log(`Criando usuário ${userData.email}...`);
    
    // Criar usuário no Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      userData.email, 
      userData.password
    );
    
    const uid = userCredential.user.uid;
    console.log(`Usuário criado com UID: ${uid}`);
    
    // Criar documento no Firestore
    await setDoc(doc(firestore, 'users', uid), {
      email: userData.email,
      displayName: userData.displayName,
      type: userData.type,
      status: userData.status,
      createdAt: serverTimestamp()
    });
    
    console.log(`Documento do usuário criado no Firestore`);
    
    // Criar documento específico por tipo
    if (userData.type === 'resident') {
      await setDoc(doc(firestore, 'residents', uid), {
        name: userData.displayName,
        email: userData.email,
        unit: '101',
        block: 'A',
        phone: '(11) 99999-9999',
        status: 'active',
        createdAt: serverTimestamp()
      });
      console.log(`Documento de morador criado`);
    }
    
    if (userData.type === 'driver') {
      await setDoc(doc(firestore, 'drivers', uid), {
        name: userData.displayName,
        email: userData.email,
        phone: '(11) 88888-8888',
        vehicleModel: 'Sedan Preto',
        vehiclePlate: 'ABC1234',
        serviceType: 'app',
        status: 'active',
        createdAt: serverTimestamp()
      });
      console.log(`Documento de motorista criado`);
    }
    
    if (userData.type === 'condo') {
      await setDoc(doc(firestore, 'condos', uid), {
        name: userData.displayName,
        address: 'Av. Exemplo, 123 - São Paulo, SP',
        phone: '(11) 5555-5555',
        units: 100,
        blocks: 4,
        status: 'active',
        plan: 'basic',
        subscription: {
          status: 'active',
          startDate: serverTimestamp(),
          endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 dias
        },
        createdAt: serverTimestamp()
      });
      console.log(`Documento de condomínio criado`);
    }
    
    return uid;
  } catch (error) {
    console.error(`Erro ao criar usuário ${userData.email}:`, error.code, error.message);
    return null;
  }
}

// Criar solicitações de acesso de exemplo
async function createAccessRequests(residentId, driverIds, condoId) {
  try {
    console.log('Criando solicitações de acesso de exemplo...');
    
    // Solicitação pendente
    await addDoc(collection(firestore, 'access_requests'), {
      residentId: residentId,
      driverId: driverIds[0],
      condoId: condoId,
      status: 'pending',
      type: 'driver',
      driverName: 'Motorista Exemplo',
      vehiclePlate: 'ABC1234',
      vehicleModel: 'Sedan Preto',
      unit: '101',
      block: 'A',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log('Solicitação pendente criada');
    
    // Solicitação autorizada
    await addDoc(collection(firestore, 'access_requests'), {
      residentId: residentId,
      driverId: driverIds[0],
      condoId: condoId,
      status: 'authorized',
      type: 'driver',
      driverName: 'Motorista Exemplo',
      vehiclePlate: 'ABC1234',
      vehicleModel: 'Sedan Preto',
      unit: '101',
      block: 'A',
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hora atrás
      updatedAt: serverTimestamp()
    });
    console.log('Solicitação autorizada criada');
    
    // Solicitação concluída
    await addDoc(collection(firestore, 'access_requests'), {
      residentId: residentId,
      driverId: driverIds[0],
      condoId: condoId,
      status: 'completed',
      type: 'driver',
      driverName: 'Motorista Exemplo',
      vehiclePlate: 'ABC1234',
      vehicleModel: 'Sedan Preto',
      unit: '101',
      block: 'A',
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 dia atrás
      updatedAt: serverTimestamp()
    });
    console.log('Solicitação concluída criada');
    
    return true;
  } catch (error) {
    console.error('Erro ao criar solicitações de acesso:', error);
    return false;
  }
}

// Função principal de inicialização
async function setupFirebase() {
  try {
    console.log('=== INICIALIZANDO FIREBASE ===');
    
    // Criar usuários
    const adminId = await createUser(adminUser);
    const condoId = await createUser(condoUser);
    const residentId = await createUser(residentUser);
    const driverId = await createUser(driverUser);
    
    // Criar solicitações de acesso
    if (residentId && driverId && condoId) {
      await createAccessRequests(residentId, [driverId], condoId);
    }
    
    console.log('\n=== INICIALIZAÇÃO CONCLUÍDA ===');
    process.exit(0);
  } catch (error) {
    console.error('Erro na inicialização do Firebase:', error);
    process.exit(1);
  }
}

// Executar inicialização
setupFirebase().catch(console.error);