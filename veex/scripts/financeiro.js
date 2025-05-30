// scripts/financeiro.js

/**
 * @file Gerencia a lógica da página Financeira (entradas, saídas, saldo).
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('tabelaFinanceiro')) return;
    console.log('financeiro.js carregado e ativo.');

    const btnNovaTransacao = document.getElementById('btnNovaTransacao');
    const modalTransacao = document.getElementById('modalTransacao');
    const closeModalTransacaoBtn = document.getElementById('closeModalTransacao');
    const formTransacao = document.getElementById('formTransacao');
    const tabelaFinanceiroBody = document.getElementById('tabelaFinanceiro')?.querySelector('tbody');
    const filtroMesAno = document.getElementById('mesAnoFiltro');

    // Define o filtro de mês/ano para o mês atual por padrão
    const hoje = new Date();
    const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
    const anoAtual = hoje.getFullYear();
    if (filtroMesAno) filtroMesAno.value = `${anoAtual}-${mesAtual}`;

    // Carregar dados iniciais
    loadTransacoes();

    // Event Listeners
    if (btnNovaTransacao) {
        btnNovaTransacao.addEventListener('click', () => {
            formTransacao.reset();
            clearForm(formTransacao);
            document.getElementById('transacaoId').value = '';
            document.getElementById('modalTransacaoTitulo').textContent = 'Nova Transação';
            // Sugerir data atual
            document.getElementById('transacaoData').valueAsDate = new Date();
            showModal('modalTransacao');
        });
    }

    if (closeModalTransacaoBtn) {
        closeModalTransacaoBtn.addEventListener('click', () => closeModal('modalTransacao'));
    }

    if (formTransacao) {
        formTransacao.addEventListener('submit', handleFormTransacaoSubmit);
    }

    if (filtroMesAno) {
        filtroMesAno.addEventListener('change', loadTransacoes);
    }

    // --- Funções ---

    function handleFormTransacaoSubmit(event) {
        event.preventDefault();
        if (!validateForm(formTransacao)) return;

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) {
            displayGlobalMessage('Erro: Banco de dados não encontrado.', 'error');
            return;
        }
        if (!dbData.financeiro) dbData.financeiro = [];


        const transacaoId = document.getElementById('transacaoId').value;
        const novaTransacao = {
            id: transacaoId || generateId('fin_'),
            data: document.getElementById('transacaoData').value,
            descricao: document.getElementById('transacaoDescricao').value,
            tipo: document.getElementById('transacaoTipo').value,
            valor: parseFloat(document.getElementById('transacaoValor').value) || 0,
        };

        if (transacaoId) { // Editando
            const index = dbData.financeiro.findIndex(f => f.id === transacaoId);
            if (index > -1) {
                dbData.financeiro[index] = novaTransacao;
                displayGlobalMessage('Transação atualizada com sucesso!', 'success');
            }
        } else { // Novo
            dbData.financeiro.push(novaTransacao);
            displayGlobalMessage('Transação registrada com sucesso!', 'success');
        }

        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadTransacoes();
        closeModal('modalTransacao');
    }

    function loadTransacoes() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        let transacoes = (dbData && dbData.financeiro) ? dbData.financeiro : [];

        const filtro = filtroMesAno?.value; // YYYY-MM
        if (filtro) {
            transacoes = transacoes.filter(t => t.data.startsWith(filtro));
        }
        
        transacoes.sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recentes primeiro

        renderTransacoes(transacoes);
        calculateAndDisplayResumoFinanceiro(transacoes); // Passa as transações filtradas
    }

    function renderTransacoes(transacoes) {
        if (!tabelaFinanceiroBody) return;
        tabelaFinanceiroBody.innerHTML = '';

        if (transacoes.length === 0) {
            tabelaFinanceiroBody.innerHTML = '<tr><td colspan="5">Nenhuma transação encontrada para este período.</td></tr>';
            return;
        }

        transacoes.forEach(transacao => {
            const tr = document.createElement('tr');
            tr.dataset.id = transacao.id;
            tr.className = transacao.tipo === 'receita' ? 'linha-receita' : 'linha-despesa';
            const dataFormatada = new Date(transacao.data + 'T00:00:00').toLocaleDateString('pt-BR'); // Ajuste para evitar problemas de fuso

            tr.innerHTML = `
                <td data-label="Data">${dataFormatada}</td>
                <td data-label="Descrição">${transacao.descricao}</td>
                <td data-label="Tipo">${capitalizeFirstLetter(transacao.tipo)}</td>
                <td data-label="Valor (R$)">${formatCurrency(transacao.valor)}</td>
                <td data-label="Ações">
                    <button class="btn btn-secondary btn-sm btn-edit-transacao">
                        <img src="assets/icons/edit.svg" alt="Editar" class="icon icon-sm"> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-transacao">
                        <img src="assets/icons/delete.svg" alt="Excluir" class="icon icon-sm"> Excluir
                    </button>
                </td>
            `;
            tr.classList.add('fade-in');
            tabelaFinanceiroBody.appendChild(tr);
        });

        addTableActionListeners();
    }
    
    function calculateAndDisplayResumoFinanceiro(transacoesDoPeriodo) {
        let totalReceitas = 0;
        let totalDespesas = 0;

        transacoesDoPeriodo.forEach(t => {
            if (t.tipo === 'receita') {
                totalReceitas += t.valor;
            } else if (t.tipo === 'despesa') {
                totalDespesas += t.valor;
            }
        });
        const saldo = totalReceitas - totalDespesas;

        updateKPI('financeiro-receitas', totalReceitas);
        updateKPI('financeiro-despesas', totalDespesas);
        updateKPI('financeiro-saldo', saldo);
    }


    function addTableActionListeners() {
        tabelaFinanceiroBody.querySelectorAll('.btn-edit-transacao').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const transacaoId = e.target.closest('tr').dataset.id;
                editTransacao(transacaoId);
            });
        });

        tabelaFinanceiroBody.querySelectorAll('.btn-delete-transacao').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const transacaoId = e.target.closest('tr').dataset.id;
                if (confirm('Tem certeza que deseja excluir esta transação?')) {
                    deleteTransacao(transacaoId);
                }
            });
        });
    }

    function editTransacao(transacaoId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const transacao = dbData.financeiro.find(f => f.id === transacaoId);
        if (!transacao) return;

        clearForm(formTransacao);
        document.getElementById('transacaoId').value = transacao.id;
        document.getElementById('modalTransacaoTitulo').textContent = 'Editar Transação';
        document.getElementById('transacaoData').value = transacao.data;
        document.getElementById('transacaoDescricao').value = transacao.descricao;
        document.getElementById('transacaoTipo').value = transacao.tipo;
        document.getElementById('transacaoValor').value = transacao.valor;
        showModal('modalTransacao');
    }

    function deleteTransacao(transacaoId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        dbData.financeiro = dbData.financeiro.filter(f => f.id !== transacaoId);
        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadTransacoes();
        displayGlobalMessage('Transação excluída com sucesso!', 'success');
    }
});
