// ============================================
// APROVADO - LÓGICA PRINCIPAL DO APP
// ============================================

// URLs do Google Apps Script
const API_ESTOQUE_URL = 'https://script.google.com/macros/s/AKfycbx1hMBMqVmn9VGtotOlo8rRJj2QSLzqNtYARA2DPbPgzQWXrLbq---Ym0Y47c269cUXfg/exec';
const API_CLIENTES_URL = 'https://script.google.com/macros/s/AKfycbx1hMBMqVmn9VGtotOlo8rRJj2QSLzqNtYARA2DPbPgzQWXrLbq---Ym0Y47c269cUXfg/exec';

// Cache das telas carregadas
const telasCache = {};

// Variáveis globais
let produtosOriginais = [];
let clientesOriginais = [];
let clienteSelecionado = null;

// ============================================
// CARREGAMENTO DE TELAS
// ============================================

async function carregarTela(nomeTela) {
    const container = document.getElementById('telasContainer');
    
    if (telasCache[nomeTela]) {
        container.innerHTML = telasCache[nomeTela];
        executarScriptsDaTela(nomeTela);
        return;
    }
    
    try {
        const resposta = await fetch(`tela_${nomeTela}.html`);
        const html = await resposta.text();
        telasCache[nomeTela] = html;
        container.innerHTML = html;
        executarScriptsDaTela(nomeTela);
    } catch (erro) {
        console.error('Erro ao carregar tela:', erro);
        container.innerHTML = `<div class="error-message">Erro ao carregar tela ${nomeTela}</div>`;
    }
}

function executarScriptsDaTela(nomeTela) {
    switch(nomeTela) {
        case 'menu':
            exibirDataAtual();
            configurarBotoesMenu();
            break;
        case 'estoque':
            configurarBotoesVoltar();
            configurarBotaoNovaVendaEstoque();
            configurarPesquisaEstoque();
            carregarEstoque();
            break;
        case 'venda':
            configurarBotoesVoltar();
            configurarBotaoPesquisarCliente();
            atualizarDisplayCliente();
            break;
        case 'selecionar_cliente':
            configurarBotaoVoltarSelecao();
            configurarBotaoCadastrarCliente();
            configurarPesquisaClientes();
            carregarClientes();
            break;
        case 'clientes':
            configurarBotoesVoltarClientes();
            configurarPesquisaClientesCadastro();
            configurarBotoesFormCliente();
            carregarClientesCadastro();
            break;
        case 'config':
            configurarBotoesVoltar();
            break;
    }
}

function mostrarTela(telaId) {
    carregarTela(telaId);
}

// ============================================
// FUNÇÕES GLOBAIS
// ============================================

function exibirDataAtual() {
    const dataElement = document.getElementById('dataAtual');
    if (dataElement) {
        const hoje = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        dataElement.innerHTML = `<i class="far fa-calendar-alt"></i> Data: ${hoje.toLocaleDateString('pt-BR', options)}`;
    }
}

function configurarBotoesMenu() {
    const botoesMenu = document.querySelectorAll('.menu-botao');
    botoesMenu.forEach(botao => {
        const novoBotao = botao.cloneNode(true);
        botao.parentNode.replaceChild(novoBotao, botao);
        
        novoBotao.addEventListener('click', function() {
            const telaDestino = this.getAttribute('data-tela');
            if (telaDestino) {
                mostrarTela(telaDestino);
            }
        });
    });
}

function configurarBotoesVoltar() {
    const botoesVoltar = document.querySelectorAll('#telaVenda .btn-voltar, #telaConfig .btn-voltar');
    botoesVoltar.forEach(btn => {
        if (!btn.hasAttribute('data-listener')) {
            btn.setAttribute('data-listener', 'true');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                mostrarTela('menu');
            });
        }
    });
}

function configurarBotoesVoltarClientes() {
    const botoesSair = document.querySelectorAll('#telaClientes .btn-sair');
    botoesSair.forEach(btn => {
        if (!btn.hasAttribute('data-listener')) {
            btn.setAttribute('data-listener', 'true');
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                mostrarTela('venda');
            });
        }
    });
}

// ============================================
// FUNÇÕES DA TELA DE ESTOQUE (MANTIDAS)
// ============================================

