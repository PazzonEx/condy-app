// src/components/DocumentUpload.js
import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  ActivityIndicator,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Platform
} from 'react-native';
import { 
  Text, 
  Surface, 
  useTheme, 
  IconButton, 
  Button,
  FAB
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import { BlurView } from 'expo-blur';

// Componentes personalizados
import ConfirmationDialog from './ConfirmationDialog';

// Serviços
import StorageService from '../services/storage.service';

// Constantes
const { width, height } = Dimensions.get('window');
const MAX_IMAGE_SIZE = 2 * 1024 * 1024; // 2MB
const THUMBNAIL_SIZE = 300;

const DocumentUpload = ({ 
  title, 
  subtitle,
  documentType,
  initialDocuments = [],
  userId,
  onDocumentsChange,
  maxDocuments = 5,
  acceptedTypes = ['image/*', 'application/pdf'],
  required = false,
  disabled = false
}) => {
  const theme = useTheme();
  
  // Estados
  const [documents, setDocuments] = useState(initialDocuments || []);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [showViewer, setShowViewer] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  
  // Animações
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const blurAnim = useRef(new Animated.Value(0)).current;
  
  // Efeito para sincronizar documentos iniciais
  useEffect(() => {
    if (initialDocuments && initialDocuments.length > 0) {
      setDocuments(initialDocuments);
    }
  }, [initialDocuments]);
  
  // Efeito para animar abertura do visualizador
  useEffect(() => {
    if (showViewer) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true
        }),
        Animated.timing(blurAnim, {
          toValue: 100,
          duration: 300,
          useNativeDriver: false
        })
      ]).start();
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      blurAnim.setValue(0);
    }
  }, [showViewer]);
  
  // Solicitar permissões
  const requestPermissions = async () => {
    // Solicitar permissões para acessar a biblioteca de mídia e a câmera
    const { status: mediaLibraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
    
    if (mediaLibraryStatus !== 'granted' || cameraStatus !== 'granted') {
      alert('Precisamos de permissão para acessar suas fotos e câmera');
      return false;
    }
    
    return true;
  };
  
  // Selecionar da galeria
  const pickImage = async () => {
    setShowOptions(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        
        // Verificar tamanho
        const fileInfo = await FileSystem.getInfoAsync(selectedImage.uri);
        
        if (fileInfo.size > MAX_IMAGE_SIZE) {
          // Comprimir imagem
          const compressed = await compressImage(selectedImage.uri);
          await handleUpload(compressed.uri, 'image/jpeg');
        } else {
          await handleUpload(selectedImage.uri, 'image/jpeg');
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar imagem:', error);
      alert('Erro ao selecionar imagem. Tente novamente.');
    }
  };
  
  // Tirar foto com a câmera
  const takePhoto = async () => {
    setShowOptions(false);
    
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const photo = result.assets[0];
        
        // Comprimir imagem
        const compressed = await compressImage(photo.uri);
        await handleUpload(compressed.uri, 'image/jpeg');
      }
    } catch (error) {
      console.error('Erro ao tirar foto:', error);
      alert('Erro ao tirar foto. Tente novamente.');
    }
  };
  
  // Selecionar documento
  const pickDocument = async () => {
    setShowOptions(false);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: acceptedTypes,
        copyToCacheDirectory: true,
      });
      
      if (result.type === 'success') {
        await handleUpload(result.uri, result.mimeType);
      }
    } catch (error) {
      console.error('Erro ao selecionar documento:', error);
      alert('Erro ao selecionar documento. Tente novamente.');
    }
  };
  
  // Comprimir imagem
  const compressImage = async (uri) => {
    try {
      const compressed = await manipulateAsync(
        uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );
      
      return compressed;
    } catch (error) {
      console.error('Erro ao comprimir imagem:', error);
      throw error;
    }
  };
  
  // Gerar miniatura
  const generateThumbnail = async (uri) => {
    try {
      const thumbnail = await manipulateAsync(
        uri,
        [{ resize: { width: THUMBNAIL_SIZE } }],
        { compress: 0.7, format: SaveFormat.JPEG }
      );
      
      return thumbnail;
    } catch (error) {
      console.error('Erro ao gerar miniatura:', error);
      throw error;
    }
  };
  
  // Fazer upload do documento
  const handleUpload = async (uri, mimeType) => {
    if (!userId) {
      alert('Erro: ID de usuário não fornecido');
      return;
    }
    
    if (documents.length >= maxDocuments) {
      alert(`Limite de ${maxDocuments} documentos atingido. Remova algum documento antes de adicionar outro.`);
      return;
    }
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      // Gerar nome do arquivo
      const timestamp = Date.now();
      const fileExtension = uri.split('.').pop();
      const fileName = `${documentType}_${timestamp}.${fileExtension}`;
      const filePath = `users/${userId}/documents/${fileName}`;
      
      // Criar thumbnail se for imagem
      let thumbnailUrl = null;
      if (mimeType.startsWith('image/')) {
        const thumbnail = await generateThumbnail(uri);
        const thumbnailPath = `users/${userId}/thumbnails/${fileName}`;
        const thumbnailResult = await StorageService.uploadFile(thumbnailPath, thumbnail.uri);
        thumbnailUrl = thumbnailResult.url;
      }
      
      // Upload do arquivo
      const result = await StorageService.uploadFile(filePath, uri);
      
      // Criar objeto do documento
      const newDocument = {
        id: timestamp.toString(),
        name: fileName,
        type: mimeType,
        size: result.metadata.size,
        url: result.url,
        thumbnailUrl: thumbnailUrl,
        path: filePath,
        thumbnailPath: thumbnailUrl ? `users/${userId}/thumbnails/${fileName}` : null,
        uploadedAt: new Date().toISOString(),
        documentType
      };
      
      // Atualizar lista de documentos
      const updatedDocuments = [...documents, newDocument];
      setDocuments(updatedDocuments);
      
      // Notificar mudança
      if (onDocumentsChange) {
        onDocumentsChange(updatedDocuments);
      }
    } catch (error) {
      console.error('Erro ao fazer upload:', error);
      alert('Erro ao fazer upload. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  
  // Excluir documento
  const confirmDeleteDocument = () => {
    if (!documentToDelete) return;
    
    setLoading(true);
    
    StorageService.deleteFile(documentToDelete.path)
      .then(() => {
        // Excluir thumbnail se existir
        if (documentToDelete.thumbnailPath) {
          return StorageService.deleteFile(documentToDelete.thumbnailPath);
        }
      })
      .then(() => {
        // Atualizar lista de documentos
        const updatedDocuments = documents.filter(doc => doc.id !== documentToDelete.id);
        setDocuments(updatedDocuments);
        
        // Notificar mudança
        if (onDocumentsChange) {
          onDocumentsChange(updatedDocuments);
        }
      })
      .catch(error => {
        console.error('Erro ao excluir documento:', error);
        alert('Erro ao excluir documento. Tente novamente.');
      })
      .finally(() => {
        setLoading(false);
        setShowDeleteDialog(false);
        setDocumentToDelete(null);
      });
  };
  
  // Iniciar exclusão
  const handleDeleteDocument = (document) => {
    setDocumentToDelete(document);
    setShowDeleteDialog(true);
  };
  
  // Visualizar documento
  const handleViewDocument = (document) => {
    setSelectedDocument(document);
    setShowViewer(true);
  };
  
  // Renderizar item de documento
  const renderDocumentItem = (document, index) => {
    return (
      <Surface style={styles.documentCard} key={document.id || index}>
        <TouchableOpacity
          style={styles.documentCardInner}
          onPress={() => handleViewDocument(document)}
          disabled={disabled}
        >
          {/* Thumbnail ou ícone */}
          {document.thumbnailUrl ? (
            <Image
              source={{ uri: document.thumbnailUrl }}
              style={styles.documentThumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.documentIcon, { backgroundColor: theme.colors.primary + '20' }]}>
              <MaterialCommunityIcons
                name={document.type.includes('pdf') ? 'file-pdf-box' : 'file-document'}
                size={32}
                color={theme.colors.primary}
              />
            </View>
          )}
          
          {/* Informações do documento */}
          <View style={styles.documentInfo}>
            <Text style={styles.documentName} numberOfLines={1}>
              {document.name.split('_').pop()}
            </Text>
            <Text style={styles.documentMeta}>
              {getFormattedSize(document.size)} • {getFormattedDate(document.uploadedAt)}
            </Text>
          </View>
          
          {/* Botão de exclusão */}
          {!disabled && (
            <IconButton
              icon="delete"
              size={20}
              color="#F44336"
              style={styles.deleteButton}
              onPress={() => handleDeleteDocument(document)}
            />
          )}
        </TouchableOpacity>
      </Surface>
    );
  };
  
  // Obter tamanho formatado
  const getFormattedSize = (bytes) => {
    if (!bytes) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Obter data formatada
  const getFormattedDate = (dateString) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };
  
  // Renderizar documento no visualizador
  const renderDocumentViewer = () => {
    if (!selectedDocument) return null;
    
    return (
      <Modal
        visible={showViewer}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowViewer(false)}
      >
        <BlurView 
          intensity={Platform.OS === 'ios' ? 50 : 30} 
          tint="dark"
          style={styles.viewerModal}
        >
          <Animated.View 
            style={[
              styles.viewerContainer,
              {
                opacity: opacityAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}
          >
            <View style={styles.viewerHeader}>
              <IconButton
                icon="close"
                size={24}
                color="#fff"
                onPress={() => setShowViewer(false)}
              />
              <Text style={styles.viewerTitle}>
                {selectedDocument.name.split('_').pop()}
              </Text>
              <View style={{ width: 40 }} />
            </View>
            
            <View style={styles.viewerContent}>
              {selectedDocument.type.startsWith('image/') ? (
                <Image
                  source={{ uri: selectedDocument.url }}
                  style={styles.viewerImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.pdfPlaceholder}>
                  <MaterialCommunityIcons
                    name="file-pdf-box"
                    size={80}
                    color="#F44336"
                  />
                  <Text style={styles.pdfPlaceholderText}>
                    Visualização de PDF não disponível
                  </Text>
                  <Button
                    mode="contained"
                    onPress={() => {
                      // Abrir PDF externamente (implementar)
                      setShowViewer(false);
                    }}
                    style={styles.openExternalButton}
                  >
                    Abrir Externamente
                  </Button>
                </View>
              )}
            </View>
          </Animated.View>
        </BlurView>
      </Modal>
    );
  };
  
  // Renderizar opções de upload
  const renderUploadOptions = () => {
    return (
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity 
          style={styles.optionsModalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <Surface style={styles.optionsContainer}>
            <Text style={styles.optionsTitle}>Adicionar documento</Text>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={takePhoto}
            >
              <MaterialCommunityIcons 
                name="camera" 
                size={24} 
                color={theme.colors.primary}
                style={styles.optionIcon}
              />
              <Text style={styles.optionText}>Tirar foto</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={pickImage}
            >
              <MaterialCommunityIcons 
                name="image" 
                size={24} 
                color={theme.colors.primary}
                style={styles.optionIcon}
              />
              <Text style={styles.optionText}>Selecionar da galeria</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.optionItem}
              onPress={pickDocument}
            >
              <MaterialCommunityIcons 
                name="file-document" 
                size={24} 
                color={theme.colors.primary}
                style={styles.optionIcon}
              />
              <Text style={styles.optionText}>Selecionar arquivo</Text>
            </TouchableOpacity>
          </Surface>
        </TouchableOpacity>
      </Modal>
    );
  };
  
  return (
    <View style={[styles.container, disabled && styles.disabledContainer]}>
      {/* Cabeçalho */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {title}{required ? ' *' : ''}
        </Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      
      {/* Lista de documentos */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.documentsList}
      >
        {documents.map(renderDocumentItem)}
        
        {/* Botão de adicionar */}
        {!disabled && documents.length < maxDocuments && (
          <TouchableOpacity
            style={styles.addCard}
            onPress={() => setShowOptions(true)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name="plus"
                  size={32}
                  color={theme.colors.primary}
                />
                <Text style={styles.addText}>Adicionar</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        
        {/* Espaço vazio se não houver documentos */}
        {documents.length === 0 && !loading && (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={48}
              color="#BDBDBD"
            />
            <Text style={styles.emptyText}>
              {disabled
                ? 'Nenhum documento'
                : 'Toque em "Adicionar" para enviar documentos'}
            </Text>
          </View>
        )}
      </ScrollView>
      
      {/* Contador de documentos */}
      <Text style={styles.counter}>
        {documents.length} de {maxDocuments} documentos
      </Text>
      
      {/* Diálogo de exclusão */}
      <ConfirmationDialog
        visible={showDeleteDialog}
        onDismiss={() => setShowDeleteDialog(false)}
        onConfirm={confirmDeleteDocument}
        title="Excluir documento"
        message="Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita."
        confirmText="Excluir"
        cancelText="Cancelar"
        destructive={true}
        loading={loading}
        icon="delete"
      />
      
      {/* Visualizador de documento */}
      {renderDocumentViewer()}
      
      {/* Opções de upload */}
      {renderUploadOptions()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  disabledContainer: {
    opacity: 0.7,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#757575',
  },
  documentsList: {
    paddingRight: 16,
    paddingBottom: 8,
  },
  documentCard: {
    width: 150,
    height: 180,
    marginRight: 12,
    borderRadius: 12,
    elevation: 2,
  },
  documentCardInner: {
    flex: 1,
    padding: 8,
  },
  documentThumbnail: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
  },
  documentIcon: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  documentInfo: {
    flex: 1,
  },
  documentName: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  documentMeta: {
    fontSize: 10,
    color: '#757575',
  },
  deleteButton: {
    position: 'absolute',
    top: 0,
    right: 0,
    margin: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
  },
  addCard: {
    width: 150,
    height: 180,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  addText: {
    marginTop: 8,
    fontSize: 14,
    color: '#757575',
  },
  emptyContainer: {
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
    maxWidth: 250,
  },
  counter: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
  },
  viewerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerContainer: {
    width: '90%',
    height: '80%',
    backgroundColor: '#000',
    borderRadius: 16,
    overflow: 'hidden',
  },
  viewerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  viewerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
    textAlign: 'center',
  },
  viewerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  pdfPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pdfPlaceholderText: {
    fontSize: 16,
    color: '#fff',
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  openExternalButton: {
    marginTop: 16,
  },
  optionsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    padding: 24,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  optionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
  },
});

export default DocumentUpload;