// 1-clean-database.js

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  listUsers,
  deleteUser
} = require('firebase/auth');
const { 
  getFirestore, 
  collection,
  getDocs,
  doc,
  deleteDoc,
  writeBatch
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

// Coleções a serem limpas
const collectionsToClean = [
  'users',
  'condos',
  'residents',
  'drivers',
  'access_requests',
  'subscriptions',
  'saved_drivers',
  'user_settings'
];

// Função para limpar uma coleção
async function clearCollection(collectionName) {
  console.log(`Limpando coleção: ${collectionName}`);
  
  const collectionRef = collection(firestore, collectionName);
  const snapshot = await getDocs(collectionRef);
  
  if (snapshot.empty) {
    console.log(`Coleção ${collectionName} já está vazia.`);
    return 0;
  }
  
  // Usar batch para eficiência
  const batchSize = 500;
  let count = 0;
  
  for (let i = 0; i < snapshot.docs.length; i += batchSize) {
    const batch = writeBatch(firestore);
    const batch_docs = snapshot.docs.slice(i, i + batchSize);
    
    batch_docs.forEach(doc => {
      batch.delete(doc.ref);
      count++;
    });
    
    await batch.commit();
    console.log(`Lote de ${batch_docs.length} documentos excluídos.`);
  }
  
  console.log(`Total de ${count} documentos excluídos da coleção ${collectionName}.`);
  return count;
}

// Função para limpar usuários do Authentication
async function clearAuthUsers() {
  try {
    console.log('Limpando usuários do Authentication...');
    
    // Nota: Esta operação requer o Firebase Admin SDK e não funcionará com o SDK da web
    // Este código é apenas ilustrativo, você precisará usar um método alternativo
    
    console.log('ATENÇÃO: A limpeza de usuários do Authentication requer o Firebase Admin SDK.');
    console.log('Por favor, use o Console do Firebase para excluir usuários manualmente.');
    
    return 0;
  } catch (error) {
    console.error('Erro ao limpar usuários do Authentication:', error);
    return 0;
  }
}

// Função principal para limpar o banco de dados
async function cleanDatabase() {
  console.log('=== INICIANDO LIMPEZA DO BANCO DE DADOS ===\n');
  
  try {
    // Limpar coleções
    let totalDocuments = 0;
    
    for (const collectionName of collectionsToClean) {
      const count = await clearCollection(collectionName);
      totalDocuments += count;
    }
    
    // Limpar usuários (aviso sobre o Admin SDK)
    await clearAuthUsers();
    
    console.log(`\nTotal de ${totalDocuments} documentos excluídos.`);
    console.log('\n=== LIMPEZA DO BANCO DE DADOS CONCLUÍDA ===');
    console.log('\nAGORA VOCÊ PODE EXECUTAR O SCRIPT DE CRIAÇÃO DE DADOS DE TESTE (2-create-test-data.js)');
  } catch (error) {
    console.error('Erro ao limpar banco de dados:', error);
  }
}

// Executar limpeza
cleanDatabase().catch(console.error);