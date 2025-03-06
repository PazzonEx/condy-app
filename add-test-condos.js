// add-test-condos.js

// Carrega variáveis de ambiente do arquivo .env
require('dotenv').config();

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, setDoc, doc } = require('firebase/firestore');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');

// Configure o Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Condomínios de teste (dados reais)
const testCondos = [
  {
    email: "cond.vilanova@teste.com",
    password: "Teste@123",
    data: {
      name: "Ibiti Reserva",
      address: "Av. Padre Livio Emílio Caliari, 1800, Sorocaba - SP, 18086-776, Brazil",
      status: "active",
      city: "Sorocaba",
      state: "SP",
      verified: true,
      latitude: -23.4433327,
      longitude: -47.4490595,
      units: 150,
      blocks: 3,
      phone: "(15) 3333-4444",
      email: "cond.ibitireserva@teste.com",
      createdAt: new Date()
    }
  },
  {
    email: "cond.ecovillas@teste.com",
    password: "Teste@123",
    data: {
      name: "Residencial Ecovillas do Lago",
      address: "Av. Adolpho Massaglia, 837 - Vossoroca, Sorocaba - SP, 18052-780, Brazil",
      status: "active",
      city: "Sorocaba",
      state: "SP",
      verified: true,
      latitude: -23.5446671,
      longitude:-47.4826398,
      units: 80,
      blocks: 5,
      phone: "(15) 3333-5555",
      email: "cond.residencial@teste.com",
      createdAt: new Date()
    }
  },
  {
    email: "cond.vilagarden@teste.com",
    password: "Teste@123",
    data: {
      name: "Condomínio Residencial Villa dos Inglezes",
      address: "Parque Residencial Villa dos Inglezes - Av. Lauro Miguel Sacker, 75 - Chácaras Reunidas São Jorge, Sorocaba - SP, 18051-860, Brazil",
      status: "active",
      city: "Sorocaba",
      state: "SP",
      verified: true,
      latitude: -23.5233214,
      longitude:-47.5020904,
      units: 120,
      blocks: 4,
      phone: "(15) 3333-6666",
      email: "cond.inglezes@teste.com",
      createdAt: new Date()
    }
  }
];

// Função para adicionar condomínios
async function addTestCondominiums() {
  try {
    console.log("Iniciando cadastro de condomínios de teste...");

    for (const condo of testCondos) {
      console.log(`Criando usuário para: ${condo.data.name}`);
      
      // Cria o usuário no Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, condo.email, condo.password);
      const userId = userCredential.user.uid;
      
      console.log(`Usuário criado com ID: ${userId}`);
      
      // Adiciona os dados do condomínio ao Firestore
      await setDoc(doc(db, "condos", userId), {
        ...condo.data,
        id: userId
      });
      
      // Cria um registro de usuário também
      await setDoc(doc(db, "users", userId), {
        id: userId,
        email: condo.email,
        name: condo.data.name,
        type: "condo",
        status: "active",
        createdAt: new Date()
      });
      
      console.log(`Dados do condomínio adicionados com sucesso: ${condo.data.name}`);
    }
    
    console.log("Todos os condomínios foram adicionados com sucesso!");
  } catch (error) {
    console.error("Erro ao adicionar condomínios:", error);
  }
}

// Executar a função
addTestCondominiums()
  .then(() => {
    console.log("Script concluído!");
    process.exit(0);
  })
  .catch(error => {
    console.error("Erro ao executar script:", error);
    process.exit(1);
  });