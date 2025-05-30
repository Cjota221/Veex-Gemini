// scripts/relatorios.js

/**
 * @file Gerencia a lógica da página de Relatórios.
 */

document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('formFiltrosRelatorio')) return;
    console.log('relatorios.js carregado e ativo.');

    const formFiltros = document.getElementById('formFiltrosRelatorio');
    const btnGerarRelatorio = document.getElementById('btnGerarRelatorio');
    const btnExportarPDF = document.getElementById('btnExportarPDF');
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    const conteudoRelatorioDiv = document.getElementById('conteudoRelatorio');
    const relatorioChartCanvas = document.getElementById('relatorioChart');
    let currentChartInstance = null;


    if (btnGerarRelatorio) {
        btnGerarRelatorio.addEventListener('click', gerarRelatorio);
    }
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', exportarPDF);
    }
    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', exportarExcel);
    }

    function gerarRelatorio() {
        const tipoRelatorio = document.getElementById('tipoRelatorio').value;
        const periodo = document.getElementById('periodoRelatorio').value; // YYYY-MM

        const dbData = loadDataFromLocalStorage(VEEX_DB_KEY);
        if (!dbData) {
            conteudoRelatorioDiv.innerHTML = '<p>Erro: Banco de dados não encontrado.</p>';
            return;
        }

        conteudoRelatorioDiv.innerHTML = `<p class="text-center">Gerando relatório de ${tipoRelatorio} para ${periodo || 'todo o período'}...</p>`;
        relatorioChartCanvas.style.display = 'none';
        if (currentChartInstance) {
            currentChartInstance.destroy();
            currentChartInstance = null;
        }


        // Simulação de delay para "geração"
        setTimeout(() => {
            switch (tipoRelatorio) {
                case 'vendas':
                    gerarRelatorioVendas(dbData, periodo);
                    break;
                case 'producao':
                    gerarRelatorioProducao(dbData, periodo);
                    break;
                case 'custos':
                    gerarRelatorioCustos(dbData, periodo);
                    break;
                case 'financeiro_geral':
                    gerarRelatorioFinanceiroGeral(dbData, periodo);
                    break;
                default:
                    conteudoRelatorioDiv.innerHTML = '<p>Tipo de relatório não selecionado ou inválido.</p>';
            }
        }, 500);
    }

    function gerarRelatorioVendas(dbData, periodo) {
        // Simplificação: Usando histórico de produção como "vendas"
        let vendas = dbData.historicoProducao || [];
        if (periodo) {
            vendas = vendas.filter(v => v.data.startsWith(periodo));
        }
        vendas.sort((a,b) => new Date(a.data) - new Date(b.data));

        if (vendas.length === 0) {
            conteudoRelatorioDiv.innerHTML = '<p>Nenhum dado de venda encontrado para o período.</p>';
            return;
        }

        let html = '<h3>Relatório de Vendas</h3>';
        html += `<p>Período: ${periodo || 'Completo'}</p>`;
        html += '<table class="report-table"><thead><tr><th>Data</th><th>Modelo</th><th>Qtd</th><th>Custo Total</th><th>Valor Venda Estimado</th><th>Lucro Estimado</th></tr></thead><tbody>';

        let totalVendido = 0;
        let totalLucroEstimado = 0;
        const vendasPorModelo = {};

        vendas.forEach(venda => {
            const modelo = dbData.modelos.find(m => m.id === venda.modeloId);
            const margem = modelo ? (modelo.margemLucro || 30) / 100 : 0.3;
            const custoUnitario = venda.custoTotal / venda.quantidade;
            const precoVendaUnitario = custoUnitario * (1 + margem);
            const valorVendaTotal = precoVendaUnitario * venda.quantidade;
            const lucroEstimado = valorVendaTotal - venda.custoTotal;

            html += `<tr>
                <td>${new Date(venda.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                <td>${venda.modeloNome || modelo?.nome || 'N/A'}</td>
                <td>${venda.quantidade}</td>
                <td>${formatCurrency(venda.custoTotal)}</td>
                <td>${formatCurrency(valorVendaTotal)}</td>
                <td>${formatCurrency(lucroEstimado)}</td>
            </tr>`;
            totalVendido += venda.quantidade;
            totalLucroEstimado += lucroEstimado;

            if (vendasPorModelo[venda.modeloNome]) {
                vendasPorModelo[venda.modeloNome] += venda.quantidade;
            } else {
                vendasPorModelo[venda.modeloNome] = venda.quantidade;
            }
        });
        html += '</tbody></table>';
        html += `<p><strong>Total de Pares Vendidos: ${totalVendido}</strong></p>`;
        html += `<p><strong>Lucro Total Estimado: ${formatCurrency(totalLucroEstimado)}</strong></p>`;
        conteudoRelatorioDiv.innerHTML = html;

        // Gerar gráfico de vendas por modelo
        if (typeof Chart !== 'undefined' && Object.keys(vendasPorModelo).length > 0) {
            relatorioChartCanvas.style.display = 'block';
            const chartData = {
                labels: Object.keys(vendasPorModelo),
                datasets: [{
                    label: 'Quantidade Vendida por Modelo',
                    data: Object.values(vendasPorModelo),
                    backgroundColor: ['#f06292', '#64b5f6', '#81c784', '#ffd54f', '#ba68c8', '#e57373'],
                }]
            };
            currentChartInstance = new Chart(relatorioChartCanvas, { type: 'pie', data: chartData, options: { responsive: true, plugins: { legend: { position: 'top'}}} });
        }
    }
    
    function gerarRelatorioProducao(dbData, periodo) {
        let producoes = dbData.historicoProducao || [];
        if (periodo) {
            producoes = producoes.filter(p => p.data.startsWith(periodo));
        }
        producoes.sort((a,b) => new Date(a.data) - new Date(b.data));

        if (producoes.length === 0) {
            conteudoRelatorioDiv.innerHTML = '<p>Nenhum dado de produção encontrado para o período.</p>';
            return;
        }
        // ... Lógica similar ao de vendas, mas focando em produção ...
        conteudoRelatorioDiv.innerHTML = '<h3>Relatório de Produção (A Implementar)</h3>';
         displayGlobalMessage('Relatório de Produção ainda em desenvolvimento.', 'info');
    }

    function gerarRelatorioCustos(dbData, periodo) {
        // ... Lógica para consolidar custos de insumos, fixos, variáveis ...
        conteudoRelatorioDiv.innerHTML = '<h3>Relatório de Custos (A Implementar)</h3>';
        displayGlobalMessage('Relatório de Custos ainda em desenvolvimento.', 'info');
    }
    
    function gerarRelatorioFinanceiroGeral(dbData, periodo) {
        let transacoes = dbData.financeiro || [];
         if (periodo) {
            transacoes = transacoes.filter(t => t.data.startsWith(periodo));
        }
        transacoes.sort((a,b) => new Date(a.data) - new Date(b.data));
        
        if (transacoes.length === 0) {
            conteudoRelatorioDiv.innerHTML = '<p>Nenhuma transação financeira encontrada para o período.</p>';
            return;
        }
        // ... Tabela detalhada de fluxo de caixa ...
        conteudoRelatorioDiv.innerHTML = '<h3>Relatório Financeiro Geral (A Implementar)</h3>';
        displayGlobalMessage('Relatório Financeiro Geral ainda em desenvolvimento.', 'info');
    }


    function exportarPDF() {
        const { jsPDF } = window.jspdf;
        if (!jsPDF) {
            displayGlobalMessage('Biblioteca jsPDF não carregada. Não é possível exportar para PDF.', 'error');
            return;
        }
        const doc = new jsPDF();
        const elementoRelatorio = document.getElementById('areaRelatorio'); // O card que contém o relatório
        
        if(!elementoRelatorio || !elementoRelatorio.querySelector('h3')) {
            displayGlobalMessage('Nenhum relatório gerado para exportar.', 'info');
            return;
        }

        doc.html(elementoRelatorio, {
            callback: function (doc) {
                doc.save(`veex-relatorio-${new Date().toISOString().slice(0,10)}.pdf`);
                displayGlobalMessage('PDF gerado com sucesso!', 'success');
            },
            x: 10,
            y: 10,
            width: 180, // Ajuste conforme necessário
            windowWidth: elementoRelatorio.scrollWidth // Para renderizar corretamente o conteúdo
        });
    }

    function exportarExcel() {
         if (typeof XLSX === 'undefined') {
            displayGlobalMessage('Biblioteca XLSX (SheetJS) não carregada. Não é possível exportar para Excel.', 'error');
            return;
        }

        const tabelaRelatorio = conteudoRelatorioDiv.querySelector('table.report-table');
        if (!tabelaRelatorio) {
            displayGlobalMessage('Nenhuma tabela de relatório encontrada para exportar.', 'info');
            return;
        }

        try {
            const wb = XLSX.utils.table_to_book(tabelaRelatorio, {sheet: "RelatorioVEEX"});
            XLSX.writeFile(wb, `veex-relatorio-${new Date().toISOString().slice(0,10)}.xlsx`);
            displayGlobalMessage('Excel gerado com sucesso!', 'success');
        } catch (error) {
            console.error("Erro ao exportar para Excel:", error);
            displayGlobalMessage('Erro ao gerar arquivo Excel.', 'error');
        }
    }
});
