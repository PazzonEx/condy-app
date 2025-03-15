// src/screens/auth/TermsOfUseScreen.js
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

const TermsOfUseScreen = ({ navigation }) => {
  const theme = useTheme();
  
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />
      
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Termos de Uso" />
      </Appbar.Header>
      
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>Termos de Uso e Condições</Text>
        <Text style={styles.lastUpdated}>Última atualização: 12 de março de 2025</Text>
        
        <Text style={styles.sectionTitle}>1. Aceitação dos Termos</Text>
        <Text style={styles.paragraph}>
          Ao acessar e usar o aplicativo Condy, você concorda em cumprir e estar vinculado por estes Termos de Uso. 
          Se você não concordar com qualquer parte destes termos, não poderá acessar o aplicativo.
        </Text>
        
        <Text style={styles.sectionTitle}>2. Uso do Serviço</Text>
        <Text style={styles.paragraph}>
          O Condy é um aplicativo de controle de acesso para condomínios que facilita a entrada de motoristas de aplicativos 
          e entregadores na portaria. Os usuários podem se registrar como moradores, motoristas ou condomínios, cada um com 
          funcionalidades específicas.
        </Text>
        
        <Text style={styles.sectionTitle}>3. Cadastro e Conta</Text>
        <Text style={styles.paragraph}>
          Para utilizar o Condy, você precisa fornecer informações precisas e completas durante o processo de cadastro. 
          Você é responsável por manter a confidencialidade da sua senha e por todas as atividades realizadas em sua conta.
        </Text>
        
        <Text style={styles.sectionTitle}>4. Privacidade</Text>
        <Text style={styles.paragraph}>
          O uso do Condy está sujeito à nossa Política de Privacidade, que descreve como coletamos, usamos, processamos 
          e protegemos suas informações pessoais.
        </Text>
        
        <Text style={styles.sectionTitle}>5. Conteúdo do Usuário</Text>
        <Text style={styles.paragraph}>
          Você é responsável por todo o conteúdo e informações que envia ou transmite através do aplicativo. Não deve 
          publicar conteúdo ilegal, abusivo, difamatório ou que viole direitos de terceiros.
        </Text>
        
        <Text style={styles.sectionTitle}>6. Assinaturas e Pagamentos</Text>
        <Text style={styles.paragraph}>
          Alguns recursos do Condy exigem assinatura paga. Ao assinar um plano, você concorda com os termos de pagamento 
          específicos apresentados no momento da assinatura.
        </Text>
        
        <Text style={styles.sectionTitle}>7. Limitações de Responsabilidade</Text>
        <Text style={styles.paragraph}>
          O Condy é fornecido "como está" e "conforme disponível", sem garantias de qualquer tipo. Não nos responsabilizamos 
          por danos diretos, indiretos, incidentais ou consequenciais resultantes do uso do aplicativo.
        </Text>
        
        <Text style={styles.sectionTitle}>8. Alterações nos Termos</Text>
        <Text style={styles.paragraph}>
          Reservamo-nos o direito de modificar estes termos a qualquer momento. As modificações entrarão em vigor imediatamente 
          após sua publicação no aplicativo. O uso contínuo do aplicativo após quaisquer alterações constitui aceitação dos novos termos.
        </Text>
        
        <Text style={styles.sectionTitle}>9. Lei Aplicável</Text>
        <Text style={styles.paragraph}>
          Estes termos são regidos e interpretados de acordo com as leis do Brasil, independentemente dos princípios de 
          conflito de leis.
        </Text>
        
        <Text style={styles.sectionTitle}>10. Contato</Text>
        <Text style={styles.paragraph}>
          Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco pelo e-mail: contato@condy.com.br
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
});

export default TermsOfUseScreen;