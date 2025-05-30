// scripts/simulador.js

/**
 * @file Gerencia a lógica da página do Simulador de Preços e Margens.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('formSimulador')) return;
    console.log('simulador.js carregado e ativo.');

    const formSimulador = document.getElementById('formSimulador');
    const selectModelo = document.getElementById('simModeloSelecionado');
    const inputCustoTotal = document.getElementById('simCustoTotalProduto');
    const inputMargens = document.getElementById('simMargens');
    const btnSimular = document.getElementById('btnSimularPrecos');
    const resultadosContainer = document.getElementById('resultadosSimuladorContainer');

    // Carregar modelos no select
    loadModelosParaSimulador();

    // Event Listeners
    if (selectModelo) {
        selectModelo.addEventListener('change', handleSimModeloChange);
    }

    if (btnSimular) {
        btnSimular.addEventListener('click', simularPrecos);
    }

    function loadModelosParaSimulador() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData || !dbData.modelos || !selectModelo) return;

        selectModelo.innerHTML = '<option value="">Simular com custo manual ou selecione um modelo</option>';
        dbData.modelos.forEach(modelo => {
            const option = document.createElement('option');
            option.value = modelo.id;
            option.textContent = `${modelo.nome} (Ref: ${modelo.referencia || 'N/A'})`;
            selectModelo.appendChild(option);
        });
    }
    
    // Função auxiliar (pode ser movida para util.js se usada em mais lugares ou integrada com a da calculadora/histórico)
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


    function handleSimModeloChange() {
        const modeloId = selectModelo.value;
        if (!modeloId) {
            inputCustoTotal.value = '';
            inputCustoTotal.readOnly = false;
            return;
        }

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) return;
        const modelo = dbData.modelos.find(m => m.id === modeloId);
        if (!modelo) return;

        const custoTotalModelo = calcularCustoCompletoModelo(modelo, dbData);
        inputCustoTotal.value = custoTotalModelo.toFixed(2);
        inputCustoTotal.readOnly = true;
    }

    function simularPrecos() {
        const custoProduto = parseFloat(inputCustoTotal.value);
        const margensStr = inputMargens.value;

        if (isNaN(custoProduto) || custoProduto < 0) {
            displayGlobalMessage('Por favor, insira um custo de produto válido.', 'error');
            return;
        }
        if (!margensStr.trim()) {
            displayGlobalMessage('Por favor, insira as margens para simulação.', 'error');
            return;
        }

        const margensArray = margensStr.split(',')
            .map(m => parseFloat(m.trim()))
            .filter(m => !isNaN(m) && m >= 0);

        if (margensArray.length === 0) {
            displayGlobalMessage('Nenhuma margem válida foi inserida para simulação.', 'error');
            return;
        }
        
        resultadosContainer.innerHTML = ''; // Limpa resultados anteriores
        resultadosContainer.classList.add('dashboard-grid'); // Para layout em cards

        margensArray.forEach(margem => {
            const valorLucro = custoProduto * (margem / 100);
            const precoVenda = custoProduto + valorLucro;

            const cardResult = document.createElement('div');
            cardResult.className = 'card fade-in';
            cardResult.innerHTML = `
                <div class="card-header">
                    <h2 class="card-title">Margem: ${margem.toFixed(1)}%</h2>
                </div>
                <div class="card-body">
                    <p>Custo do Produto: <strong>${formatCurrency(custoProduto)}</strong></p>
                    <p>Preço de Venda: <strong>${formatCurrency(precoVenda)}</strong></p>
                    <p>Lucro por Unidade: <strong>${formatCurrency(valorLucro)}</strong></p>
                </div>
            `;
            resultadosContainer.appendChild(cardResult);
        });
    }
});
