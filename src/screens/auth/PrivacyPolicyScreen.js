// src/screens/auth/PrivacyPolicyScreen.js
import React from 'react';
import { 
  View, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView,
  StatusBar 
} from 'react-native';
import { 
  Text, 
  useTheme,
  Appbar
} from 'react-native-paper';

const PrivacyPolicyScreen = ({ navigation }) => {
  const theme = useTheme();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Política de Privacidade" />
      </Appbar.Header>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Política de Privacidade</Text>
        <Text style={styles.lastUpdated}>Última atualização: 12 de março de 2025</Text>
        
        <Text style={styles.paragraph}>
          O Condy está comprometido em proteger sua privacidade. Esta Política de Privacidade explica como coletamos, 
          usamos, divulgamos e protegemos suas informações pessoais ao utilizar nosso aplicativo.
        </Text>
        
        <Text style={styles.sectionTitle}>1. Informações que Coletamos</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>a) Informações de Registro:</Text> Nome, email, telefone, endereço, CPF/CNPJ e 
          outras informações fornecidas durante o cadastro.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>b) Documentos:</Text> CNH, comprovante de residência, documentos de veículo e 
          outros que você optar por fazer upload.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>c) Dados de Localização:</Text> Podemos coletar dados de localização quando você 
          utiliza o aplicativo, com sua permissão.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>d) Dados de Uso:</Text> Informações sobre como você utiliza o aplicativo, incluindo 
          solicitações de acesso, horários e interações.
        </Text>
        
        <Text style={styles.sectionTitle}>2. Como Usamos Suas Informações</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>a) Fornecer Serviços:</Text> Utilizamos suas informações para fornecer, manter e 
          melhorar os serviços do Condy.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>b) Segurança e Verificação:</Text> Verificamos sua identidade e autorizamos acesso 
          aos condomínios.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>c) Comunicações:</Text> Enviamos notificações, atualizações e informações sobre 
          solicitações de acesso.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>d) Análises:</Text> Utilizamos dados agregados para melhorar o aplicativo e entender 
          padrões de uso.
        </Text>
        
        <Text style={styles.sectionTitle}>3. Compartilhamento de Informações</Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>a) Entre Usuários:</Text> Compartilhamos informações necessárias entre moradores, 
          motoristas e condomínios para facilitar o acesso.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>b) Prestadores de Serviço:</Text> Podemos compartilhar dados com prestadores de 
          serviço que nos ajudam a operar, como serviços de hospedagem e processamento de pagamentos.
        </Text>
        <Text style={styles.paragraph}>
          <Text style={styles.bold}>c) Requisitos Legais:</Text> Podemos divulgar informações quando exigido por lei 
          ou para proteger direitos legais.
        </Text>
        
        <Text style={styles.sectionTitle}>4. Armazenamento e Segurança</Text>
        <Text style={styles.paragraph}>
          Implementamos medidas técnicas e organizacionais para proteger suas informações contra acesso não autorizado, 
          alteração ou destruição. Os dados são armazenados em servidores seguros e criptografados quando em trânsito.
        </Text>
        
        <Text style={styles.sectionTitle}>5. Seus Direitos</Text>
        <Text style={styles.paragraph}>
          Você tem direito a acessar, corrigir, atualizar e solicitar a exclusão de seus dados pessoais. Você pode 
          também controlar como recebe notificações através das configurações do aplicativo.
        </Text>
        
        <Text style={styles.sectionTitle}>6. Alterações na Política</Text>
        <Text style={styles.paragraph}>
          Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas 
          através do aplicativo ou por email.
        </Text>
        
        <Text style={styles.sectionTitle}>7. Contato</Text>
        <Text style={styles.paragraph}>
          Se você tiver dúvidas ou preocupações sobre nossa Política de Privacidade, entre em contato pelo email: 
          privacidade@condy.com.br
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  lastUpdated: {
    fontSize: 14,
    color: '#757575',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    color: '#424242',
  },
  bold: {
    fontWeight: 'bold',
  },
});

export default PrivacyPolicyScreen;