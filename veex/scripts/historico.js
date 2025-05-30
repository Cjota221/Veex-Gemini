// scripts/historico.js

/**
 * @file Gerencia a lógica da página de Histórico de Produção.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('tabelaHistorico')) return;
    console.log('historico.js carregado e ativo.');

    const btnNovaProducao = document.getElementById('btnNovaProducao');
    const modalProducao = document.getElementById('modalProducao');
    const closeModalProducaoBtn = document.getElementById('closeModalProducao');
    const formProducao = document.getElementById('formProducao');
    const tabelaHistoricoBody = document.getElementById('tabelaHistorico')?.querySelector('tbody');
    const selectProducaoModelo = document.getElementById('producaoModelo');
    const filtroModelo = document.getElementById('filtroHistoricoModelo');
    const filtroData = document.getElementById('filtroHistoricoData');
    const custoEstimadoDisplay = document.getElementById('producaoCustoEstimado');


    // Carregar dados iniciais e filtros
    loadModelosParaSelects();
    loadHistorico();
    
    // Define filtro de data para o mês atual por padrão (se existir)
    if (filtroData) {
        const hoje = new Date();
        const mesAtual = (hoje.getMonth() + 1).toString().padStart(2, '0');
        const anoAtual = hoje.getFullYear();
        filtroData.value = `${anoAtual}-${mesAtual}`;
    }


    // Event Listeners
    if (btnNovaProducao) {
        btnNovaProducao.addEventListener('click', () => {
            formProducao.reset();
            clearForm(formProducao);
            document.getElementById('producaoId').value = '';
            document.getElementById('modalProducaoTitulo').textContent = 'Registrar Nova Produção';
            document.getElementById('producaoData').valueAsDate = new Date(); // Sugere data atual
            custoEstimadoDisplay.value = formatCurrency(0);
            showModal('modalProducao');
        });
    }

    if (closeModalProducaoBtn) {
        closeModalProducaoBtn.addEventListener('click', () => closeModal('modalProducao'));
    }

    if (formProducao) {
        formProducao.addEventListener('submit', handleFormProducaoSubmit);
    }

    if (selectProducaoModelo) {
        selectProducaoModelo.addEventListener('change', calcularCustoEstimadoProducao);
    }
    document.getElementById('producaoQuantidade')?.addEventListener('input', calcularCustoEstimadoProducao);
    
    if (filtroModelo) filtroModelo.addEventListener('change', loadHistorico);
    if (filtroData) filtroData.addEventListener('change', loadHistorico);


    function loadModelosParaSelects() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData || !dbData.modelos) return;

        [selectProducaoModelo, filtroModelo].forEach(select => {
            if (select) {
                const currentVal = select.value;
                select.innerHTML = select === filtroModelo ? '<option value="">Todos os Modelos</option>' : '<option value="">Selecione um modelo</option>';
                dbData.modelos.forEach(modelo => {
                    const option = document.createElement('option');
                    option.value = modelo.id;
                    option.textContent = `${modelo.nome} (Ref: ${modelo.referencia || 'N/A'})`;
                    select.appendChild(option);
                });
                select.value = currentVal; // Mantem valor se já selecionado
            }
        });
    }
    
    function calcularCustoEstimadoProducao() {
        const modeloId = selectProducaoModelo.value;
        const quantidade = parseInt(document.getElementById('producaoQuantidade').value, 10);

        if (!modeloId || isNaN(quantidade) || quantidade <= 0) {
            custoEstimadoDisplay.value = formatCurrency(0);
            return;
        }

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) return;
        const modelo = dbData.modelos.find(m => m.id === modeloId);
        if (!modelo) return;

        const custoUnitarioModelo = calcularCustoCompletoModelo(modelo, dbData); // Reutiliza função da calculadora
        const custoTotalEstimado = custoUnitarioModelo * quantidade;
        custoEstimadoDisplay.value = formatCurrency(custoTotalEstimado);
    }
    
    // Função auxiliar (pode ser movida para util.js se usada em mais lugares ou integrada com a da calculadora)
    function calcularCustoCompletoModelo(modelo, dbData) {
        let custoInsumosModelo = 0;
        if (modelo.insumos && Array.isArray(modelo.insumos)) {
            modelo.insumos.forEach(insumoModelo => {
                const insumoDetalhe = dbData.insumos.find(i => i.id === insumoModelo.insumoId);
                if (insumoDetalhe) {
                    custoInsumosModelo += (parseFloat(insumoDetalhe.preco) || 0) * (parseFloat(insumoModelo.quantidade) || 0);
                }
            });
        }
        const totalCustosFixosMensal = dbData.custosFixos.reduce((sum, cf) => sum + parseFloat(cf.valor), 0);
        const producaoMensal = dbData.config?.producaoMensalPrevista || 100;
        const custoFixoPorPar = producaoMensal > 0 ? totalCustosFixosMensal / producaoMensal : 0;
        const totalCustosVariaveisUnidade = dbData.custosVariaveis.reduce((sum, cv) => sum + parseFloat(cv.valor), 0);
        return custoInsumosModelo + custoFixoPorPar + totalCustosVariaveisUnidade;
    }


    function handleFormProducaoSubmit(event) {
        event.preventDefault();
        if (!validateForm(formProducao)) return;

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) {
            displayGlobalMessage('Erro: Banco de dados não encontrado.', 'error');
            return;
        }
        if (!dbData.historicoProducao) dbData.historicoProducao = [];

        const producaoId = document.getElementById('producaoId').value;
        const modeloIdSelecionado = selectProducaoModelo.value;
        const modeloSelecionado = dbData.modelos.find(m => m.id === modeloIdSelecionado);
        const quantidadeProduzida = parseInt(document.getElementById('producaoQuantidade').value, 10);
        
        // Recalcula o custo no momento de salvar para garantir precisão
        const custoUnitarioAtual = calcularCustoCompletoModelo(modeloSelecionado, dbData);
        const custoTotalProducao = custoUnitarioAtual * quantidadeProduzida;


        const novoRegistro = {
            id: producaoId || generateId('hp_'),
            data: document.getElementById('producaoData').value,
            modeloId: modeloIdSelecionado,
            modeloNome: modeloSelecionado?.nome || 'N/A',
            referencia: modeloSelecionado?.referencia || 'N/A',
            quantidade: quantidadeProduzida,
            custoTotal: custoTotalProducao, // Salva o custo total calculado no momento
            observacoes: document.getElementById('producaoObservacoes').value || ''
        };

        if (producaoId) { // Editando
            const index = dbData.historicoProducao.findIndex(hp => hp.id === producaoId);
            if (index > -1) {
                dbData.historicoProducao[index] = novoRegistro;
                displayGlobalMessage('Registro de produção atualizado!', 'success');
            }
        } else { // Novo
            dbData.historicoProducao.push(novoRegistro);
            displayGlobalMessage('Produção registrada com sucesso!', 'success');
            // TODO: Idealmente, dar baixa no estoque de insumos aqui.
        }

        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadHistorico();
        closeModal('modalProducao');
    }

    function loadHistorico() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        let historico = (dbData && dbData.historicoProducao) ? dbData.historicoProducao : [];

        const modeloFiltrado = filtroModelo?.value;
        const dataFiltrada = filtroData?.value; // YYYY-MM

        if (modeloFiltrado) {
            historico = historico.filter(hp => hp.modeloId === modeloFiltrado);
        }
        if (dataFiltrada) {
            historico = historico.filter(hp => hp.data.startsWith(dataFiltrada));
        }
        
        historico.sort((a, b) => new Date(b.data) - new Date(a.data)); // Mais recentes primeiro

        renderHistorico(historico);
    }

    function renderHistorico(historico) {
        if (!tabelaHistoricoBody) return;
        tabelaHistoricoBody.innerHTML = '';

        if (historico.length === 0) {
            tabelaHistoricoBody.innerHTML = '<tr><td colspan="7">Nenhum registro de produção encontrado para os filtros selecionados.</td></tr>';
            return;
        }

        historico.forEach(reg => {
            const tr = document.createElement('tr');
            tr.dataset.id = reg.id;
            const dataFormatada = new Date(reg.data + 'T00:00:00').toLocaleDateString('pt-BR');

            tr.innerHTML = `
                <td data-label="Data">${dataFormatada}</td>
                <td data-label="Modelo">${reg.modeloNome}</td>
                <td data-label="Referência">${reg.referencia}</td>
                <td data-label="Qtd Produzida">${reg.quantidade}</td>
                <td data-label="Custo Total (R$)">${formatCurrency(reg.custoTotal)}</td>
                <td data-label="Observações">${reg.observacoes || '-'}</td>
                <td data-label="Ações">
                    <button class="btn btn-secondary btn-sm btn-edit-historico" title="Editar registro">
                        <img src="assets/icons/edit.svg" alt="Editar" class="icon icon-sm"> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-historico" title="Excluir registro">
                        <img src="assets/icons/delete.svg" alt="Excluir" class="icon icon-sm"> Excluir
                    </button>
                </td>
            `;
            tr.classList.add('fade-in');
            tabelaHistoricoBody.appendChild(tr);
        });

        addTableActionListeners();
    }

    function addTableActionListeners() {
        tabelaHistoricoBody.querySelectorAll('.btn-edit-historico').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const regId = e.target.closest('tr').dataset.id;
                editRegistroHistorico(regId);
            });
        });

        tabelaHistoricoBody.querySelectorAll('.btn-delete-historico').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const regId = e.target.closest('tr').dataset.id;
                if (confirm('Tem certeza que deseja excluir este registro de produção? Esta ação não pode ser desfeita.')) {
                    deleteRegistroHistorico(regId);
                }
            });
        });
    }

    function editRegistroHistorico(regId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const registro = dbData.historicoProducao.find(hp => hp.id === regId);
        if (!registro) return;

        clearForm(formProducao);
        document.getElementById('producaoId').value = registro.id;
        document.getElementById('modalProducaoTitulo').textContent = 'Editar Registro de Produção';
        document.getElementById('producaoData').value = registro.data;
        selectProducaoModelo.value = registro.modeloId;
        document.getElementById('producaoQuantidade').value = registro.quantidade;
        document.getElementById('producaoObservacoes').value = registro.observacoes || '';
        
        calcularCustoEstimadoProducao(); // Recalcula e exibe o custo estimado
        
        showModal('modalProducao');
    }

    function deleteRegistroHistorico(regId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        dbData.historicoProducao = dbData.historicoProducao.filter(hp => hp.id !== regId);
        // TODO: Idealmente, estornar a baixa do estoque de insumos aqui, se aplicável.
        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadHistorico();
        displayGlobalMessage('Registro de produção excluído com sucesso!', 'success');
    }
});
