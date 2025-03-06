import {
    collection,
    doc,
    setDoc,
    addDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp
  } from 'firebase/firestore';
  import { firestore } from '../config/firebase';
  
  // Serviço de Firestore para operações de banco de dados
  const FirestoreService = {
    // Criar documento com ID gerado automaticamente
  // In FirestoreService.js - createDocument method
async createDocument(collectionName, data) {
  try {
    // Remove undefined/null fields and validate data
    const cleanData = {};
    const requiredFields = {
      'access_requests': ['condoId', 'driverName']
    };
    
    // Process fields
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        cleanData[key] = data[key];
      }
    }
    
    // Check for required fields
    if (collectionName in requiredFields) {
      const missing = requiredFields[collectionName].filter(field => 
        !cleanData[field] || (typeof cleanData[field] === 'string' && !cleanData[field].trim())
      );
      
      if (missing.length > 0) {
        console.warn(`Missing required fields for ${collectionName}: ${missing.join(', ')}`);
        
        // Add default values for critical fields
        if (missing.includes('condoId')) {
          cleanData.condoId = 'temp_condo_id';
          console.warn('Using temporary condoId. This should be fixed in production.');
        }
      }
    }
    
    // Add timestamps
    cleanData.createdAt = serverTimestamp();
    cleanData.updatedAt = serverTimestamp();
    
    // Create document
    const docRef = await addDoc(collection(firestore, collectionName), cleanData);
    return { id: docRef.id, ...cleanData };
  } catch (error) {
    console.error(`Error creating document in ${collectionName}:`, error);
    throw error;
  }
},




    // Criar documento com ID específico
    async createDocumentWithId(collectionName, docId, data) {
      try {
        if (!docId) {
          throw new Error('ID do documento não fornecido');
        }
        
        // Sanitizar dados antes de enviar para o Firestore
        const sanitizedData = {};
        
        // Remover campos undefined ou null e validar valores
        Object.keys(data).forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            sanitizedData[key] = data[key];
          }
        });
        
        // Adiciona timestamp de criação e atualização
        const docData = {
          ...sanitizedData,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = doc(firestore, collectionName, docId);
        await setDoc(docRef, docData);
        return { id: docId, ...docData };
      } catch (error) {
        console.error(`Erro ao criar documento com ID em ${collectionName}:`, error);
        throw error;
      }
    },
  
    // Obter documento por ID
    async getDocument(collectionName, docId) {
      try {
        if (!docId) { 
          console.warn(`ID de documento não fornecido para obter documento em ${collectionName}`);
          return null;
        }
        
        const docRef = doc(firestore, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() };
        } else {
          console.log(`Documento não encontrado em ${collectionName} com ID ${docId}`);
          return null;
        }
      } catch (error) {
        console.error(`Erro ao obter documento em ${collectionName}:`, error);
        throw error;
      }
    },
  
    // Obter todos os documentos de uma coleção
    async getCollection(collectionName) {
      try {
        const querySnapshot = await getDocs(collection(firestore, collectionName));
        const documents = [];
        
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        
        return documents;
      } catch (error) {
        console.error(`Erro ao obter coleção ${collectionName}:`, error);
        throw error;
      }
    },
  
    // Atualizar documento
    async updateDocument(collectionName, docId, data) {
      try {
        // Adiciona timestamp de atualização
        const updateData = {
          ...data,
          updatedAt: serverTimestamp()
        };
        
        const docRef = doc(firestore, collectionName, docId);
        await updateDoc(docRef, updateData);
        return { id: docId, ...updateData };
      } catch (error) {
        console.error(`Erro ao atualizar documento em ${collectionName}:`, error);
        throw error;
      }
    },
  
    // Excluir documento
    async deleteDocument(collectionName, docId) {
      try {
        const docRef = doc(firestore, collectionName, docId);
        await deleteDoc(docRef);
        return true;
      } catch (error) {
        console.error(`Erro ao excluir documento em ${collectionName}:`, error);
        throw error;
      }
    },
  
    // Consultar documentos com filtros
    async queryDocuments(collectionName, conditions = [], sortBy = null, limitCount = null) {
      try {
        let q = collection(firestore, collectionName);
        
        // Adicionar condições à consulta
        if (conditions.length > 0) {
          // Filtrar condições válidas
          const validConditions = conditions.filter(condition => 
            condition.field !== undefined && 
            condition.operator !== undefined && 
            condition.value !== undefined &&
            condition.value !== null
          );
          
          if (validConditions.length > 0) {
            const queryConstraints = validConditions.map(condition => {
              return where(condition.field, condition.operator, condition.value);
            });
            q = query(q, ...queryConstraints);
          }
        }
        
        // Adicionar ordenação
        if (sortBy) {
          q = query(q, orderBy(sortBy.field, sortBy.direction || 'asc'));
        }
        
        // Adicionar limite
        if (limitCount) {
          q = query(q, limit(limitCount));
        }
        
        const querySnapshot = await getDocs(q);
        const documents = [];
        
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        
        return documents;
      } catch (error) {
        console.error(`Erro ao consultar documentos em ${collectionName}:`, error);
        throw error;
      }
    }
  };
  
  
  export default FirestoreService;