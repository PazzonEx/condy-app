// src/services/storage.service.js
import { storage } from '../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

class StorageService {
  /**
   * Faz upload de um arquivo para o Firebase Storage
   * @param {string} path - Caminho no storage
   * @param {string} uri - URI local do arquivo
   * @param {Function} onProgress - Callback para progresso (opcional)
   * @returns {Promise<Object>} Resultado do upload com URL e metadados
   */
  async uploadFile(path, uri, onProgress = null) {
    try {
      console.log(`Iniciando upload para ${path}`);
      
      // Obter o blob do arquivo
      const blob = await this.getBlob(uri);
      console.log(`Blob criado: ${blob.size} bytes`);
      
      // Criar referência para o arquivo
      const storageRef = ref(storage, path);
      
      // Iniciar upload
      const uploadTask = uploadBytesResumable(storageRef, blob);
      
      // Retornar uma promessa que resolve quando o upload estiver completo
      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            // Calcular progresso
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log(`Upload: ${progress.toFixed(2)}%`);
            
            // Chamar callback de progresso se fornecido
            if (onProgress) {
              onProgress(progress);
            }
          },
          (error) => {
            // Lidar com erros
            console.error('Erro no upload:', error);
            blob.close();
            reject(error);
          },
          async () => {
            // Upload completo
            blob.close();
            
            try {
              // Obter URL de download
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              
              // Retornar resultado
              resolve({
                url: downloadURL,
                metadata: uploadTask.snapshot.metadata,
                path: path
              });
            } catch (urlError) {
              console.error('Erro ao obter URL de download:', urlError);
              reject(urlError);
            }
          }
        );
      });
    } catch (error) {
      console.error('Erro no serviço de upload:', error);
      throw error;
    }
  }
  
  /**
   * Converte URI do arquivo em Blob
   * @param {string} uri - URI local do arquivo
   * @returns {Promise<Blob>} Blob do arquivo
   */
  async getBlob(uri) {
    // Para URIs locais no formato file://
    if (uri.startsWith('file://')) {
      return await this.fetchLocalFile(uri);
    }
    
    // Para URIs de conteúdo do tipo content://
    if (uri.startsWith('content://')) {
      return await this.fetchContentUri(uri);
    }
    
    // Para outros tipos de URIs (ex: data:image/jpeg;base64,...)
    return await this.fetchRemoteFile(uri);
  }
  
  /**
   * Busca arquivo local
   * @param {string} uri - URI local do arquivo
   * @returns {Promise<Blob>} Blob do arquivo
   */
  async fetchLocalFile(uri) {
    try {
      // Em algumas plataformas, pode ser necessário remover "file://"
      const fileUri = uri.replace('file://', '');
      
      // Usando XMLHttpRequest para obter o arquivo
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = function() {
          resolve(xhr.response);
        };
        xhr.onerror = function(e) {
          console.error('Erro XHR:', e);
          reject(new Error('Falha ao carregar arquivo local'));
        };
        xhr.responseType = 'blob';
        xhr.open('GET', uri, true);
        xhr.send(null);
      });
    } catch (error) {
      console.error('Erro ao buscar arquivo local:', error);
      throw error;
    }
  }
  
  /**
   * Busca conteúdo de URI
   * @param {string} uri - URI de conteúdo
   * @returns {Promise<Blob>} Blob do conteúdo
   */
  async fetchContentUri(uri) {
    // Usar a mesma abordagem de fetchLocalFile para content URIs
    return this.fetchLocalFile(uri);
  }
  
  /**
   * Busca arquivo remoto
   * @param {string} uri - URI remota do arquivo
   * @returns {Promise<Blob>} Blob do arquivo
   */
  async fetchRemoteFile(uri) {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      return blob;
    } catch (error) {
      console.error('Erro ao buscar arquivo remoto:', error);
      throw error;
    }
  }
  
  /**
   * Exclui um arquivo do Firebase Storage
   * @param {string} path - Caminho do arquivo no storage
   * @returns {Promise<boolean>} Indicação de sucesso
   */
  async deleteFile(path) {
    try {
      if (!path) return false;
      
      const storageRef = ref(storage, path);
      await deleteObject(storageRef);
      return true;
    } catch (error) {
      console.error(`Erro ao excluir arquivo ${path}:`, error);
      throw error;
    }
  }
}

export default new StorageService();