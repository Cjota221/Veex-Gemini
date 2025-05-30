// scripts/calculadora.js

/**
 * @file Gerencia a lógica da página da Calculadora de Preço de Venda.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('formCalculadora')) return;
    console.log('calculadora.js carregado e ativo.');

    const formCalculadora = document.getElementById('formCalculadora');
    const selectModelo = document.getElementById('calcModeloSelecionado');
    const inputCustoTotal = document.getElementById('calcCustoTotalProduto');
    const inputMargemLucro = document.getElementById('calcMargemLucro');
    const btnCalcularPreco = document.getElementById('btnCalcularPreco');
    const resultadoCard = document.getElementById('resultadoCalculadora');

    // Carregar modelos no select
    loadModelosParaCalculadora();

    // Event Listeners
    if (selectModelo) {
        selectModelo.addEventListener('change', handleModeloSelecionadoChange);
    }

    if (btnCalcularPreco) {
        btnCalcularPreco.addEventListener('click', calcularEExibirPreco);
    }
    
    // Calcular automaticamente se custo ou margem mudarem
    inputCustoTotal?.addEventListener('input', debounce(calcularEExibirPreco, 300));
    inputMargemLucro?.addEventListener('input', debounce(calcularEExibirPreco, 300));


    function loadModelosParaCalculadora() {
        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData || !dbData.modelos || !selectModelo) return;

        selectModelo.innerHTML = '<option value="">Calcular custo manualmente ou selecione um modelo</option>'; // Limpa e adiciona opção padrão
        dbData.modelos.forEach(modelo => {
            const option = document.createElement('option');
            option.value = modelo.id;
            option.textContent = `${modelo.nome} (Ref: ${modelo.referencia || 'N/A'})`;
            selectModelo.appendChild(option);
        });
    }

    function handleModeloSelecionadoChange() {
        const modeloId = selectModelo.value;
        if (!modeloId) {
            inputCustoTotal.value = '';
            inputCustoTotal.readOnly = false;
            resultadoCard.style.display = 'none';
            return;
        }

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) return;

        const modelo = dbData.modelos.find(m => m.id === modeloId);
        if (!modelo) return;

        const custoTotalModelo = calcularCustoCompletoModelo(modelo, dbData);
        inputCustoTotal.value = custoTotalModelo.toFixed(2);
        inputCustoTotal.readOnly = true; // Custo vem do modelo, não editável aqui
        
        if (modelo.margemLucro) {
            inputMargemLucro.value = modelo.margemLucro;
        }

        calcularEExibirPreco(); // Calcula com o custo do modelo
    }

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

    function calcularEExibirPreco() {
        const custoTotalProduto = parseFloat(inputCustoTotal.value);
        const margemDesejada = parseFloat(inputMargemLucro.value);

        if (isNaN(custoTotalProduto) || custoTotalProduto < 0 || isNaN(margemDesejada) || margemDesejada < 0) {
            if (resultadoCard.style.display !== 'none') { // Só mostra erro se o usuário já tentou calcular
                 displayGlobalMessage('Por favor, insira valores válidos para custo e margem.', 'error');
            }
            resultadoCard.style.display = 'none';
            return;
        }

        const valorLucro = custoTotalProduto * (margemDesejada / 100);
        const precoSugerido = custoTotalProduto + valorLucro;

        document.getElementById('resCustoTotal').textContent = formatCurrency(custoTotalProduto);
        document.getElementById('resMargemAplicada').textContent = `${margemDesejada.toFixed(1)}%`;
        document.getElementById('resLucroUnitario').textContent = formatCurrency(valorLucro);
        document.getElementById('resPrecoSugerido').textContent = formatCurrency(precoSugerido);

        resultadoCard.style.display = 'block';
        resultadoCard.classList.add('fade-in');
    }
});
