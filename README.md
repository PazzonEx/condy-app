# Condy - Controle de Acesso para Condomínios

Olá! Vamos criar um README detalhado para o projeto Condy, com base em todo o código e documentação que revisamos. Este README servirá como guia para a continuidade do desenvolvimento.

## Projeto Condy

Condy é um aplicativo mobile desenvolvido em React Native com Expo que facilita o controle de acesso em condomínios. A aplicação conecta três tipos de usuários (moradores, portaria e motoristas) em um fluxo simplificado para autorização de entrada.

### Principais Funcionalidades

🏢 **Para Condomínios/Portaria:**
- Gerenciamento de solicitações de acesso (aprovar/negar)
- Scanner de QR Code para validação na entrada
- Dashboard com estatísticas e relatórios de acesso
- Diferentes planos de assinatura (Free, Basic, Premium)

🏠 **Para Moradores:**
- Criação de solicitações de acesso para motoristas/entregadores
- Compartilhamento de QR Code com motoristas autorizados
- Histórico de solicitações e status em tempo real
- Salvamento de motoristas frequentes

🚗 **Para Motoristas:**
- Visualização de solicitações autorizadas
- QR Code para apresentação na portaria
- Informações de acesso e navegação até o condomínio

### Tecnologias Utilizadas

- **Frontend:** React Native com Expo
- **Backend:** Firebase (Authentication, Firestore, Storage, Cloud Messaging)
- **Autenticação:** Firebase Authentication
- **Banco de Dados:** Firestore
- **Notificações:** Expo Notifications com Firebase Cloud Messaging

### Estado Atual do Desenvolvimento

✅ Implementado:
- Sistema de autenticação e autorização
- Fluxo básico de criação e aprovação de solicitações
- Integração com Firebase
- Componentes de UI principais
- Navegação entre telas

🔄 Em andamento:
- Sistema de notificações em tempo real
- Scanner QR Code para portaria
- Dashboard com estatísticas

🔜 Próximos passos:
- Sistema de pagamento e assinaturas
- Melhorias na experiência do usuário
- Testes e otimizações

## Estrutura do Projeto

```
condy/
├── assets/                 # Imagens e recursos estáticos
├── src/
│   ├── components/         # Componentes reutilizáveis (Button, Card, Input)
│   ├── config/             # Configurações do Firebase
│   ├── hooks/              # Hooks personalizados (useAuth, useAccessRequests)
│   ├── navigation/         # Configuração de navegação
│   ├── screens/            # Telas da aplicação
│   │   ├── admin/          # Telas para administradores
│   │   ├── auth/           # Telas de autenticação
│   │   ├── condo/          # Telas para condomínios/portaria
│   │   ├── driver/         # Telas para motoristas
│   │   └── resident/       # Telas para moradores
│   ├── services/           # Serviços (auth, firestore, notifications)
│   └── utils/              # Utilitários (format, validation)
├── .env                    # Variáveis de ambiente
├── App.js                  # Componente principal da aplicação
└── package.json            # Dependências e scripts
```

## Configuração do Ambiente de Desenvolvimento

1. Clone o repositório:
   ```
   git clone https://github.com/seu-usuario/condy.git
   cd condy
   ```

2. Instale as dependências:
   ```
   npm install
   ```

3. Configure seu arquivo `.env` com as credenciais do Firebase:
   ```
   FIREBASE_API_KEY=sua_api_key
   FIREBASE_AUTH_DOMAIN=seu_auth_domain
   FIREBASE_PROJECT_ID=seu_project_id
   FIREBASE_STORAGE_BUCKET=seu_storage_bucket
   FIREBASE_MESSAGING_SENDER_ID=seu_messaging_sender_id
   FIREBASE_APP_ID=seu_app_id
   ```

4. Execute o aplicativo:
   ```
   npm start
   ```

## Detalhes de Implementação

### Sistema de Autenticação

O sistema utiliza Firebase Authentication com três tipos de usuários:
- Moradores (resident)
- Motoristas (driver)
- Condomínios (condo)
- Administradores (admin)

Cada tipo tem seu próprio fluxo de navegação e telas específicas.

### Banco de Dados

A estrutura do Firestore é organizada em coleções:
- `users`: Informações básicas de todos os usuários
- `residents`: Dados específicos de moradores
- `drivers`: Dados específicos de motoristas
- `condos`: Dados específicos de condomínios
- `access_requests`: Solicitações de acesso
- `subscriptions`: Informações de assinaturas

### Sistema de Notificações

O sistema de notificações utiliza Expo Notifications e Firebase Cloud Messaging para:
- Notificar moradores quando um motorista chega
- Alertar portarias sobre novas solicitações
- Informar motoristas sobre aprovação/negação de acesso

## Estratégia de Monetização

O aplicativo possui diferentes planos de assinatura para condomínios:
- **Free**: Até 5 solicitações por mês, funcionalidades básicas
- **Basic** (R$99,90/mês): Até 50 solicitações, histórico de 30 dias
- **Premium** (R$199,90/mês): Solicitações ilimitadas, estatísticas completas

## Próximos Desenvolvimentos

1. **Implementação do sistema de pagamento**:
   - Integração com Stripe ou MercadoPago
   - Checkout seguro e renovação automática

2. **Melhorias na UI/UX**:
   - Animações e transições fluidas
   - Sistema de onboarding para novos usuários
   - Tema escuro

3. **Otimizações de performance**:
   - Cache de dados para uso offline
   - Otimização de queries do Firestore
   - Redução do tamanho do bundle

4. **Testes e validação**:
   - Implementação de testes unitários e de integração
   - Testes de usabilidade com usuários reais

## Contribuição

Para contribuir com o projeto:
1. Crie um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Faça commit das alterações (`git commit -m 'Adiciona nova funcionalidade'`)
4. Envie para o branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## Contato

Para mais informações ou suporte, entre em contato através de [email@condy.com](mailto:email@condy.com).

---

