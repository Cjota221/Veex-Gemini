// scripts/modelos.js

/**
 * @file Gerencia a lógica da página de Modelos (cadastro, listagem, etc.).
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página de modelos
    if (!document.getElementById('listaModelos') && !document.getElementById('btnNovoModelo')) {
        return;
    }
    console.log('modelos.js carregado e ativo.');

    const btnNovoModelo = document.getElementById('btnNovoModelo');
    const modalModelo = document.getElementById('modalModelo');
    const closeModalModeloBtn = document.getElementById('closeModalModelo');
    const formModelo = document.getElementById('formModelo');
    const listaModelosContainer = document.getElementById('listaModelos');
    const btnAddInsumoModelo = document.getElementById('btnAddInsumoModelo');
    const insumosModeloContainer = document.getElementById('insumosModeloContainer');
    let insumosDisponiveis = []; // Cache dos insumos carregados

    // Carregar dados iniciais
    loadModelos();
    loadInsumosParaSelecao(); // Carrega insumos para o formulário

    // Event Listeners
    if (btnNovoModelo) {
        btnNovoModelo.addEventListener('click', () => {
            formModelo.reset();
            clearForm(formModelo); // Limpa validações e campos hidden
            document.getElementById('modeloId').value = '';
            document.getElementById('modalModeloTitulo').textContent = 'Novo Modelo';
            insumosModeloContainer.innerHTML = ''; // Limpa insumos do formulário
            resetCalculosEstimadosModelo();
            showModal('modalModelo');
        });
    }

    if (closeModalModeloBtn) {
        closeModalModeloBtn.addEventListener('click', () => closeModal('modalModelo'));
    }

    if (formModelo) {
        formModelo.addEventListener('submit', handleFormModeloSubmit);
    }

    if (btnAddInsumoModelo) {
        btnAddInsumoModelo.addEventListener('click', adicionarCampoInsumoModelo);
    }

    if (insumosModeloContainer) {
        insumosModeloContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('btn-remover-insumo-modelo')) {
                event.target.closest('.insumo-item-form').remove();
                calcularCustoEstimadoModelo(); // Recalcula ao remover
            }
        });
        insumosModeloContainer.addEventListener('change', (event) => {
            if (event.target.matches('select, input[type="number"]')) {
                calcularCustoEstimadoModelo(); // Recalcula ao mudar insumo ou quantidade
            }
        });
    }
    
    document.getElementById('modeloMargemLucro')?.addEventListener('input', calcularCustoEstimadoModelo);


    // --- Funções ---

    async function loadInsumosParaSelecao() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (dbData && dbData.insumos) {
            insumosDisponiveis = dbData.insumos;
        } else {
            insumosDisponiveis = [];
            console.warn('Nenhum insumo encontrado no DB para seleção.');
        }
    }

    function adicionarCampoInsumoModelo(insumoPredefinido = null) {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'insumo-item-form';

        const selectInsumo = document.createElement('select');
        selectInsumo.className = 'insumo-select';
        selectInsumo.innerHTML = '<option value="">Selecione o Insumo</option>';
        insumosDisponiveis.forEach(insumo => {
            const option = document.createElement('option');
            option.value = insumo.id;
            option.textContent = `${insumo.nome} (${insumo.unidade}) - ${formatCurrency(insumo.preco)}`;
            if (insumoPredefinido && insumoPredefinido.insumoId === insumo.id) {
                option.selected = true;
            }
            selectInsumo.appendChild(option);
        });

        const inputQuantidade = document.createElement('input');
        inputQuantidade.type = 'number';
        inputQuantidade.className = 'insumo-quantidade';
        inputQuantidade.placeholder = 'Qtd.';
        inputQuantidade.min = '0.01';
        inputQuantidade.step = '0.01';
        inputQuantidade.value = (insumoPredefinido && insumoPredefinido.quantidade) ? insumoPredefinido.quantidade : '1';

        const btnRemover = document.createElement('button');
        btnRemover.type = 'button';
        btnRemover.className = 'btn btn-danger btn-sm btn-remover-insumo-modelo';
        btnRemover.innerHTML = '&times;'; // ou um ícone

        itemDiv.appendChild(selectInsumo);
        itemDiv.appendChild(inputQuantidade);
        itemDiv.appendChild(btnRemover);
        insumosModeloContainer.appendChild(itemDiv);
    }
    
    function resetCalculosEstimadosModelo() {
        document.getElementById('modeloCustoEstimado').textContent = formatCurrency(0);
        document.getElementById('modeloPrecoSugerido').textContent = formatCurrency(0);
    }

    function calcularCustoEstimadoModelo() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) return;

        let custoInsumosTotal = 0;
        const itensInsumoForm = insumosModeloContainer.querySelectorAll('.insumo-item-form');
        itensInsumoForm.forEach(item => {
            const select = item.querySelector('.insumo-select');
            const inputQtd = item.querySelector('.insumo-quantidade');
            const insumoId = select.value;
            const quantidade = parseFloat(inputQtd.value) || 0;

            if (insumoId && quantidade > 0) {
                const insumoDetalhe = insumosDisponiveis.find(i => i.id === insumoId);
                if (insumoDetalhe) {
                    custoInsumosTotal += (parseFloat(insumoDetalhe.preco) || 0) * quantidade;
                }
            }
        });
        
        // Adicionar Custo Fixo Diluído e Custos Variáveis
        const totalCustosFixosMensal = dbData.custosFixos.reduce((sum, cf) => sum + parseFloat(cf.valor), 0);
        const producaoMensal = dbData.config?.producaoMensalPrevista || 100;
        const custoFixoPorPar = producaoMensal > 0 ? totalCustosFixosMensal / producaoMensal : 0;
        
        const totalCustosVariaveisUnidade = dbData.custosVariaveis.reduce((sum, cv) => sum + parseFloat(cv.valor), 0);
        
        const custoTotalProduto = custoInsumosTotal + custoFixoPorPar + totalCustosVariaveisUnidade;
        
        document.getElementById('modeloCustoEstimado').textContent = formatCurrency(custoTotalProduto);

        const margemLucro = parseFloat(document.getElementById('modeloMargemLucro').value) || 0;
        const precoSugerido = custoTotalProduto * (1 + margemLucro / 100);
        document.getElementById('modeloPrecoSugerido').textContent = formatCurrency(precoSugerido);
        
        return { custoTotalProduto, precoSugerido };
    }


    function handleFormModeloSubmit(event) {
        event.preventDefault();
        if (!validateForm(formModelo)) return;

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) {
            displayGlobalMessage('Erro: Banco de dados não encontrado.', 'error');
            return;
        }

        const modeloId = document.getElementById('modeloId').value;
        const { custoTotalProduto, precoSugerido } = calcularCustoEstimadoModelo(); // Pega os valores calculados

        const insumosDoModelo = [];
        insumosModeloContainer.querySelectorAll('.insumo-item-form').forEach(item => {
            const insumoIdSelected = item.querySelector('.insumo-select').value;
            const quantidade = parseFloat(item.querySelector('.insumo-quantidade').value);
            if (insumoIdSelected && quantidade > 0) {
                insumosDoModelo.push({ insumoId: insumoIdSelected, quantidade: quantidade });
            }
        });
        
        const novoModelo = {
            id: modeloId || generateId('mod_'),
            nome: document.getElementById('modeloNome').value,
            referencia: document.getElementById('modeloReferencia').value,
            imagemUrl: document.getElementById('modeloImagem').value || 'assets/images/modelo-placeholder.png',
            insumos: insumosDoModelo,
            margemLucro: parseFloat(document.getElementById('modeloMargemLucro').value) || 30,
            // Opcional: armazenar o custo e preço calculados no momento do cadastro
            // custoCalculado: custoTotalProduto,
            // precoSugeridoCalculado: precoSugerido
        };

        if (modeloId) { // Editando
            const index = dbData.modelos.findIndex(m => m.id === modeloId);
            if (index > -1) {
                dbData.modelos[index] = novoModelo;
                displayGlobalMessage('Modelo atualizado com sucesso!', 'success');
            }
        } else { // Novo
            dbData.modelos.push(novoModelo);
            displayGlobalMessage('Modelo cadastrado com sucesso!', 'success');
        }

        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadModelos();
        closeModal('modalModelo');
    }

    function loadModelos() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData || !dbData.modelos) {
            listaModelosContainer.innerHTML = '<p>Nenhum modelo cadastrado.</p>';
            return;
        }
        
        renderModelos(dbData.modelos, dbData); // Passa dbData para cálculos
    }

    function renderModelos(modelos, dbData) {
        listaModelosContainer.innerHTML = ''; // Limpa antes de renderizar

        if (modelos.length === 0) {
            listaModelosContainer.innerHTML = '<p>Nenhum modelo cadastrado.</p>';
            return;
        }

        // Calcula o custo fixo por par
        const totalCustosFixosMensal = dbData.custosFixos.reduce((sum, cf) => sum + parseFloat(cf.valor), 0);
        const producaoMensal = dbData.config?.producaoMensalPrevista || 100;
        const custoFixoPorPar = producaoMensal > 0 ? totalCustosFixosMensal / producaoMensal : 0;
        // Calcula o total de custos variáveis por unidade
        const totalCustosVariaveisUnidade = dbData.custosVariaveis.reduce((sum, cv) => sum + parseFloat(cv.valor), 0);

        modelos.forEach(modelo => {
            let custoInsumosModelo = 0;
            if (modelo.insumos && Array.isArray(modelo.insumos)) {
                modelo.insumos.forEach(insumoModelo => {
                    const insumoDetalhe = dbData.insumos.find(i => i.id === insumoModelo.insumoId);
                    if (insumoDetalhe) {
                        custoInsumosModelo += (parseFloat(insumoDetalhe.preco) || 0) * (parseFloat(insumoModelo.quantidade) || 0);
                    }
                });
            }
            const custoTotalModeloCard = custoInsumosModelo + custoFixoPorPar + totalCustosVariaveisUnidade;
            const precoSugeridoCard = custoTotalModeloCard * (1 + (parseFloat(modelo.margemLucro) || 30) / 100);

            const card = document.createElement('div');
            card.className = 'card modelo-card fade-in';
            card.dataset.id = modelo.id;
            card.innerHTML = `
                <img src="${modelo.imagemUrl || 'assets/images/modelo-placeholder.png'}" alt="${modelo.nome}" class="modelo-imagem">
                <div class="card-body">
                    <h3 class="card-title">${modelo.nome}</h3>
                    <p>Ref: ${modelo.referencia || 'N/A'}</p>
                    <p class="modelo-custo">Custo Total: ${formatCurrency(custoTotalModeloCard)}</p>
                    <p class="modelo-preco">Preço Sugerido (${modelo.margemLucro}%): ${formatCurrency(precoSugeridoCard)}</p>
                </div>
                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm btn-edit-modelo">
                        <img src="assets/icons/edit.svg" alt="Editar" class="icon icon-sm"> Editar
                    </button>
                    <button class="btn btn-danger btn-sm btn-delete-modelo">
                        <img src="assets/icons/delete.svg" alt="Excluir" class="icon icon-sm"> Excluir
                    </button>
                </div>
            `;
            listaModelosContainer.appendChild(card);
        });

        // Adicionar listeners para botões de editar/excluir nos cards
        addCardActionListeners();
    }

    function addCardActionListeners() {
        listaModelosContainer.querySelectorAll('.btn-edit-modelo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeloId = e.target.closest('.modelo-card').dataset.id;
                editModelo(modeloId);
            });
        });

        listaModelosContainer.querySelectorAll('.btn-delete-modelo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const modeloId = e.target.closest('.modelo-card').dataset.id;
                if (confirm('Tem certeza que deseja excluir este modelo?')) {
                    deleteModelo(modeloId);
                }
            });
        });
    }

    function editModelo(modeloId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        const modelo = dbData.modelos.find(m => m.id === modeloId);
        if (!modelo) return;

        clearForm(formModelo);
        document.getElementById('modeloId').value = modelo.id;
        document.getElementById('modalModeloTitulo').textContent = 'Editar Modelo';
        document.getElementById('modeloNome').value = modelo.nome;
        document.getElementById('modeloReferencia').value = modelo.referencia || '';
        document.getElementById('modeloImagem').value = modelo.imagemUrl || '';
        document.getElementById('modeloMargemLucro').value = modelo.margemLucro || 30;

        insumosModeloContainer.innerHTML = ''; // Limpa insumos anteriores
        if (modelo.insumos && Array.isArray(modelo.insumos)) {
            modelo.insumos.forEach(insumo => {
                adicionarCampoInsumoModelo(insumo);
            });
        }
        calcularCustoEstimadoModelo(); // Calcula e exibe custos ao abrir edição
        showModal('modalModelo');
    }

    function deleteModelo(modeloId) {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        dbData.modelos = dbData.modelos.filter(m => m.id !== modeloId);
        saveDataToLocalStorage(VEEX_DB_KEY, dbData);
        loadModelos();
        displayGlobalMessage('Modelo excluído com sucesso!', 'success');
    }
});
