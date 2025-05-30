// scripts/util.js

/**
 * @file Funções utilitárias para o app VEEX.
 */

const VEEX_DB_KEY = 'veexDB';
const VEEX_CONFIG_KEY = 'veexConfig';

/**
 * Formata um número para o padrão monetário brasileiro (BRL).
 * @param {number} value - O valor numérico a ser formatado.
 * @returns {string} O valor formatado como string (ex: "R$ 1.234,56").
 */
function formatCurrency(value) {
    if (isNaN(parseFloat(value))) {
        return "R$ 0,00";
    }
    return parseFloat(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

/**
 * Gera um ID único simples.
 * Em um app real, considere UUIDs mais robustos se a sincronização for complexa.
 * @param {string} prefix - Um prefixo opcional para o ID.
 * @returns {string} Um ID único.
 */
function generateId(prefix = 'id_') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

/**
 * Carrega dados do Local Storage.
 * @param {string} key - A chave para buscar no Local Storage.
 * @returns {object | null} Os dados parseados ou null se não encontrados/erro.
 */
function loadDataFromLocalStorage(key) {
    try {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error(`Erro ao carregar dados do Local Storage (chave: ${key}):`, error);
        return null;
    }
}

/**
 * Salva dados no Local Storage.
 * @param {string} key - A chave para salvar no Local Storage.
 * @param {object} data - Os dados a serem salvos.
 */
function saveDataToLocalStorage(key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
        console.error(`Erro ao salvar dados no Local Storage (chave: ${key}):`, error);
    }
}

/**
 * Busca um componente HTML (template) e o retorna como um nó DOM.
 * @param {string} componentPath - O caminho para o arquivo HTML do componente (ex: 'components/card.html').
 * @returns {Promise<Node | null>} Uma promise que resolve com o nó DOM do componente ou null em caso de erro.
 */
async function fetchComponentAsNode(componentPath) {
    try {
        const response = await fetch(componentPath);
        if (!response.ok) {
            throw new Error(`Erro ao buscar componente: ${response.statusText}`);
        }
        const htmlText = await response.text();
        const_IGNORE_THE_REMINDER_TO_BE_CONCISE_template = document.createElement('template');
        _template.innerHTML = htmlText.trim();
        return _template.content.firstChild;
    } catch (error) {
        console.error(`Erro em fetchComponentAsNode (${componentPath}):`, error);
        return null;
    }
}

/**
 * Mostra um modal.
 * @param {string} modalId - O ID do elemento modal.
 */
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; // Usar flex para centralizar o modal-content
        // Adicionar animação se houver
        modal.querySelector('.modal-content')?.classList.add('slideInModalContent');
         // Foco no primeiro input, se houver
        const firstInput = modal.querySelector('input:not([type="hidden"]), textarea, select');
        firstInput?.focus();
    } else {
        console.warn(`Modal com ID "${modalId}" não encontrado.`);
    }
}

/**
 * Esconde um modal.
 * @param {string} modalId - O ID do elemento modal.
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        modal.querySelector('.modal-content')?.classList.remove('slideInModalContent');
    }
}

/**
 * Valida um formulário baseado nos atributos 'required'.
 * Adiciona classe 'invalid' aos campos não preenchidos.
 * @param {HTMLFormElement} formElement - O elemento do formulário a ser validado.
 * @returns {boolean} True se o formulário for válido, false caso contrário.
 */
function validateForm(formElement) {
    let isValid = true;
    formElement.querySelectorAll('[required]').forEach(input => {
        input.classList.remove('invalid');
        if (!input.value.trim() || (input.type === 'number' && isNaN(parseFloat(input.value)))) {
            isValid = false;
            input.classList.add('invalid');
            // console.warn(`Campo obrigatório não preenchido ou inválido: ${input.id || input.name}`);
        }
    });
    if (!isValid) {
       displayGlobalMessage('Por favor, preencha todos os campos obrigatórios destacados.', 'error');
    }
    return isValid;
}

/**
 * Limpa os campos de um formulário e remove classes de validação.
 * @param {HTMLFormElement} formElement - O elemento do formulário a ser limpo.
 */
function clearForm(formElement) {
    formElement.reset(); // Reseta os valores dos campos
    formElement.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
    // Limpar valores de inputs hidden, se necessário
    formElement.querySelectorAll('input[type="hidden"]').forEach(input => input.value = '');
}


