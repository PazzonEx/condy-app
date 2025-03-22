// hooks/useDeepLinks.js
import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { Alert } from 'react-native';

/**
 * Hook para gerenciar deep links relacionados a pagamentos
 * @param {Object} navigation - Objeto de navegação do React Navigation
 */
export const useDeepLinks = (navigation) => {
  useEffect(() => {
    // Função para gerenciar os links quando o app está aberto
    const handleDeepLink = (event) => {
      let url = event.url;
      handleUrl(url);
    };

    // Função para gerenciar os URLs recebidos
    const handleUrl = (url) => {
      if (!url) return;

      console.log('Deep link recebido:', url);
      
      // Processar URLs de pagamento
      if (url.includes('pagamento-sucesso')) {
        // Navegar para tela de sucesso
        navigation.navigate('PaymentSuccess');
        
        // Opcionalmente exibir mensagem
        Alert.alert(
          'Pagamento Confirmado', 
          'Sua assinatura foi ativada com sucesso!'
        );
      } 
      else if (url.includes('pagamento-cancelado')) {
        // Navegar para tela apropriada ou apenas mostrar alerta
        Alert.alert(
          'Pagamento Cancelado', 
          'Seu pagamento não foi concluído. Tente novamente quando desejar.'
        );
      }
    };

    // Configurar listeners para deep links
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Verificar se o app foi aberto a partir de um deep link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleUrl(url);
      }
    });

    // Limpeza ao desmontar o componente
    return () => {
      subscription.remove();
    };
  }, [navigation]);

  // O hook não precisa retornar nada, mas pode retornar funções utilitárias se necessário
  return null;
};

export default useDeepLinks;
