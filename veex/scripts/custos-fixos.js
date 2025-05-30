// scripts/custos-fixos.js

/**
 * @file Gerencia a lógica da página de Custos Fixos.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de custos fixos
    if (!document.getElementById('tabelaCustosFixos') && !document.getElementById('btnNovoCustoFixo')) {
        return;
    }
    console.log('custos-fixos.js carregado e ativo.');

    const btnNovoCustoFixo = document.getElementById('btnNovoCustoFixo');
    const modalCustoFixo = document.getElementById('modalCustoFixo');
    const closeModalCustoFixoBtn = document.getElementById('closeModalCustoFixo');
    const formCustoFixo = document.getElementById('formCustoFixo');
    const tabelaCustosFixosBody = document.getElementById('tabelaCustosFixos')?.querySelector('tbody');
    const producaoMensalInput = document.getElementById('producaoMensalPrevista');
    const totalCustosFixosDisplay = document.getElementById('totalCustosFixos');
    const custoFixoPorParDisplay = document.getElementById('custoFixoPorPar');


    // Carregar dados iniciais e configurações
    loadConfigAndCustosFixos();


    // Event Listeners
    if (btnNovoCustoFixo) {
        btnNovoCustoFixo.addEventListener('click', () => {
            formCustoFixo.reset();
            clearForm(formCustoFixo);
            document.getElementById('custoFixoId').value = '';
            document.getElementById('modalCustoFixoTitulo').textContent = 'Novo Custo Fixo';
            showModal('modalCustoFixo');
        });
    }

    if (closeModalCustoFixoBtn) {
        closeModalCustoFixoBtn.addEventListener('click', () => closeModal('modalCustoFixo'));
    }

    if (formCustoFixo) {
        formCustoFixo.addEventListener('submit', handleFormCustoFixoSubmit);
    }

    if (producaoMensalInput) {
        producaoMensalInput.addEventListener('change', handleProducaoMensalChange);
        producaoMensalInput.addEventListener('keyup', debounce(handleProducaoMensalChange, 500));
    }


    // --- Funções ---

    function loadConfigAndCustosFixos() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (dbData && dbData.config && producaoMensalInput) {
            producaoMensalInput.value = dbData.config.producaoMensalPrevista || 100;
        }
        loadCustosFixos(); // Isso também chamará o cálculo
    }

    function handleProducaoMensalChange() {
        const novaProducao = parseInt(producaoMensalInput.value, 10);
        if (isNaN(novaProducao) || novaProducao <= 0) {
            displayGlobalMessage('Produção mensal prevista deve ser um número maior que zero.', 'error');
            // Reverter para o valor anterior ou um default
            // producaoMensalInput.value = loadDataFromLocalStorage(VEEX_DB_KEY)?.config?.producaoMensalPrevista || 100;
            // return; // Não salva se inválido, mas recalcula com o valor inválido (ou último válido)
        }

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (dbData && dbData.config) {
            dbData.config.producaoMensalPrevista = novaProducao > 0 ? novaProducao : (dbData.config.producaoMensalPrevista || 100) ;
            saveDataToLocalStorage(VEEX_DB_KEY, dbData);
            displayGlobalMessage('Produção mensal prevista atualizada.', 'info', 2000);
        }
        calculateAndDisplayTotals(); // Recalcula com o novo valor
    }


    function handleFormCustoFixoSubmit(event) {
        event.preventDefault();
        if (!validateForm(formCustoFixo)) return;

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) {
            displayGlobalMessage('Erro: Banco de dados não encontrado.', 'error');
            return;
        }

        const custoFixoId = document.getElementById('custoFixoId').value;
        const novoCustoFixo = {
            id: custoFixoId || generateId('cf_'),
            descricao: document.getElementById('custoFixoDescricao').value,
            valor: parseFloat(document.getElementById('custoFixoValor').value) || 0,
        };

        if (custoFixoId) { // Editando
            const index = dbData.custosFixos.findIndex(cf => cf.id === custoFixoId);
            if (index > -1) {
                dbData.custosFixos[index] = novoCustoFixo;
                displayGlobalMessage('Custo fixo atualizado com sucesso!', 'success');
            }
        } else { // Novo
            dbData.custosFixos.push(novoCustoFixo);
            displayGlobalMessage('Custo fixo cadastrado com sucesso!', 'success');
        }

        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadCustosFixos();
        closeModal('modalCustoFixo');
    }

    function loadCustosFixos() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData || !dbData.custosFixos) {
            if(tabelaCustosFixosBody) tabelaCustosFixosBody.innerHTML = '<tr><td colspan="3">Nenhum custo fixo cadastrado.</td></tr>';
            calculateAndDisplayTotals([]); // Calcula totais mesmo com array vazio
            return;
        }
        renderCustosFixos(dbData.custosFixos);
        calculateAndDisplayTotals(dbData.custosFixos);
    }

    function renderCustosFixos(custosFixos) {
        if (!tabelaCustosFixosBody) return;
        tabelaCustosFixosBody.innerHTML = ''; // Limpa antes de renderizar

        if (custosFixos.length === 0) {
            tabelaCustosFixosBody.innerHTML = '<tr><td colspan="3">Nenhum custo fixo cadastrado.</td></tr>';
            return;
        }

        custosFixos.forEach(custoFixo => {
            const tr = document.createElement('tr');
            tr.dataset.id = custoFixo.id;
            tr.innerHTML = `
                <td data-label="Descrição">${custoFixo.descricao}</td>
                <td data-label="Valor Mensal (R$)">${formatCurrency(custoFixo.valor)}</td>
                <td data-label="Ações">
                    <button class="btn btn-secondary btn-sm btn-edit-custofixo">
                        <img src="assets/icons/edit.svg" alt="Editar" class="icon icon-sm"> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-custofixo">
                        <img src="assets/icons/delete.svg" alt="Excluir" class="icon icon-sm"> Excluir
                    </button>
                </td>
            `;
            tr.classList.add('fade-in');
            tabelaCustosFixosBody.appendChild(tr);
        });

        addTableActionListeners();
    }

    function addTableActionListeners() {
        tabelaCustosFixosBody.querySelectorAll('.btn-edit-custofixo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const custoFixoId = e.target.closest('tr').dataset.id;
                editCustoFixo(custoFixoId);
            });
        });

        tabelaCustosFixosBody.querySelectorAll('.btn-delete-custofixo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const custoFixoId = e.target.closest('tr').dataset.id;
                if (confirm('Tem certeza que deseja excluir este custo fixo?')) {
                    deleteCustoFixo(custoFixoId);
                }
            });
        });
    }

    function editCustoFixo(custoFixoId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const custoFixo = dbData.custosFixos.find(cf => cf.id === custoFixoId);
        if (!custoFixo) return;

        clearForm(formCustoFixo);
        document.getElementById('custoFixoId').value = custoFixo.id;
        document.getElementById('modalCustoFixoTitulo').textContent = 'Editar Custo Fixo';
        document.getElementById('custoFixoDescricao').value = custoFixo.descricao;
        document.getElementById('custoFixoValor').value = custoFixo.valor;

        showModal('modalCustoFixo');
    }

    function deleteCustoFixo(custoFixoId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        dbData.custosFixos = dbData.custosFixos.filter(cf => cf.id !== custoFixoId);
        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadCustosFixos(); // Recarrega a lista e recalcula os totais
        displayGlobalMessage('Custo fixo excluído com sucesso!', 'success');
    }

    function calculateAndDisplayTotals(custosFixosArray = null) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const custos = custosFixosArray !== null ? custosFixosArray : (dbData?.custosFixos || []);

        const totalMensal = custos.reduce((sum, cf) => sum + (parseFloat(cf.valor) || 0), 0);

        const producaoMensal = parseInt(producaoMensalInput?.value, 10) || (dbData?.config?.producaoMensalPrevista || 1);
        // Evitar divisão por zero ou produção inválida para o cálculo
        const custoDiluido = (producaoMensal > 0 && totalMensal > 0) ? totalMensal / producaoMensal : 0;

        if (totalCustosFixosDisplay) {
            totalCustosFixosDisplay.textContent = formatCurrency(totalMensal);
        }
        if (custoFixoPorParDisplay) {
            custoFixoPorParDisplay.textContent = formatCurrency(custoDiluido);
        }
    }
});
