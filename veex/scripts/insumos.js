// scripts/insumos.js

/**
 * @file Gerencia a lógica da página de Insumos (cadastro, estoque, etc.).
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de insumos
    if (!document.getElementById('tabelaInsumos') && !document.getElementById('btnNovoInsumo')) {
        return;
    }
    console.log('insumos.js carregado e ativo.');

    const btnNovoInsumo = document.getElementById('btnNovoInsumo');
    const modalInsumo = document.getElementById('modalInsumo');
    const closeModalInsumoBtn = document.getElementById('closeModalInsumo');
    const formInsumo = document.getElementById('formInsumo');
    const tabelaInsumosBody = document.getElementById('tabelaInsumos')?.querySelector('tbody');

    // Carregar dados iniciais
    loadInsumos();

    // Event Listeners
    if (btnNovoInsumo) {
        btnNovoInsumo.addEventListener('click', () => {
            formInsumo.reset();
            clearForm(formInsumo);
            document.getElementById('insumoId').value = '';
            document.getElementById('modalInsumoTitulo').textContent = 'Novo Insumo';
            showModal('modalInsumo');
        });
    }

    if (closeModalInsumoBtn) {
        closeModalInsumoBtn.addEventListener('click', () => closeModal('modalInsumo'));
    }

    if (formInsumo) {
        formInsumo.addEventListener('submit', handleFormInsumoSubmit);
    }

    // --- Funções ---

    function handleFormInsumoSubmit(event) {
        event.preventDefault();
        if (!validateForm(formInsumo)) return;

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) {
            displayGlobalMessage('Erro: Banco de dados não encontrado.', 'error');
            return;
        }

        const insumoId = document.getElementById('insumoId').value;
        const novoInsumo = {
            id: insumoId || generateId('ins_'),
            nome: document.getElementById('insumoNome').value,
            unidade: document.getElementById('insumoUnidade').value,
            preco: parseFloat(document.getElementById('insumoPreco').value) || 0,
            estoqueAtual: parseFloat(document.getElementById('insumoEstoqueAtual').value) || 0,
            estoqueMinimo: parseFloat(document.getElementById('insumoEstoqueMinimo').value) || 0,
            rendimento: parseFloat(document.getElementById('insumoRendimento').value) || null
        };

        if (insumoId) { // Editando
            const index = dbData.insumos.findIndex(i => i.id === insumoId);
            if (index > -1) {
                dbData.insumos[index] = novoInsumo;
                displayGlobalMessage('Insumo atualizado com sucesso!', 'success');
            }
        } else { // Novo
            dbData.insumos.push(novoInsumo);
            displayGlobalMessage('Insumo cadastrado com sucesso!', 'success');
        }

        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadInsumos();
        closeModal('modalInsumo');
    }

    function loadInsumos() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData || !dbData.insumos) {
            tabelaInsumosBody.innerHTML = '<tr><td colspan="7">Nenhum insumo cadastrado.</td></tr>';
            return;
        }
        renderInsumos(dbData.insumos);
    }

    function renderInsumos(insumos) {
        if (!tabelaInsumosBody) return;
        tabelaInsumosBody.innerHTML = ''; // Limpa antes de renderizar

        if (insumos.length === 0) {
            tabelaInsumosBody.innerHTML = '<tr><td colspan="7">Nenhum insumo cadastrado.</td></tr>';
            return;
        }

        insumos.forEach(insumo => {
            const tr = document.createElement('tr');
            tr.dataset.id = insumo.id;
            tr.id = `insumo-${insumo.id}`; // Para linkagem de alertas do dashboard

            const estoqueAtual = parseFloat(insumo.estoqueAtual) || 0;
            const estoqueMinimo = parseFloat(insumo.estoqueMinimo) || 0;
            let estoqueClasse = '';
            if (estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo) {
                estoqueClasse = 'estoque-baixo'; // Alerta visual para estoque baixo
            } else if (estoqueMinimo > 0 && estoqueAtual <= estoqueMinimo * 1.2) { // Ex: 20% acima do mínimo
                estoqueClasse = 'estoque-atencao'; // Atenção visual para estoque se aproximando do mínimo
            }


            tr.innerHTML = `
                <td data-label="Nome">${insumo.nome}</td>
                <td data-label="Unidade">${insumo.unidade}</td>
                <td data-label="Preço (R$)">${formatCurrency(insumo.preco)}</td>
                <td data-label="Estoque Atual" class="${estoqueClasse}">${estoqueAtual}</td>
                <td data-label="Estoque Mínimo">${estoqueMinimo > 0 ? estoqueMinimo : '-'}</td>
                <td data-label="Rendimento">${insumo.rendimento || '-'}</td>
                <td data-label="Ações">
                    <button class="btn btn-secondary btn-sm btn-edit-insumo">
                        <img src="assets/icons/edit.svg" alt="Editar" class="icon icon-sm"> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-insumo">
                        <img src="assets/icons/delete.svg" alt="Excluir" class="icon icon-sm"> Excluir
                    </button>
                </td>
            `;
            tr.classList.add('fade-in');
            tabelaInsumosBody.appendChild(tr);
        });

        // Adicionar listeners para botões de editar/excluir nas linhas
        addTableActionListeners();
    }

    function addTableActionListeners() {
        tabelaInsumosBody.querySelectorAll('.btn-edit-insumo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const insumoId = e.target.closest('tr').dataset.id;
                editInsumo(insumoId);
            });
        });

        tabelaInsumosBody.querySelectorAll('.btn-delete-insumo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const insumoId = e.target.closest('tr').dataset.id;
                // Adicionar verificação se o insumo está em uso por algum modelo
                if (isInsumoEmUso(insumoId)) {
                     displayGlobalMessage('Este insumo está em uso por um ou mais modelos e não pode ser excluído.', 'error', 5000);
                    return;
                }

                if (confirm('Tem certeza que deseja excluir este insumo?')) {
                    deleteInsumo(insumoId);
                }
            });
        });
    }
    
    function isInsumoEmUso(insumoId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (dbData && dbData.modelos) {
            return dbData.modelos.some(modelo => 
                modelo.insumos && modelo.insumos.some(itemInsumo => itemInsumo.insumoId === insumoId)
            );
        }
        return false;
    }


    function editInsumo(insumoId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const insumo = dbData.insumos.find(i => i.id === insumoId);
        if (!insumo) return;

        clearForm(formInsumo);
        document.getElementById('insumoId').value = insumo.id;
        document.getElementById('modalInsumoTitulo').textContent = 'Editar Insumo';
        document.getElementById('insumoNome').value = insumo.nome;
        document.getElementById('insumoUnidade').value = insumo.unidade;
        document.getElementById('insumoPreco').value = insumo.preco;
        document.getElementById('insumoEstoqueAtual').value = insumo.estoqueAtual;
        document.getElementById('insumoEstoqueMinimo').value = insumo.estoqueMinimo;
        document.getElementById('insumoRendimento').value = insumo.rendimento || '';

        showModal('modalInsumo');
    }

    function deleteInsumo(insumoId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        dbData.insumos = dbData.insumos.filter(i => i.id !== insumoId);
        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadInsumos();
        displayGlobalMessage('Insumo excluído com sucesso!', 'success');
    }
});
