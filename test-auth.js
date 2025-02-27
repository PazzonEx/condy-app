/**
 * Script para testar o fluxo de autenticação
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
  getDoc,
  collection,
  getDocs,
  query,
  where
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

// Configurações de teste
const TEST_EMAIL = 'teste@condy.com';
const TEST_PASSWORD = 'teste123';
const TEST_DISPLAY_NAME = 'Usuário de Teste';

// Função principal de teste
async function testAuth() {
  try {
    console.log('=== INICIANDO TESTES DE AUTENTICAÇÃO ===');
    
    // Teste 1: Criar um novo usuário
    console.log('\n--- Teste 1: Criar um novo usuário ---');
    try {
      await signOut(auth);
      console.log('Logout realizado com sucesso');
      
      // Verificar se o usuário já existe antes de tentar criar
      const usersRef = collection(firestore, 'users');
      const q = query(usersRef, where('email', '==', TEST_EMAIL));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        console.log(`Usuário ${TEST_EMAIL} já existe, pulando criação`);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
        console.log('Usuário criado com sucesso:', userCredential.user.uid);
        
        // Criar documento do usuário no Firestore
        await setDoc(doc(firestore, 'users', userCredential.user.uid), {
          email: TEST_EMAIL,
          displayName: TEST_DISPLAY_NAME,
          type: 'resident',
          status: 'active',
          createdAt: new Date()
        });
        
        console.log('Documento do usuário criado no Firestore');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error.code, error.message);
    }
    
    // Teste 2: Login com usuário criado
    console.log('\n--- Teste 2: Login com usuário ---');
    try {
      // Garantir que não há usuário autenticado
      await signOut(auth);
      
      const userCredential = await signInWithEmailAndPassword(auth, TEST_EMAIL, TEST_PASSWORD);
      console.log('Login realizado com sucesso:', userCredential.user.uid);
      
      // Verificar se o documento do usuário existe no Firestore
      const userDoc = await getDoc(doc(firestore, 'users', userCredential.user.uid));
      
      if (userDoc.exists()) {
        console.log('Documento do usuário encontrado:', userDoc.data());
      } else {
        console.log('Documento do usuário não encontrado');
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error.code, error.message);
    }
    
    // Teste 3: Logout
    console.log('\n--- Teste 3: Logout ---');
    try {
      await signOut(auth);
      console.log('Logout realizado com sucesso');
      
      // Verificar se não há usuário autenticado
      const currentUser = auth.currentUser;
      console.log('Usuário atual após logout:', currentUser);
    } catch (error) {
      console.error('Erro ao fazer logout:', error.code, error.message);
    }
    
    // Teste 4: Login com credenciais inválidas
    console.log('\n--- Teste 4: Login com credenciais inválidas ---');
    try {
      await signInWithEmailAndPassword(auth, TEST_EMAIL, 'senha_errada');
      console.log('Login realizado com sucesso (não deveria acontecer)');
    } catch (error) {
      console.log('Erro esperado ao tentar login com senha incorreta:', error.code);
    }
    
    console.log('\n=== TESTES DE AUTENTICAÇÃO CONCLUÍDOS ===');
  } catch (error) {
    console.error('Erro nos testes de autenticação:', error);
  }
}

// Executar testes
testAuth().catch(console.error);