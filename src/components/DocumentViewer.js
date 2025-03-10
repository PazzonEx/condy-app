// src/components/DocumentViewer.js
import React, { useState } from 'react';
import { 
  View, 
  StyleSheet, 
  Image, 
  Modal, 
  TouchableOpacity, 
  Dimensions, 
  ActivityIndicator,
  Platform
} from 'react-native';
import { Text, IconButton, Surface, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

const DocumentViewer = ({ document, visible, onClose }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Se não houver documento ou não estiver visível, não renderizar
  if (!document || !visible) return null;
  
  // Determinar tipo de documento
  const isImage = document.type?.startsWith('image/');
  
  // Função para lidar com erros de carregamento
  const handleError = (error) => {
    console.error('Erro ao carregar documento:', error);
    setError('Não foi possível carregar o documento.');
    setLoading(false);
  };
  
  // Função para lidar com o carregamento completo
  const handleLoadComplete = () => {
    setLoading(false);
  };
  
  // Renderizar documento - simplificado para apenas imagens
  const renderDocument = () => {
    if (isImage) {
      return (
        <Image
          source={{ uri: document.url }}
          style={styles.documentImage}
          resizeMode="contain"
          onLoad={handleLoadComplete}
          onError={handleError}
        />
      );
    } else {
      // Para PDFs e outros tipos, apenas mostrar um indicador
      return (
        <View style={styles.unsupportedContainer}>
          <MaterialCommunityIcons 
            name={document.type?.includes('pdf') ? "file-pdf-box" : "file-document"} 
            size={64} 
            color="#BDBDBD" 
          />
          <Text style={styles.unsupportedText}>
            {document.type?.includes('pdf') ? 
              "Para ver este PDF, por favor faça o download" : 
              "Tipo de arquivo não suportado para visualização"}
          </Text>
          <TouchableOpacity 
            style={styles.downloadButton}
            onPress={onClose}
          >
            <Text style={styles.downloadButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <Surface style={styles.documentContainer}>
          <View style={styles.documentHeader}>
            <Text style={styles.documentTitle} numberOfLines={1}>
              {document.name || 'Documento'}
            </Text>
            <IconButton
              icon="close"
              size={24}
              onPress={onClose}
              color="#FFFFFF"
            />
          </View>
          
          <View style={styles.documentContent}>
            {loading && isImage && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator color={theme.colors.primary} size="large" />
                <Text style={styles.loadingText}>Carregando documento...</Text>
              </View>
            )}
            
            {error ? (
              <View style={styles.errorContainer}>
                <MaterialCommunityIcons name="alert-circle" size={64} color="#F44336" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : (
              renderDocument()
            )}
          </View>
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Substituição do BlurView por um fundo semitransparente
  },
  documentContainer: {
    width: width * 0.9,
    height: height * 0.8,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  documentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#212121',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  documentTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
  },
  documentContent: {
    flex: 1,
    backgroundColor: '#000',
  },
  documentImage: {
    width: '100%',
    height: '100%',
  },
  unsupportedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  unsupportedText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  downloadButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  }
});

export default DocumentViewer;0