// scripts/main.js

/**
 * @file Script principal do app VEEX.
 * Gerencia a inicialização, carregamento de componentes comuns e navegação.
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log('VEEX App Inicializando...');

    // Inicializa o mock database e configurações se não existirem no LocalStorage
    await initializeMockDatabase(); // Função de util.js
    await initializeAppConfig();    // Função de util.js

    // Carrega componentes comuns
    await loadCommonComponents();

    // Configura o estado da navegação (link ativo)
    setActiveNavigationLink();

    // Verifica status online/offline
    updateOnlineStatus();
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    // Atualiza o ano no rodapé da sidebar
    updateCopyrightYear();

    // Adiciona listeners globais para modais (botões de fechar)
    addGlobalModalClosers();

    // Exemplo de mensagem de boas-vindas
    // displayGlobalMessage('Bem-vindo ao VEEX!', 'info', 3000);

    console.log('VEEX App Pronto!');
});


/**
 * Carrega componentes HTML comuns como header e sidebar nas páginas.
 */
async function loadCommonComponents() {
    const headerPlaceholder = document.getElementById('app-header');
    const sidebarPlaceholder = document.getElementById('app-sidebar');

    if (headerPlaceholder) {
        try {
            const response = await fetch('components/header.html');
            if (!response.ok) throw new Error('Falha ao carregar header');
            headerPlaceholder.innerHTML = await response.text();
            // Poderia adicionar lógica específica do header aqui, se necessário
            updatePageTitleInHeader();
        } catch (error) {
            console.error("Erro ao carregar o header:", error);
            headerPlaceholder.innerHTML = "<p>Erro ao carregar cabeçalho.</p>";
        }
    }

    if (sidebarPlaceholder) {
         try {
            const response = await fetch('components/sidebar.html');
            if (!response.ok) throw new Error('Falha ao carregar sidebar');
            sidebarPlaceholder.innerHTML = await response.text();
            // Poderia adicionar lógica específica da sidebar aqui
        } catch (error) {
            console.error("Erro ao carregar a sidebar:", error);
            sidebarPlaceholder.innerHTML = "<p>Erro ao carregar menu.</p>";
        }
    }
}

/**
 * Atualiza o título da página no cabeçalho.
 */
function updatePageTitleInHeader() {
    const pageTitleElement = document.getElementById('currentPageTitle');
    if (pageTitleElement && document.title) {
        // Extrai o título da tag <title> da página e remove o prefixo "VEEX - "
        pageTitleElement.textContent = document.title.replace('VEEX - ', '');
    }
    const userNameDisplay = document.getElementById('userNameDisplay');
    const db = loadDataFromLocalStorage(VEEX_DB_KEY);
    if(userNameDisplay && db && db.config && db.config.currentUser) {
        userNameDisplay.textContent = db.config.currentUser;
    }
}


/**
 * Define o link ativo na sidebar de navegação baseado na URL atual.
 */
function setActiveNavigationLink() {
    const currentPage = window.location.pathname.split('/').pop(); // Pega o nome do arquivo ex: "dashboard.html"
    const navLinks = document.querySelectorAll('#app-sidebar .nav-link');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === currentPage) {
            link.classList.add('active');
        }
    });
}

/**
 * Atualiza a exibição do status online/offline.
 */
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    const statusElement = document.getElementById('status'); // Na página de login
    const sidebarStatusElement = document.getElementById('sidebarStatus'); // Na sidebar

    if (statusElement) {
        statusElement.textContent = isOnline ? 'Online' : 'Offline';
        statusElement.style.color = isOnline ? 'lightgreen' : 'salmon';
    }
    if (sidebarStatusElement) {
        sidebarStatusElement.textContent = isOnline ? 'Online' : 'Offline';
        sidebarStatusElement.style.color = isOnline ? 'lightgreen' : 'salmon';
    }
    // Poderia adicionar mais lógica para lidar com o estado offline,
    // como desabilitar botões de salvar ou tentar sincronizar dados quando online.
    console.log(`Status da conexão: ${isOnline ? 'Online' : 'Offline'}`);
}

/**
 * Atualiza o ano no copyright da sidebar.
 */
function updateCopyrightYear() {
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
}

/**
 * Adiciona event listeners para todos os botões de fechar modais padrão.
 */
function addGlobalModalClosers() {
    document.body.addEventListener('click', function(event) {
        // Fecha modal clicando no X (close-button)
        if (event.target.matches('.close-button')) {
            const modalId = event.target.dataset.modalId || event.target.closest('.modal')?.id;
            if (modalId) {
                closeModal(modalId);
            }
        }
        // Fecha modal clicando fora do modal-content (no background)
        if (event.target.matches('.modal')) {
             closeModal(event.target.id);
        }
    });
}

// --- Lógica para a página de Login (index.html) ---
if (document.getElementById('loginForm')) {
    const loginForm = document.getElementById('loginForm');
    loginForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const username = event.target.username.value;
        // const password = event.target.password.value; // Não usado neste exemplo simples

        // Lógica de autenticação (simplificada)
        if (username) {
            const db = loadDataFromLocalStorage(VEEX_DB_KEY);
            if (db && db.config) {
                db.config.currentUser = username;
                saveDataToLocalStorage(VEEX_DB_KEY, db);
            }
            displayGlobalMessage(`Login bem-sucedido como ${username}! Redirecionando...`, 'success');
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1500);
        } else {
            displayGlobalMessage('Por favor, insira um nome de usuário.', 'error');
        }
    });
}
