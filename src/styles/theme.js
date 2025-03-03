// src/styles/theme.js
import { DefaultTheme } from 'react-native-paper';
import { View, StyleSheet,Text,Button } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Paleta de cores centralizada
export const COLORS = {
  primary: '#1E88E5',
  primaryLight: '#E3F2FD',
  primaryDark: '#1565C0',
  secondary: '#FF9800',
  accent: '#FFC107',
  success: '#4CAF50',
  danger: '#F44336',
  warning: '#FF9800',
  info: '#2196F3',
  dark: '#212121',
  light: '#F5F5F5',
  white: '#FFFFFF',
  grey: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#EEEEEE',
    300: '#E0E0E0',
    400: '#BDBDBD',
    500: '#9E9E9E',
    600: '#757575',
    700: '#616161',
    800: '#424242',
    900: '#212121',
  }
};

// Tema personalizado para o React Native Paper
export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: COLORS.primary,
    accent: COLORS.accent,
    background: COLORS.light,
    surface: COLORS.white,
    error: COLORS.danger,
    text: COLORS.dark,
    placeholder: COLORS.grey[600],
    disabled: COLORS.grey[400],
  },
  roundness: 8,
};

// Estilos reutilizáveis em toda a aplicação
export const globalStyles = StyleSheet.create({
  // Contêineres
  container: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.light,
  },
  contentContainer: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
    borderRadius: 8,
    elevation: 2,
  },
  section: {
    marginBottom: 24,
  },
  
  // Cabeçalhos
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey[300],
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.dark,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.grey[600],
  },
  
  // Texto
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  caption: {
    fontSize: 14,
    color: COLORS.grey[600],
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
    marginTop: 4,
  },
  
  // Status
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusText: {
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  
  // Filtros
  filtersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.grey[300],
  },
  filterButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 4,
  },
  filterButtonActive: {
    backgroundColor: COLORS.primaryLight,
  },
  filterText: {
    fontSize: 14,
    color: COLORS.grey[600],
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  
  // Carregamento e erros
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  
  // Botões e ações
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
  actionsContainer: {
    marginVertical: 16,
  },
  actionButton: {
    marginBottom: 12,
  },
  
  // Espaçamento
  spacer: {
    height: 40,
  },
  smallSpacer: {
    height: 16,
  },
  
  // Campos de formulário
  formGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 4,
    color: COLORS.grey[700],
  },
  
  // Listas
  listContainer: {
    padding: 16,
    paddingBottom: 80, // Espaço para o FAB
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});

// Status comuns com cores e ícones
export const statusStyles = {
  pending: {
    label: 'Pendente',
    color: COLORS.warning,
    icon: 'clock-outline',
    description: 'Aguardando aprovação da portaria'
  },
  pending_resident: {
    label: 'Aguardando Morador',
    color: COLORS.secondary,
    icon: 'account-clock',
    description: 'Aguardando aprovação do morador'
  },
  authorized: {
    label: 'Autorizado',
    color: COLORS.success,
    icon: 'check-circle-outline',
    description: 'Autorizado pela portaria'
  },
  denied: {
    label: 'Negado',
    color: COLORS.danger,
    icon: 'close-circle-outline',
    description: 'Acesso negado'
  },
  arrived: {
    label: 'Na portaria',
    color: COLORS.info,
    icon: 'map-marker',
    description: 'Na portaria do condomínio'
  },
  entered: {
    label: 'Entrou',
    color: '#9C27B0',
    icon: 'login',
    description: 'Entrou no condomínio'
  },
  completed: {
    label: 'Concluído',
    color: COLORS.success,
    icon: 'check-circle',
    description: 'Acesso concluído'
  },
  canceled: {
    label: 'Cancelado',
    color: COLORS.grey[600],
    icon: 'cancel',
    description: 'Solicitação cancelada'
  }
};

// Componentes compartilhados
export const EmptyState = ({ icon, title, description, buttonText, onButtonPress }) => (
  <View style={globalStyles.emptyContainer}>
    <MaterialCommunityIcons name={icon} size={64} color={COLORS.grey[400]} />
    <Text style={[globalStyles.subtitle, { marginTop: 16, marginBottom: 8 }]}>{title}</Text>
    <Text style={[globalStyles.caption, { textAlign: 'center', marginBottom: 20 }]}>{description}</Text>
    {buttonText && onButtonPress && (
      <Button mode="contained" onPress={onButtonPress}>{buttonText}</Button>
    )}
  </View>
);

export const StatusBadge = ({ status }) => {
  const statusInfo = statusStyles[status] || {
    label: status || 'Desconhecido',
    color: COLORS.grey[600],
    icon: 'help-circle-outline'
  };
  
  return (
    <View style={[globalStyles.rowCenter, { marginBottom: 8 }]}>
      <MaterialCommunityIcons name={statusInfo.icon} size={20} color={statusInfo.color} />
      <Text style={[globalStyles.statusText, { color: statusInfo.color, fontSize: 14, marginLeft: 4 }]}>
        {statusInfo.label}
      </Text>
    </View>
  );
};

// Exportar tudo
export default {
  COLORS,
  theme,
  globalStyles,
  statusStyles,
  EmptyState,
  StatusBadge
};