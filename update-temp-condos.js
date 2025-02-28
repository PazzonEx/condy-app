// update-temp-condos.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, updateDoc, doc } = require('firebase/firestore');

// Carregar as variáveis de ambiente do arquivo .env
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
const firestore = getFirestore(app);

// Função para atualizar solicitações com condomínio temporário
async function updateTempCondos() {
  try {
    console.log('Iniciando atualização de solicitações com condomínio temporário...');
    
    // Buscar todas as solicitações com condoId temporário
    const q = query(
      collection(firestore, 'access_requests'),
      where('condoId', '==', 'temp_condo_id')
    );
    
    const snapshot = await getDocs(q);
    console.log(`Encontradas ${snapshot.docs.length} solicitações para atualizar.`);
    
    if (snapshot.empty) {
      console.log('Nenhuma solicitação para atualizar.');
      return;
    }
    
    // Buscar primeiro condomínio disponível para usar como substituto
    const condosSnapshot = await getDocs(collection(firestore, 'condos'));
    if (condosSnapshot.empty) {
      console.error('Nenhum condomínio encontrado no sistema.');
      return;
    }
    
    const firstCondo = condosSnapshot.docs[0];
    console.log(`Usando condomínio "${firstCondo.data().name || 'Sem nome'}" (ID: ${firstCondo.id}) como substituto.`);
    
    // Atualizar cada solicitação
    for (const docSnapshot of snapshot.docs) {
      console.log(`Atualizando solicitação ${docSnapshot.id}...`);
      
      await updateDoc(doc(firestore, 'access_requests', docSnapshot.id), {
        condoId: firstCondo.id
      });
    }
    
    console.log('Atualização concluída com sucesso!');
  } catch (error) {
    console.error('Erro ao atualizar solicitações:', error);
  }
}

// Executar a função
updateTempCondos().catch(console.error);