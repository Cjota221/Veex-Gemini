// scripts/dashboard.js

/**
 * @file Gerencia a lógica da página do Dashboard.
 * Carrega KPIs, resumos e gráficos.
 */

document.addEventListener('DOMContentLoaded', () => {
    // Verifica se estamos na página do dashboard antes de executar
    if (!document.querySelector('.kpi-section') && !document.querySelector('.summary-section')) {
        // console.log('Não é a página do dashboard, dashboard.js não fará nada.');
        return;
    }
    console.log('Dashboard.js carregado e ativo.');

    loadDashboardData();
    loadSalesChart(); // Carrega o gráfico de exemplo
});

function loadDashboardData() {
    const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
    if (!dbData) {
        console.warn('Dados do banco não encontrados no Local Storage para o dashboard.');
        // Definir valores padrão ou exibir mensagem de erro nos KPIs
        updateKPI('kpi-lucro', 0);
        updateKPI('kpi-producao', 0);
        updateKPI('kpi-saldo', 0);
        updateKPI('kpi-pares-vendidos', 0);
        document.getElementById('resumo-custos-modelos').innerHTML = '<p>Dados não disponíveis.</p>';
        document.getElementById('alertas-estoque').innerHTML = '<p>Dados não disponíveis.</p>';
        return;
    }

    // Calcular KPIs (exemplos simplificados)
    const kpiLucro = calculateTotalLucroMes(dbData.financeiro, dbData.historicoProducao, dbData.modelos);
    const kpiProducao = calculateTotalProducaoMes(dbData.historicoProducao);
    const kpiSaldo = calculateSaldoAtual(dbData.financeiro);
    const kpiParesVendidos = calculateParesVendidosMes(dbData.historicoProducao); // Simplificado, idealmente viria de vendas

    updateKPI('kpi-lucro', kpiLucro);
    updateKPI('kpi-producao', kpiProducao);
    updateKPI('kpi-saldo', kpiSaldo);
    updateKPI('kpi-pares-vendidos', kpiParesVendidos);

    displayResumoCustosModelos(dbData.modelos, dbData.insumos, dbData.custosFixos, dbData.custosVariaveis, dbData.config);
    displayAlertasEstoque(dbData.insumos);
}

/**
 * Atualiza o valor de um KPI na tela.
 * @param {string} elementId O ID do elemento HTML do KPI.
 * @param {number} value O valor a ser exibido.
 * @param {boolean} isCurrency Indica se o valor deve ser formatado como moeda.
 */
function updateKPI(elementId, value, isCurrency = true) {
    const kpiElement = document.getElementById(elementId);
    if (kpiElement) {
        kpiElement.textContent = isCurrency ? formatCurrency(value) : value.toString();
        kpiElement.classList.add('fade-in'); // Adiciona animação
    }
}

// --- Funções de Cálculo para KPIs (Exemplos) ---

function calculateTotalLucroMes(financeiro, historicoProducao, modelos) {
    // Este é um cálculo simplificado. O lucro real envolveria vendas - custos.
    // Aqui, vamos simular um lucro baseado na produção e margem dos modelos.
    let lucroEstimado = 0;
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    historicoProducao.forEach(prod => {
        const dataProd = new Date(prod.data);
        if (dataProd.getMonth() === mesAtual && dataProd.getFullYear() === anoAtual) {
            const modelo = modelos.find(m => m.id === prod.modeloId);
            if (modelo) {
                // Este é um cálculo placeholder. O custo real do modelo precisa ser calculado.
                const custoModelo = prod.custoTotal / prod.quantidade; // Usando o custo registrado na produção
                const precoVenda = custoModelo * (1 + (modelo.margemLucro || 30) / 100);
                lucroEstimado += (precoVenda - custoModelo) * prod.quantidade;
            }
        }
    });
    return lucroEstimado;
}

function calculateTotalProducaoMes(historicoProducao) {
    let totalProduzido = 0;
    const mesAtual = new Date().getMonth();
    const anoAtual = new Date().getFullYear();

    historicoProducao.forEach(prod => {
        const dataProd = new Date(prod.data);
        if (dataProd.getMonth() === mesAtual && dataProd.getFullYear() === anoAtual) {
            totalProduzido += parseInt(prod.quantidade, 10) || 0;
        }
    });
    return totalProduzido;
}

function calculateSaldoAtual(financeiro) {
    let saldo = 0;
    financeiro.forEach(transacao => {
        if (transacao.tipo === 'receita') {
            saldo += parseFloat(transacao.valor);
        } else if (transacao.tipo === 'despesa') {
            saldo -= parseFloat(transacao.valor);
        }
    });
    return saldo;
}

function calculateParesVendidosMes(historicoProducao) {
    // Simplificação: assumindo que tudo que foi produzido no mês foi vendido.
    // Em um sistema real, isso viria de registros de vendas.
    return calculateTotalProducaoMes(historicoProducao);
}


/**
 * Exibe o resumo de custos por modelos no dashboard.
 */
