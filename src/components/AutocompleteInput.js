import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Keyboard } from 'react-native';
import { Text, Card, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Componentes personalizados
import Input from './Input';

/**
 * Componente de input com autocomplete
 * 
 * @param {string} label - Rótulo do input
 * @param {string} value - Valor do input
 * @param {function} onChangeText - Função chamada quando o texto muda
 * @param {array} data - Array de objetos para sugestões
 * @param {string} textKey - Chave para exibição de texto principal
 * @param {string} subtextKey - Chave para exibição de texto secundário (opcional)
 * @param {string} iconName - Nome do ícone do Material Community Icons (opcional)
 * @param {function} onSelect - Função chamada quando um item é selecionado
 * @param {string} placeholder - Texto de placeholder
 * @param {boolean} disabled - Se o input está desabilitado
 * @param {number} minChars - Número mínimo de caracteres para mostrar sugestões
 * @param {function} filterFunction - Função personalizada para filtrar dados (opcional)
 * @param {object} style - Estilos adicionais para o componente
 */
const AutocompleteInput = ({ 
  label,
  value,
  onChangeText,
  data = [],
  textKey = 'name',
  subtextKey,
  iconName,
  onSelect,
  placeholder,
  disabled = false,
  minChars = 2,
  filterFunction,
  style,
  inputProps = {}
}) => {
  const theme = useTheme();
  const [filteredData, setFilteredData] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [touched, setTouched] = useState(false);
  
  // Efeito para filtrar dados quando o valor ou dados mudam
  useEffect(() => {
    if (value.length < minChars || !data.length) {
      setFilteredData([]);
      return;
    }
    
    // Filtrar dados com base no valor
    let filtered;
    
    if (filterFunction) {
      // Usar função de filtro personalizada se fornecida
      filtered = filterFunction(data, value);
    } else {
      // Filtro padrão
      const query = value.toLowerCase();
      filtered = data.filter(item => {
        const text = String(item[textKey] || '').toLowerCase();
        const subtext = subtextKey ? String(item[subtextKey] || '').toLowerCase() : '';
        
        return text.includes(query) || subtext.includes(query);
      });
    }
    
    // Limitar para evitar listas muito grandes
    filtered = filtered.slice(0, 10);
    
    setFilteredData(filtered);
  }, [value, data, textKey, subtextKey, minChars, filterFunction]);
  
  // Mostrar dropdown quando o input recebe foco e há valor digitado
  const handleFocus = () => {
    setTouched(true);
    if (value.length >= minChars) {
      setShowDropdown(true);
    }
  };
  
  // Manipular evento de alteração de texto
  const handleTextChange = (text) => {
    onChangeText(text);
    setShowDropdown(text.length >= minChars);
  };
  
  // Selecionar um item da lista
  const handleSelectItem = (item) => {
    onSelect(item);
    setShowDropdown(false);
    Keyboard.dismiss();
  };
  
  // Limpar o valor
  const handleClear = () => {
    onChangeText('');
    setShowDropdown(false);
  };
  
  return (
    <View style={[styles.container, style]}>
      <Input
        label={label}
        value={value}
        onChangeText={handleTextChange}
        onFocus={handleFocus}
        placeholder={placeholder}
        disabled={disabled}
        right={
          value ? (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#757575" />
            </TouchableOpacity>
          ) : null
        }
        {...inputProps}
      />
      
      {showDropdown && filteredData.length > 0 && (
        <Card style={styles.dropdownCard}>
          <ScrollView 
            style={styles.dropdownList} 
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {filteredData.map((item, index) => (
              <TouchableOpacity
                key={item.id || index}
                style={styles.dropdownItem}
                onPress={() => handleSelectItem(item)}
              >
                {iconName && (
                  <MaterialCommunityIcons 
                    name={iconName} 
                    size={20} 
                    color="#555" 
                    style={styles.dropdownIcon} 
                  />
                )}
                <View style={styles.dropdownTextContainer}>
                  <Text style={styles.dropdownItemText}>
                    {item[textKey] || 'Sem nome'}
                  </Text>
                  {subtextKey && item[subtextKey] && (
                    <Text style={styles.dropdownItemSubtext}>
                      {item[subtextKey]}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>
      )}
      
      {showDropdown && value.length >= minChars && filteredData.length === 0 && touched && (
        <Card style={styles.dropdownCard}>
          <View style={styles.noResultsContainer}>
            <Text style={styles.noResultsText}>Nenhum resultado encontrado</Text>
          </View>
        </Card>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    position: 'relative',
    zIndex: 1,
  },
  clearButton: {
    padding: 8,
  },
  dropdownCard: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 4,
    maxHeight: 200,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dropdownIcon: {
    marginRight: 10,
  },
  dropdownTextContainer: {
    flex: 1,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownItemSubtext: {
    fontSize: 12,
    color: '#757575',
  },
  noResultsContainer: {
    padding: 16,
    alignItems: 'center',
  },
  noResultsText: {
    color: '#757575',
  },
});

export default AutocompleteInput;