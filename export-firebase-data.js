const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Usar diretamente o arquivo de credenciais
const serviceAccount = require('./firecondoadmin.json'); // Substitua pelo nome correto do seu arquivo

// Inicializar com nome explícito para evitar conflitos
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: `${serviceAccount.project_id}.appspot.com`
}, 'export-app');

const db = admin.firestore(admin.app('export-app'));
const auth = admin.auth(admin.app('export-app'));
const bucket = admin.storage(admin.app('export-app')).bucket();

const exportDir = path.join(__dirname, 'firebase-export');

// Criar diretório de exportação
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// Exportar usuários do Authentication
async function exportAuth() {
  console.log('Exportando usuários do Authentication...');
  
  try {
    const listUsersResult = await auth.listUsers();
    fs.writeFileSync(
      path.join(exportDir, 'auth-users.json'),
      JSON.stringify(listUsersResult.users, null, 2)
    );
    console.log(`Exportados ${listUsersResult.users.length} usuários.`);
  } catch (error) {
    console.error('Erro ao exportar usuários:', error);
  }
}

// Exportar coleções do Firestore
async function exportFirestore() {
  console.log('Exportando coleções do Firestore...');
  
  try {
    const collections = await db.listCollections();
    
    for (const collection of collections) {
      const collectionName = collection.id;
      console.log(`Exportando coleção: ${collectionName}`);
      
      const snapshot = await db.collection(collectionName).get();
      const documents = [];
      
      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      fs.writeFileSync(
        path.join(exportDir, `firestore-${collectionName}.json`),
        JSON.stringify(documents, null, 2)
      );
      
      console.log(`Exportados ${documents.length} documentos da coleção ${collectionName}.`);
    }
  } catch (error) {
    console.error('Erro ao exportar Firestore:', error);
  }
}

// Função principal
async function exportFirebaseData() {
  console.log('Iniciando exportação dos dados do Firebase...');
  
  try {
    await exportAuth();
    await exportFirestore();
    
    console.log('Exportação concluída com sucesso!');
    console.log(`Todos os dados foram salvos em: ${exportDir}`);
  } catch (error) {
    console.error('Erro durante a exportação:', error);
  } finally {
    // Encerrar a aplicação
    process.exit(0);
  }
}

// Executar a exportação
exportFirebaseData();