function configurarBotaoNovaVendaEstoque() {
    const btnNovaVenda = document.getElementById('btnNovaVendaEstoque');
    if (btnNovaVenda && !btnNovaVenda.hasAttribute('data-listener')) {
        btnNovaVenda.setAttribute('data-listener', 'true');
        btnNovaVenda.addEventListener('click', function() {
            mostrarTela('venda');
        });
    }
}

async function carregarEstoque() {
    try {
        const resposta = await fetch(API_ESTOQUE_URL);
        const dados = await resposta.json();
        produtosOriginais = dados;
        atualizarListaEstoque();
    } catch (erro) {
        console.error('Erro ao carregar estoque:', erro);
        const container = document.getElementById('estoqueContainer');
        if (container) {
            container.innerHTML = `<div class="error-message">Erro ao carregar estoque</div>`;
        }
    }
}

function atualizarListaEstoque() {
    const searchInput = document.getElementById('pesquisaEstoque');
    const termo = searchInput ? searchInput.value : '';
    const produtosFiltrados = filtrarProdutos(termo);
    atualizarTotaisEstoque(produtosFiltrados);
    const container = document.getElementById('estoqueContainer');
    if (container) {
        container.innerHTML = renderizarTabelaEstoque(produtosFiltrados);
    }
}

function filtrarProdutos(termo) {
    if (!termo || termo.trim() === '') {
        return produtosOriginais;
    }
    const termoLower = termo.toLowerCase().trim();
    return produtosOriginais.filter(produto => {
        const id = (produto.id || produto.CODPROD || '').toString().toLowerCase();
        const nome = (produto.nome || produto.DESCRICAO || '').toString().toLowerCase();
        return id.includes(termoLower) || nome.includes(termoLower);
    });
}