function displayResumoCustosModelos(modelos, insumos, custosFixos, custosVariaveis, config) {
    const container = document.getElementById('resumo-custos-modelos');
    if (!container) return;
    container.innerHTML = ''; // Limpa conteúdo anterior

    if (!modelos || modelos.length === 0) {
        container.innerHTML = '<p>Nenhum modelo cadastrado para exibir.</p>';
        return;
    }

    // Calcula o custo fixo por par
    const totalCustosFixosMensal = custosFixos.reduce((sum, cf) => sum + parseFloat(cf.valor), 0);
    const producaoMensal = config?.producaoMensalPrevista || 100; // Default se não configurado
    const custoFixoPorPar = producaoMensal > 0 ? totalCustosFixosMensal / producaoMensal : 0;

    // Calcula o total de custos variáveis por unidade
    const totalCustosVariaveisUnidade = custosVariaveis.reduce((sum, cv) => sum + parseFloat(cv.valor), 0);


    modelos.slice(0, 3).forEach(modelo => { // Exibe os 3 primeiros, por exemplo
        let custoInsumosModelo = 0;
        if (modelo.insumos && Array.isArray(modelo.insumos)) {
            modelo.insumos.forEach(insumoModelo => {
                const insumoDetalhe = insumos.find(i => i.id === insumoModelo.insumoId);
                if (insumoDetalhe) {
                    custoInsumosModelo += (parseFloat(insumoDetalhe.preco) || 0) * (parseFloat(insumoModelo.quantidade) || 0);
                }
            });
        }

        const custoTotalModelo = custoInsumosModelo + custoFixoPorPar + totalCustosVariaveisUnidade;
        const precoSugerido = custoTotalModelo * (1 + (parseFloat(modelo.margemLucro) || 30) / 100);

        const cardModeloHTML = `
            <div class="card modelo-summary-card fade-in">
                <img src="${modelo.imagemUrl || 'assets/images/modelo-placeholder.png'}" alt="${modelo.nome}" class="modelo-summary-imagem">
                <div class="card-body">
                    <h4 class="card-title">${modelo.nome}</h4>
                    <p>Ref: ${modelo.referencia || 'N/A'}</p>
                    <p>Custo Estimado: ${formatCurrency(custoTotalModelo)}</p>
                    <p>Preço Sugerido (${modelo.margemLucro}%): ${formatCurrency(precoSugerido)}</p>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', cardModeloHTML);
    });
     if (modelos.length > 3) {
        container.insertAdjacentHTML('beforeend', `<p><a href="modelos.html">Ver todos os modelos...</a></p>`);
    }
}

/**
 * Exibe alertas de estoque baixo.
 */
function displayAlertasEstoque(insumos) {
    const container = document.getElementById('alertas-estoque');
    if (!container) return;
    container.innerHTML = ''; // Limpa

    const alertas = insumos.filter(insumo => parseFloat(insumo.estoqueAtual) <= parseFloat(insumo.estoqueMinimo));

    if (alertas.length === 0) {
        container.innerHTML = '<p>Nenhum alerta de estoque baixo no momento. <img src="assets/icons/check-circle.svg" alt="OK" class="icon-sm"></p>';
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'alert-list';
    alertas.forEach(insumo => {
        const li = document.createElement('li');
        li.innerHTML = `
            <img src="assets/icons/alert-triangle.svg" alt="Alerta" class="icon-sm icon-danger">
            <strong>${insumo.nome}</strong>: ${insumo.estoqueAtual} ${insumo.unidade} (Mínimo: ${insumo.estoqueMinimo})
            <a href="insumos.html#insumo-${insumo.id}" class="link-discreto">Ver/Repor</a>
        `;
        li.classList.add('fade-in');
        ul.appendChild(li);
    });
    container.appendChild(ul);
}


/**
 * Carrega um gráfico de exemplo (usando Chart.js - requer importação no HTML).
 */
function loadSalesChart() {
    const ctx = document.getElementById('vendasChart');
    if (!ctx) return;
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não está carregado. Não é possível renderizar o gráfico.');
        ctx.parentElement.innerHTML = '<p class="text-center">Biblioteca de gráficos não carregada.</p>';
        return;
    }

    // Dados de exemplo para o gráfico
    const data = {
        labels: ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'],
        datasets: [{
            label: 'Vendas (Pares)',
            data: [65, 59, 80, 81], // Dados de exemplo
            backgroundColor: [
                'rgba(255, 99, 132, 0.2)',
                'rgba(54, 162, 235, 0.2)',
                'rgba(255, 206, 86, 0.2)',
                'rgba(75, 192, 192, 0.2)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(54, 162, 235, 1)',
                'rgba(255, 206, 86, 1)',
                'rgba(75, 192, 192, 1)'
            ],
            borderWidth: 1
        }]
    };

    new Chart(ctx, {
        type: 'bar', // ou 'line', 'pie', etc.
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: '#ccc' },
                    grid: { color: 'rgba(204, 204, 204, 0.1)'}
                },
                x: {
                    ticks: { color: '#ccc' },
                    grid: { color: 'rgba(204, 204, 204, 0.1)'}
                }
            },
            plugins: {
                legend: {
                    labels: {
                        color: '#ccc' // Cor da legenda
                    }
                }
            }
        }
    });
}
