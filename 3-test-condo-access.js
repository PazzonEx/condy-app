// 3-test-condo-access.js

const { initializeApp } = require('firebase/app');
const { 
  getAuth, 
  signInWithEmailAndPassword,
  signOut
} = require('firebase/auth');
const { 
  getFirestore, 
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

// Função para testar o acesso do condomínio
async function testCondoAccess() {
  console.log('=== TESTANDO ACESSO DO CONDOMÍNIO ===\n');
  
  try {
    // Testar os três condomínios
    for (let i = 1; i <= 3; i++) {
      // Garantir que não há usuário autenticado
      await signOut(auth);
      
      const email = `condo${i}@condy.com`;
      console.log(`\n--- Testando Condomínio ${i} (${email}) ---\n`);
      
      // Login como condomínio
      const userCredential = await signInWithEmailAndPassword(auth, email, 'teste123');
      const condoId = userCredential.user.uid;
      
      console.log(`Login realizado com sucesso: ${condoId}`);
      
      // Buscar solicitações para o condomínio
      const q = query(
        collection(firestore, 'access_requests'),
        where('condoId', '==', condoId)
      );
      
      const snapshot = await getDocs(q);
      console.log(`Solicitações encontradas: ${snapshot.docs.length}`);
      
      // Agrupar por status
      const requestsByStatus = {};
      
      snapshot.docs.forEach(doc => {
        const status = doc.data().status;
        requestsByStatus[status] = (requestsByStatus[status] || 0) + 1;
      });
      
      console.log('\nDistribuição por status:');
      Object.entries(requestsByStatus).forEach(([status, count]) => {
        console.log(`- ${status}: ${count}`);
      });
      
      // Verificar solicitações pendentes
      const pendingRequests = snapshot.docs.filter(doc => doc.data().status === 'pending');
      
      if (pendingRequests.length > 0) {
        console.log('\nDetalhes das solicitações pendentes:');
        pendingRequests.forEach((doc, index) => {
          const data = doc.data();
          console.log(`\nSolicitação ${index + 1}:`);
          console.log(`- ID: ${doc.id}`);
          console.log(`- Morador: ${data.residentId || 'N/A'}`);
          console.log(`- Motorista: ${data.driverName || 'N/A'}`);
          console.log(`- Veículo: ${data.vehicleModel || 'N/A'} (${data.vehiclePlate || 'N/A'})`);
          console.log(`- Unidade: ${data.unit || 'N/A'}${data.block ? `, Bloco ${data.block}` : ''}`);
        });
      }
    }
    
    console.log('\n=== TESTE DE ACESSO CONCLUÍDO ===');
  } catch (error) {
    console.error('Erro ao testar acesso do condomínio:', error);
  }
}

// Executar teste
testCondoAccess().catch(console.error);