/**
 * Exibe uma mensagem global flutuante.
 * @param {string} message - A mensagem a ser exibida.
 * @param {'success' | 'error' | 'info'} type - O tipo da mensagem.
 * @param {number} duration - Duração em milissegundos para a mensagem desaparecer.
 */
function displayGlobalMessage(message, type = 'info', duration = 3000) {
    let messageContainer = document.getElementById('global-message-container');
    if (!messageContainer) {
        messageContainer = document.createElement('div');
        messageContainer.id = 'global-message-container';
        // Estilos básicos (podem ser movidos para CSS)
        Object.assign(messageContainer.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            zIndex: '10000',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        });
        document.body.appendChild(messageContainer);
    }

    const messageDiv = document.createElement('div');
    messageDiv.className = `global-message message-${type}`;
    messageDiv.textContent = message;

    // Estilos básicos para a mensagem (podem ser movidos para CSS)
     Object.assign(messageDiv.style, {
        padding: '15px 20px',
        borderRadius: '5px',
        color: '#fff',
        boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
        opacity: '0',
        transform: 'translateX(100%)',
        transition: 'opacity 0.5s ease, transform 0.5s ease'
    });

    if (type === 'success') messageDiv.style.backgroundColor = '#4CAF50';
    else if (type === 'error') messageDiv.style.backgroundColor = '#f44336';
    else messageDiv.style.backgroundColor = '#2196F3';


    messageContainer.appendChild(messageDiv);

    // Animação de entrada
    setTimeout(() => {
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateX(0)';
    }, 10);


    setTimeout(() => {
        messageDiv.style.opacity = '0';
        messageDiv.style.transform = 'translateX(100%)';
        setTimeout(() => {
            messageDiv.remove();
            if (messageContainer.childElementCount === 0) {
                // messageContainer.remove(); // Opcional: remover o container se vazio
            }
        }, 500); // Tempo para a animação de saída
    }, duration);
}


// Exemplo de debounce para evitar chamadas excessivas de uma função
/**
 * Implementa a função de debounce.
 * @param {Function} func - A função a ser executada após o debounce.
 * @param {number} delay - O tempo de espera em milissegundos.
 * @returns {Function} A função "debounced".
 */
function debounce(func, delay) {
    let timeoutId;
    return function(...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

/**
 * Converte a primeira letra de uma string para maiúscula.
 * @param {string} str A string de entrada.
 * @returns {string} A string com a primeira letra maiúscula.
 */
function capitalizeFirstLetter(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}


// Inicializa o mock database se não existir no LocalStorage
async function initializeMockDatabase() {
    if (!loadDataFromLocalStorage(VEEX_DB_KEY)) {
        try {
            const response = await fetch('data/mock-database.json');
            if (!response.ok) {
                throw new Error(`Erro ao carregar mock-database.json: ${response.statusText}`);
            }
            const mockData = await response.json();
            saveDataToLocalStorage(VEEX_DB_KEY, mockData);
            console.log('Mock database inicializado no Local Storage.');
        } catch (error) {
            console.error('Falha ao inicializar mock database:', error);
        }
    }
}

// Inicializa as configurações se não existirem
async function initializeAppConfig() {
     if (!loadDataFromLocalStorage(VEEX_CONFIG_KEY)) {
        try {
            const response = await fetch('data/config.json');
             if (!response.ok) {
                throw new Error(`Erro ao carregar config.json: ${response.statusText}`);
            }
            const appConfig = await response.json();
            saveDataToLocalStorage(VEEX_CONFIG_KEY, appConfig);
            console.log('Configurações da aplicação inicializadas no Local Storage.');
        } catch (error) {
            console.error('Falha ao inicializar configurações da aplicação:', error);
        }
    }
}


// Adiciona um listener global para fechar modais com a tecla Escape
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[style*="display: flex"], .modal[style*="display: block"]');
        openModals.forEach(modal => {
            // Verifica se há um botão de fechar específico ou usa o ID do modal
            const closeButton = modal.querySelector('.close-button');
            if (closeButton && closeButton.dataset.modalId) {
                closeModal(closeButton.dataset.modalId);
            } else {
                 closeModal(modal.id);
            }
        });
    }
});

console.log('util.js carregado.');
