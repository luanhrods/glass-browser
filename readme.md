# Glass Browser 🌐

Um navegador moderno e elegante com design glass-like, inspirado no Safari e construído com Electron.js.

## ✨ Características Principais

### 🎨 Design Moderno
- **Interface Glass-like**: Efeitos de glassmorphism com blur e transparência
- **Inspirado no Safari**: Usabilidade e design similares ao Safari, mesmo no Windows
- **Tema Adaptável**: Suporte a temas claro, escuro e automático
- **Animações Suaves**: Transições e efeitos visuais modernos

### 🔧 Funcionalidades Core
- **Sistema de Abas**: Gerenciamento completo de múltiplas abas
- **Navegação Intuitiva**: Botões de voltar, avançar, refresh e barra de endereços inteligente
- **Motor de Busca**: Google como padrão, com suporte a Bing e DuckDuckGo
- **Bookmarks**: Sistema completo de favoritos com organização
- **Histórico**: Histórico navegação com agrupamento por data
- **Configurações**: Painel completo de configurações personalizáveis

### ⌨️ Atalhos de Teclado (Estilo Safari)
- `Cmd/Ctrl + T` - Nova aba
- `Cmd/Ctrl + W` - Fechar aba
- `Cmd/Ctrl + N` - Nova janela  
- `Cmd/Ctrl + R` - Atualizar página
- `Cmd/Ctrl + L` - Focar barra de endereços
- `Cmd/Ctrl + D` - Adicionar bookmark
- `Cmd/Ctrl + H` - Mostrar histórico
- `Alt + ←/→` - Voltar/Avançar
- `F12` - Ferramentas de desenvolvedor

### 🔒 Privacidade e Segurança
- **Bloqueio de Anúncios**: Sistema básico integrado
- **Indicador de Segurança**: Mostra conexões HTTPS
- **Sandboxing**: Isolamento de processos para segurança
- **Context Isolation**: Separação entre contextos para maior segurança

### 🧩 Compatibilidade com Extensões
- Suporte básico para extensões do Chrome
- Arquitetura preparada para expansão

## 🚀 Instalação e Uso

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn

### Instalação
```bash
# Clonar o repositório
git clone https://github.com/seu-usuario/glass-browser.git
cd glass-browser

# Instalar dependências
npm install

# Executar em modo desenvolvimento
npm run dev

# Ou executar versão de produção
npm start
```

### Build para Distribuição
```bash
# Build para todas as plataformas
npm run build

# Build específico para Windows
npm run build-win

# Build específico para macOS  
npm run build-mac

# Build específico para Linux
npm run build-linux
```

## 📁 Estrutura do Projeto

```
glass-browser/
├── src/
│   ├── main.js                # Processo principal do Electron
│   ├── preload.js             # Bridge de segurança
│   ├── index.html             # Página principal
│   └── renderer/              # Interface do usuário
│       ├── styles/            # Estilos CSS
│       │   ├── main.css       # Estilos principais
│       │   ├── glass.css      # Efeitos glassmorphism
│       │   └── components.css # Componentes específicos
│       └── js/                # Lógica JavaScript
│           ├── browser.js     # Lógica principal do navegador
│           ├── tabs.js        # Gerenciamento de abas
│           ├── bookmarks.js   # Sistema de favoritos
│           └── settings.js    # Configurações
├── assets/                    # Recursos estáticos
│   ├── icon.png              # Ícone do aplicativo
│   ├── icon.ico              # Ícone para Windows
│   └── icon.icns             # Ícone para macOS
├── package.json              # Configuração do projeto
└── README.md                 # Documentação
```

## ⚙️ Configurações Disponíveis

### Geral
- **Motor de Busca**: Google, Bing ou DuckDuckGo
- **Página Inicial**: URL personalizada
- **Tema**: Automático, claro ou escuro

### Privacidade
- Bloqueio de anúncios
- Bloqueio de rastreadores  
- Política de cookies

### Aparência
- Tamanho da fonte
- Nível de zoom padrão
- Habilitação de animações

### Avançado
- Aceleração por hardware
- Configurações de proxy
- Limpeza de dados
- Import/Export de configurações

## 🔧 Desenvolvimento

### Tecnologias Utilizadas
- **Electron 37.2.6**: Framework principal
- **Node.js 22.17.1**: Runtime JavaScript
- **Chromium 138**: Engine de renderização
- **CSS3**: Efeitos glassmorphism e animações
- **JavaScript ES2024+**: Lógica moderna

### Arquitetura
O navegador segue a arquitetura padrão do Electron com:

1. **Processo Principal** (`main.js`): Gerencia janelas e sistema
2. **Processo Renderer** (`renderer/`): Interface do usuário
3. **Preload Script** (`preload.js`): Bridge segura entre processos

### Recursos de Segurança
- Context Isolation habilitado
- Node Integration desabilitado
- Sandbox ativado para webviews
- CSP (Content Security Policy)
- Validação de URLs

## 🎨 Design System

### Cores
```css
--primary-bg: rgba(255, 255, 255, 0.05)
--secondary-bg: rgba(255, 255, 255, 0.1)  
--accent-color: #007AFF
--glass-bg: rgba(255, 255, 255, 0.08)
--glass-border: rgba(255, 255, 255, 0.2)
```

### Efeitos Glass
- **Blur**: 20px backdrop-filter
- **Transparência**: 8-12% de opacidade
- **Bordas**: 15-25% de opacidade
- **Sombras**: Múltiplas camadas para profundidade

## 📱 Responsividade

O navegador se adapta a diferentes tamanhos de tela:
- **Desktop**: Layout completo com sidebar
- **Tablets**: Interface compacta
- **Telas pequenas**: Elementos redimensionados

## 🚧 Roadmap

### Versão 1.1
- [ ] Sistema completo de extensões
- [ ] Modo privado/incógnito
- [ ] Sincronização na nuvem
- [ ] Gestos de navegação

### Versão 1.2  
- [ ] Downloads integrados
- [ ] Bloqueador de anúncios avançado
- [ ] Suporte a PWAs
- [ ] Modo leitura

### Versão 2.0
- [ ] Motor de busca próprio
- [ ] Sistema de perfis
- [ ] Controles parentais
- [ ] VPN integrada

## 🤝 Contribuição

Contribuições são bem-vindas! Por favor:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova feature'`)
4. Push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- Inspiração no design do Safari da Apple
- Comunidade Electron.js
- Bibliotecas de código aberto utilizadas

## 📞 Contato

- **Website**: [glass-browser.com](https://glass-browser.com)
- **Issues**: [GitHub Issues](https://github.com/seu-usuario/glass-browser/issues)
- **Email**: contato@glass-browser.com

---

**Glass Browser** - Navegação moderna com elegância e simplicidade. 🚀