function atualizarTotaisEstoque(produtos) {
    let valorTotal = 0;
    let quantidadeTotal = 0;
    
    produtos.forEach(produto => {
        const preco = typeof produto.preco === 'number' ? produto.preco : parseFloat(produto.preco) || 0;
        const quantidade = typeof produto.quantidade === 'number' ? produto.quantidade : parseInt(produto.quantidade) || 0;
        valorTotal += preco * quantidade;
        quantidadeTotal += quantidade;
    });
    
    const valorTotalElement = document.getElementById('valorTotal');
    const qtTotalElement = document.getElementById('qtTotal');
    
    if (valorTotalElement) {
        valorTotalElement.textContent = `R$ ${valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (qtTotalElement) {
        qtTotalElement.textContent = quantidadeTotal.toLocaleString('pt-BR');
    }
}

function renderizarTabelaEstoque(produtos) {
    if (!produtos || produtos.length === 0) {
        return `<div class="placeholder-mensagem"><i class="fas fa-box-open"></i>Nenhum produto encontrado</div>`;
    }
    
    let html = '<table class="estoque-tabela">';
    html += '<thead><tr><th>Código</th><th>Produto</th><th>Fornecedor</th><th>Preço</th><th>Qtd</th></tr></thead><tbody>';
    
    produtos.forEach(produto => {
        html += '<tr>';
        html += `<td>${produto.id || produto.CODPROD || '-'}</td>`;
        html += `<td><strong>${produto.nome || produto.DESCRICAO || '-'}</strong></td>`;
        html += `<td>${produto.fornecedor || '-'}</td>`;
        html += `<td>R$ ${(typeof produto.preco === 'number' ? produto.preco : parseFloat(produto.preco) || 0).toFixed(2)}`;
        html += `<td>${produto.quantidade || produto.qtd || 0}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    return html;
}

function configurarPesquisaEstoque() {
    const searchInput = document.getElementById('pesquisaEstoque');
    if (searchInput && !searchInput.hasAttribute('data-listener')) {
        searchInput.setAttribute('data-listener', 'true');
        searchInput.addEventListener('input', function() {
            atualizarListaEstoque();
        });
    }
}

// ============================================
// FUNÇÕES DA TELA DE VENDAS (NOVAS)
// ============================================

function configurarBotaoPesquisarCliente() {
    const btnPesquisar = document.getElementById('btnPesquisarCliente');
    if (btnPesquisar && !btnPesquisar.hasAttribute('data-listener')) {
        btnPesquisar.setAttribute('data-listener', 'true');
        btnPesquisar.addEventListener('click', function() {
            abrirSelecaoCliente();
        });
    }
}

function abrirSelecaoCliente() {
    // Reset do cliente selecionado ao abrir a seleção? Não, mantém o atual
    mostrarTela('selecionar_cliente');
}

function atualizarDisplayCliente() {
    const clienteDisplay = document.getElementById('clienteSelecionadoDisplay');
    if (clienteDisplay) {
        if (clienteSelecionado && clienteSelecionado.nome) {
            clienteDisplay.innerHTML = `
                <i class="fas fa-user-check" style="margin-right: 8px;"></i>
                <strong>Cliente:</strong> ${clienteSelecionado.nome}<br>
                <span style="font-size: 0.75rem;">ID: ${clienteSelecionado.id}</span>
            `;
            // Habilita o botão de finalizar venda se existir
            const btnFinalizar = document.getElementById('btnFinalizarVenda');
            if (btnFinalizar) {
                btnFinalizar.disabled = false;
            }
        } else {
            clienteDisplay.innerHTML = '<strong><i class="fas fa-user"></i> Nenhum cliente selecionado</strong>';
            const btnFinalizar = document.getElementById('btnFinalizarVenda');
            if (btnFinalizar) {
                btnFinalizar.disabled = true;
            }
        }
    }
}

// ============================================
// FUNÇÕES DA TELA DE SELEÇÃO DE CLIENTES (NOVAS)
// ============================================

function configurarBotaoVoltarSelecao() {
    const btnVoltar = document.querySelector('#telaSelecionarCliente .btn-voltar');
    if (btnVoltar && !btnVoltar.hasAttribute('data-listener')) {
        btnVoltar.setAttribute('data-listener', 'true');
        btnVoltar.addEventListener('click', function() {
            mostrarTela('venda');
        });
    }
}

function configurarBotaoCadastrarCliente() {
    const btnCadastrar = document.getElementById('btnCadastrarNovoCliente');
    if (btnCadastrar && !btnCadastrar.hasAttribute('data-listener')) {
        btnCadastrar.setAttribute('data-listener', 'true');
        btnCadastrar.addEventListener('click', function() {
            mostrarTela('clientes');
        });
    }
}

async function carregarClientes() {
    const container = document.getElementById('listaClientesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-pulse"></i> Carregando clientes...</div>';
    
    try {
        const resposta = await fetch(`${API_CLIENTES_URL}?tipo=clientes`);
        if (!resposta.ok) throw new Error('Erro ao carregar clientes');
        const dados = await resposta.json();
        // Garantir que os dados são um array
        clientesOriginais = Array.isArray(dados) ? dados : [];
        exibirListaClientes('');
    } catch (erro) {
        console.error('Erro ao carregar clientes:', erro);
        container.innerHTML = `<div class="error-message">Erro ao carregar clientes: ${erro.message}</div>`;
    }
}

function exibirListaClientes(termo) {
    const container = document.getElementById('listaClientesContainer');
    if (!container) return;
    
    if (!clientesOriginais || clientesOriginais.length === 0) {
        container.innerHTML = '<div class="placeholder-mensagem"><i class="fas fa-users"></i>Nenhum cliente cadastrado<br><span style="font-size: 0.85rem;">Clique em "Cadastrar Novo Cliente"</span></div>';
        return;
    }
    
    let dadosFiltrados = clientesOriginais;
    if (termo && termo.trim() !== '') {
        const termoLower = termo.toLowerCase().trim();
        dadosFiltrados = clientesOriginais.filter(cliente => 
            (cliente.NOMES_CLIENTES && cliente.NOMES_CLIENTES.toLowerCase().includes(termoLower)) ||
            (cliente.CPF && cliente.CPF.toLowerCase().includes(termoLower)) ||
            (cliente.NUM_TELEFONE && cliente.NUM_TELEFONE.includes(termoLower))
        );
    }
    
    if (dadosFiltrados.length === 0) {
        container.innerHTML = '<div class="placeholder-mensagem"><i class="fas fa-search"></i>Nenhum cliente encontrado com esse termo</div>';
        return;
    }
    
    let html = '<div class="lista-clientes">';
    dadosFiltrados.forEach(cliente => {
        // Escapar aspas simples no nome para evitar erro no onclick
        const nomeEscapado = (cliente.NOMES_CLIENTES || 'Nome não informado').replace(/'/g, "\\'");
        html += `
            <div class="cliente-card">
                <div>
                    <strong>${cliente.NOMES_CLIENTES || 'Nome não informado'}</strong><br>
                    <span class="cliente-info">CPF: ${cliente.CPF || 'Não informado'} | Tel: ${cliente.NUM_TELEFONE || 'Não informado'}</span>
                </div>
                <button class="btn-selecionar-cliente" onclick="selecionarCliente('${cliente.ID_CLIENTE}', '${nomeEscapado}')">
                    <i class="fas fa-check-circle"></i> Selecionar
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

// Função global chamada pelo onclick do botão Selecionar
window.selecionarCliente = function(id, nome) {
    clienteSelecionado = { id: id, nome: nome };
    mostrarTela('venda');
    // Aguardar a tela carregar para atualizar o display
    setTimeout(() => {
        atualizarDisplayCliente();
    }, 100);
};

function configurarPesquisaClientes() {
    const searchInput = document.getElementById('pesquisaCliente');
    if (searchInput && !searchInput.hasAttribute('data-listener')) {
        searchInput.setAttribute('data-listener', 'true');
        searchInput.addEventListener('input', function() {
            exibirListaClientes(this.value);
        });
    }
}

// ============================================
// FUNÇÕES DA TELA DE CADASTRO DE CLIENTES (MANTIDAS)
// ============================================

async function carregarClientesCadastro() {
    const container = document.getElementById('listaClientesCadastro');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-pulse"></i> Carregando clientes...</div>';
    
    try {
        const resposta = await fetch(`${API_CLIENTES_URL}?tipo=clientes`);
        const dados = await resposta.json();
        clientesOriginais = Array.isArray(dados) ? dados : [];
        atualizarListaClientesCadastro();
    } catch (erro) {
        console.error('Erro ao carregar clientes:', erro);
        container.innerHTML = `<div class="error-message">Erro ao carregar clientes</div>`;
    }
}

function atualizarListaClientesCadastro() {
    const searchInput = document.getElementById('pesquisaClientesCadastro');
    const termo = searchInput ? searchInput.value : '';
    const clientesFiltrados = filtrarClientesCadastro(termo);
    const container = document.getElementById('listaClientesCadastro');
    if (container) {
        container.innerHTML = renderizarListaClientesCadastro(clientesFiltrados);
        configurarCliqueClientesCadastro();
    }
}

function filtrarClientesCadastro(termo) {
    if (!termo || termo.trim() === '') {
        return clientesOriginais;
    }
    const termoLower = termo.toLowerCase().trim();
    return clientesOriginais.filter(cliente => {
        const nome = (cliente.NOMES_CLIENTES || '').toString().toLowerCase();
        const cpf = (cliente.CPF || '').toString().toLowerCase();
        return nome.includes(termoLower) || cpf.includes(termoLower);
    });
}

function renderizarListaClientesCadastro(clientes) {
    if (!clientes || clientes.length === 0) {
        return `<div class="placeholder-mensagem"><i class="fas fa-users"></i>Nenhum cliente encontrado</div>`;
    }
    
    let html = '';
    clientes.forEach(cliente => {
        html += `
            <div class="cliente-item" data-cliente='${JSON.stringify(cliente)}'>
                <div class="cliente-nome">${cliente.NOMES_CLIENTES || 'Nome não informado'}</div>
                <div class="cliente-cpf">CPF: ${cliente.CPF || 'Não informado'} | ID: ${cliente.ID_CLIENTE || '-'}</div>
            </div>
        `;
    });
    return html;
}

function configurarCliqueClientesCadastro() {
    const itens = document.querySelectorAll('.cliente-item');
    itens.forEach(item => {
        if (!item.hasAttribute('data-listener')) {
            item.setAttribute('data-listener', 'true');
            item.addEventListener('click', function() {
                const clienteData = JSON.parse(this.getAttribute('data-cliente'));
                preencherFormCliente(clienteData);
            });
        }
    });
}

function preencherFormCliente(cliente) {
    document.getElementById('editIdCliente').value = cliente.ID_CLIENTE || '';
    document.getElementById('editNomeCliente').value = cliente.NOMES_CLIENTES || '';
    document.getElementById('editCpfCliente').value = cliente.CPF || '';
    document.getElementById('editTelefoneCliente').value = cliente.NUM_TELEFONE || '';
    document.getElementById('editUfCliente').value = cliente.UF || '';
    document.getElementById('editCidadeCliente').value = cliente.CIDADES || '';
    document.getElementById('editEnderecoCliente').value = cliente.ENDEREÇO || '';
    document.getElementById('editNumeroCliente').value = cliente.NÚMERO || '';
    document.getElementById('editComplementoCliente').value = cliente.COMPLEMENTO || '';
    document.getElementById('editCepCliente').value = cliente.CEP || '';
}

function limparFormCliente() {
    document.getElementById('editIdCliente').value = '';
    document.getElementById('editNomeCliente').value = '';
    document.getElementById('editCpfCliente').value = '';
    document.getElementById('editTelefoneCliente').value = '';
    document.getElementById('editUfCliente').value = '';
    document.getElementById('editCidadeCliente').value = '';
    document.getElementById('editEnderecoCliente').value = '';
    document.getElementById('editNumeroCliente').value = '';
    document.getElementById('editComplementoCliente').value = '';
    document.getElementById('editCepCliente').value = '';
}

async function salvarCliente() {
    const cliente = {
        ID_CLIENTE: document.getElementById('editIdCliente').value || Date.now().toString(),
        NOMES_CLIENTES: document.getElementById('editNomeCliente').value,
        CPF: document.getElementById('editCpfCliente').value,
        NUM_TELEFONE: document.getElementById('editTelefoneCliente').value,
        UF: document.getElementById('editUfCliente').value,
        CIDADES: document.getElementById('editCidadeCliente').value,
        ENDEREÇO: document.getElementById('editEnderecoCliente').value,
        NÚMERO: document.getElementById('editNumeroCliente').value,
        COMPLEMENTO: document.getElementById('editComplementoCliente').value,
        CEP: document.getElementById('editCepCliente').value
    };
    
    try {
        const resposta = await fetch(`${API_CLIENTES_URL}?tipo=salvar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });
        const resultado = await resposta.json();
        if (resultado.sucesso) {
            alert('Cliente salvo com sucesso!');
            limparFormCliente();
            carregarClientesCadastro();
            // Recarregar também os clientes na seleção
            carregarClientes();
        } else {
            alert('Erro ao salvar cliente');
        }
    } catch (erro) {
        console.error('Erro ao salvar cliente:', erro);
        alert('Erro ao salvar cliente');
    }
}

async function excluirCliente() {
    const id = document.getElementById('editIdCliente').value;
    if (!id) {
        alert('Selecione um cliente para excluir');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
        const resposta = await fetch(`${API_CLIENTES_URL}?tipo=excluir&id=${id}`, {
            method: 'DELETE'
        });
        const resultado = await resposta.json();
        if (resultado.sucesso) {
            alert('Cliente excluído com sucesso!');
            limparFormCliente();
            carregarClientesCadastro();
            carregarClientes();
            // Se o cliente excluído era o selecionado, limpar seleção
            if (clienteSelecionado && clienteSelecionado.id == id) {
                clienteSelecionado = null;
                atualizarDisplayCliente();
            }
        } else {
            alert('Erro ao excluir cliente');
        }
    } catch (erro) {
        console.error('Erro ao excluir cliente:', erro);
        alert('Erro ao excluir cliente');
    }
}

function configurarPesquisaClientesCadastro() {
    const searchInput = document.getElementById('pesquisaClientesCadastro');
    if (searchInput && !searchInput.hasAttribute('data-listener')) {
        searchInput.setAttribute('data-listener', 'true');
        searchInput.addEventListener('input', function() {
            atualizarListaClientesCadastro();
        });
    }
}

function configurarBotoesFormCliente() {
    const btnSalvar = document.getElementById('btnSalvarCliente');
    const btnExcluir = document.getElementById('btnExcluirCliente');
    const btnCancelar = document.getElementById('btnCancelarCliente');
    
    if (btnSalvar && !btnSalvar.hasAttribute('data-listener')) {
        btnSalvar.setAttribute('data-listener', 'true');
        btnSalvar.addEventListener('click', salvarCliente);
    }
    
    if (btnExcluir && !btnExcluir.hasAttribute('data-listener')) {
        btnExcluir.setAttribute('data-listener', 'true');
        btnExcluir.addEventListener('click', excluirCliente);
    }
    
    if (btnCancelar && !btnCancelar.hasAttribute('data-listener')) {
        btnCancelar.setAttribute('data-listener', 'true');
        btnCancelar.addEventListener('click', limparFormCliente);
    }
}

// ============================================
// INICIALIZAÇÃO
// ============================================

carregarTela('menu');
