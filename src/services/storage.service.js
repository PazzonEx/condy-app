import { 
    ref, 
    uploadBytes, 
    getDownloadURL, 
    deleteObject,
    listAll
  } from 'firebase/storage';
  import { storage } from '../config/firebase';
  
  // Serviço de Storage para operações com arquivos
  const StorageService = {
    // Fazer upload de um arquivo
    async uploadFile(filePath, file, metadata = {}) {
      try {
        const storageRef = ref(storage, filePath);
        
        // Se for uma URI de imagem no React Native, precisamos primeiro fetch e blob
        let fileToUpload = file;
        if (typeof file === 'string' && file.startsWith('file://')) {
          const response = await fetch(file);
          fileToUpload = await response.blob();
        }
        
        const result = await uploadBytes(storageRef, fileToUpload, metadata);
        const downloadURL = await getDownloadURL(result.ref);
        
        return {
          path: filePath,
          url: downloadURL,
          metadata: result.metadata
        };
      } catch (error) {
        console.error('Erro ao fazer upload de arquivo:', error);
        throw error;
      }
    },
  
    // Obter URL de download de um arquivo
    async getFileUrl(filePath) {
      try {
        const storageRef = ref(storage, filePath);
        const url = await getDownloadURL(storageRef);
        return url;
      } catch (error) {
        console.error('Erro ao obter URL de arquivo:', error);
        throw error;
      }
    },
  
    // Excluir um arquivo
    async deleteFile(filePath) {
      try {
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
        return true;
      } catch (error) {
        console.error('Erro ao excluir arquivo:', error);
        throw error;
      }
    },
  
    // Listar arquivos em um diretório
    async listFiles(directoryPath) {
      try {
        const directoryRef = ref(storage, directoryPath);
        const listResult = await listAll(directoryRef);
        
        const files = await Promise.all(listResult.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            url
          };
        }));
        
        return files;
      } catch (error) {
        console.error('Erro ao listar arquivos:', error);
        throw error;
      }
    }
  };
  
  export default StorageService;
  