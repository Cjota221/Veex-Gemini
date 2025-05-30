// scripts/custos-variaveis.js

/**
 * @file Gerencia a lógica da página de Custos Variáveis por unidade.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de custos variáveis
    if (!document.getElementById('tabelaCustosVariaveis') && !document.getElementById('btnNovoCustoVariavel')) {
        return;
    }
    console.log('custos-variaveis.js carregado e ativo.');

    const btnNovoCustoVariavel = document.getElementById('btnNovoCustoVariavel');
    const modalCustoVariavel = document.getElementById('modalCustoVariavel');
    const closeModalCustoVariavelBtn = document.getElementById('closeModalCustoVariavel');
    const formCustoVariavel = document.getElementById('formCustoVariavel');
    const tabelaCustosVariaveisBody = document.getElementById('tabelaCustosVariaveis')?.querySelector('tbody');
    const totalCustosVariaveisDisplay = document.getElementById('totalCustosVariaveis');

    // Carregar dados iniciais
    loadCustosVariaveis();

    // Event Listeners
    if (btnNovoCustoVariavel) {
        btnNovoCustoVariavel.addEventListener('click', () => {
            formCustoVariavel.reset();
            clearForm(formCustoVariavel);
            document.getElementById('custoVariavelId').value = '';
            document.getElementById('modalCustoVariavelTitulo').textContent = 'Novo Custo Variável';
            showModal('modalCustoVariavel');
        });
    }

    if (closeModalCustoVariavelBtn) {
        closeModalCustoVariavelBtn.addEventListener('click', () => closeModal('modalCustoVariavel'));
    }

    if (formCustoVariavel) {
        formCustoVariavel.addEventListener('submit', handleFormCustoVariavelSubmit);
    }

    // --- Funções ---

    function handleFormCustoVariavelSubmit(event) {
        event.preventDefault();
        if (!validateForm(formCustoVariavel)) return;

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) {
            displayGlobalMessage('Erro: Banco de dados não encontrado.', 'error');
            return;
        }

        const custoVariavelId = document.getElementById('custoVariavelId').value;
        const novoCustoVariavel = {
            id: custoVariavelId || generateId('cv_'),
            descricao: document.getElementById('custoVariavelDescricao').value,
            valor: parseFloat(document.getElementById('custoVariavelValor').value) || 0,
            obs: document.getElementById('custoVariavelObs').value || ''
        };

        if (custoVariavelId) { // Editando
            const index = dbData.custosVariaveis.findIndex(cv => cv.id === custoVariavelId);
            if (index > -1) {
                dbData.custosVariaveis[index] = novoCustoVariavel;
                displayGlobalMessage('Custo variável atualizado com sucesso!', 'success');
            }
        } else { // Novo
            dbData.custosVariaveis.push(novoCustoVariavel);
            displayGlobalMessage('Custo variável cadastrado com sucesso!', 'success');
        }

        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadCustosVariaveis();
        closeModal('modalCustoVariavel');
    }

    function loadCustosVariaveis() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData || !dbData.custosVariaveis) {
            if(tabelaCustosVariaveisBody) tabelaCustosVariaveisBody.innerHTML = '<tr><td colspan="4">Nenhum custo variável cadastrado.</td></tr>';
            calculateAndDisplayTotal([]);
            return;
        }
        renderCustosVariaveis(dbData.custosVariaveis);
        calculateAndDisplayTotal(dbData.custosVariaveis);
    }

    function renderCustosVariaveis(custosVariaveis) {
        if (!tabelaCustosVariaveisBody) return;
        tabelaCustosVariaveisBody.innerHTML = ''; // Limpa antes de renderizar

        if (custosVariaveis.length === 0) {
            tabelaCustosVariaveisBody.innerHTML = '<tr><td colspan="4">Nenhum custo variável cadastrado.</td></tr>';
            return;
        }

        custosVariaveis.forEach(custoVariavel => {
            const tr = document.createElement('tr');
            tr.dataset.id = custoVariavel.id;
            tr.innerHTML = `
                <td data-label="Descrição">${custoVariavel.descricao}</td>
                <td data-label="Valor por Unidade (R$)">${formatCurrency(custoVariavel.valor)}</td>
                <td data-label="Observação">${custoVariavel.obs || '-'}</td>
                <td data-label="Ações">
                    <button class="btn btn-secondary btn-sm btn-edit-custovariavel">
                        <img src="assets/icons/edit.svg" alt="Editar" class="icon icon-sm"> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-custovariavel">
                        <img src="assets/icons/delete.svg" alt="Excluir" class="icon icon-sm"> Excluir
                    </button>
                </td>
            `;
            tr.classList.add('fade-in');
            tabelaCustosVariaveisBody.appendChild(tr);
        });

        addTableActionListeners();
    }

    function addTableActionListeners() {
        tabelaCustosVariaveisBody.querySelectorAll('.btn-edit-custovariavel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const custoVariavelId = e.target.closest('tr').dataset.id;
                editCustoVariavel(custoVariavelId);
            });
        });

        tabelaCustosVariaveisBody.querySelectorAll('.btn-delete-custovariavel').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const custoVariavelId = e.target.closest('tr').dataset.id;
                if (confirm('Tem certeza que deseja excluir este custo variável?')) {
                    deleteCustoVariavel(custoVariavelId);
                }
            });
        });
    }

    function editCustoVariavel(custoVariavelId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const custoVariavel = dbData.custosVariaveis.find(cv => cv.id === custoVariavelId);
        if (!custoVariavel) return;

        clearForm(formCustoVariavel);
        document.getElementById('custoVariavelId').value = custoVariavel.id;
        document.getElementById('modalCustoVariavelTitulo').textContent = 'Editar Custo Variável';
        document.getElementById('custoVariavelDescricao').value = custoVariavel.descricao;
        document.getElementById('custoVariavelValor').value = custoVariavel.valor;
        document.getElementById('custoVariavelObs').value = custoVariavel.obs || '';
        showModal('modalCustoVariavel');
    }

    function deleteCustoVariavel(custoVariavelId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        dbData.custosVariaveis = dbData.custosVariaveis.filter(cv => cv.id !== custoVariavelId);
        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadCustosVariaveis(); // Recarrega a lista e recalcula o total
        displayGlobalMessage('Custo variável excluído com sucesso!', 'success');
    }

    function calculateAndDisplayTotal(custosVariaveisArray = null) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const custos = custosVariaveisArray !== null ? custosVariaveisArray : (dbData?.custosVariaveis || []);
        const totalVariavel = custos.reduce((sum, cv) => sum + (parseFloat(cv.valor) || 0), 0);

        if (totalCustosVariaveisDisplay) {
            totalCustosVariaveisDisplay.textContent = formatCurrency(totalVariavel);
        }
    }
});
