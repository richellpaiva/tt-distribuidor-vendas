// ============================================
// APROVADO - LÓGICA PRINCIPAL DO APP
// ============================================

// NOVO URL do Google Apps Script (fornecido pelo usuário)
const API_URL = 'https://script.google.com/macros/s/AKfycbyRWqOEPPfFPa1amNaTgCzlgpwPPtuTKopebpGLFVtQEBEadNI6iBRj7DsMqw005rqmMA/exec';

// Cache das telas carregadas
const telasCache = {};

// Variáveis globais
let produtosOriginais = [];
let clientesOriginais = [];
let clienteSelecionado = null;
let editandoClienteId = null;

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
            configurarBotoesVoltarVenda();
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
            configurarBotaoSairClientes();
            configurarPesquisaClientesCadastro();
            configurarBotoesFormCliente();
            carregarClientesCadastro();
            break;
        case 'config':
            configurarBotoesVoltarConfig();
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

// ============================================
// FUNÇÕES DA TELA DE ESTOQUE (MANTIDAS)
// ============================================

function configurarBotoesVoltar() {
    const botoesVoltar = document.querySelectorAll('#telaEstoque .btn-voltar');
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
        const resposta = await fetch(`${API_URL}?tipo=estoque`);
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
// FUNÇÕES DA TELA DE VENDAS
// ============================================

function configurarBotoesVoltarVenda() {
    const botoesVoltar = document.querySelectorAll('#telaVenda .btn-voltar');
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
// FUNÇÕES DA TELA DE SELEÇÃO DE CLIENTES
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
            // Limpar formulário antes de ir para cadastro
            editandoClienteId = null;
            mostrarTela('clientes');
        });
    }
}

async function carregarClientes() {
    const container = document.getElementById('listaClientesContainer');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-pulse"></i> Carregando clientes...</div>';
    
    try {
        const resposta = await fetch(`${API_URL}?tipo=clientes`);
        if (!resposta.ok) throw new Error('Erro ao carregar clientes');
        const dados = await resposta.json();
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
            (cliente.nome && cliente.nome.toLowerCase().includes(termoLower)) ||
            (cliente.cpf && cliente.cpf.toLowerCase().includes(termoLower)) ||
            (cliente.telefone && cliente.telefone.includes(termoLower))
        );
    }
    
    if (dadosFiltrados.length === 0) {
        container.innerHTML = '<div class="placeholder-mensagem"><i class="fas fa-search"></i>Nenhum cliente encontrado com esse termo</div>';
        return;
    }
    
    let html = '<div class="lista-clientes">';
    dadosFiltrados.forEach(cliente => {
        const nomeEscapado = (cliente.nome || 'Nome não informado').replace(/'/g, "\\'");
        html += `
            <div class="cliente-card">
                <div>
                    <strong>${cliente.nome || 'Nome não informado'}</strong><br>
                    <span class="cliente-info">CPF: ${cliente.cpf || 'Não informado'} | Tel: ${cliente.telefone || 'Não informado'}</span>
                </div>
                <button class="btn-selecionar-cliente" onclick="selecionarCliente('${cliente.id}', '${nomeEscapado}')">
                    <i class="fas fa-check-circle"></i> Selecionar
                </button>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
}

window.selecionarCliente = function(id, nome) {
    clienteSelecionado = { id: id, nome: nome };
    mostrarTela('venda');
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
// FUNÇÕES DA TELA DE CADASTRO DE CLIENTES
// ============================================

function configurarBotaoSairClientes() {
    const btnSair = document.querySelector('#telaClientes .btn-sair');
    if (btnSair && !btnSair.hasAttribute('data-listener')) {
        btnSair.setAttribute('data-listener', 'true');
        btnSair.addEventListener('click', function() {
            mostrarTela('venda');
        });
    }
}

async function carregarClientesCadastro() {
    const container = document.getElementById('listaClientesCadastro');
    if (!container) return;
    
    container.innerHTML = '<div class="loading-message"><i class="fas fa-spinner fa-pulse"></i> Carregando clientes...</div>';
    
    try {
        const resposta = await fetch(`${API_URL}?tipo=clientes`);
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
        const nome = (cliente.nome || '').toString().toLowerCase();
        const cpf = (cliente.cpf || '').toString().toLowerCase();
        return nome.includes(termoLower) || cpf.includes(termoLower);
    });
}

function renderizarListaClientesCadastro(clientes) {
    if (!clientes || clientes.length === 0) {
        return `<div class="placeholder-mensagem"><i class="fas fa-users"></i>Nenhum cliente encontrado</div>`;
    }
    
    let html = '<div class="lista-clientes-cadastro">';
    clientes.forEach(cliente => {
        html += `
            <div class="cliente-item-cadastro" data-id="${cliente.id}">
                <div class="cliente-nome">${cliente.nome || 'Nome não informado'}</div>
                <div class="cliente-info">CPF: ${cliente.cpf || 'Não informado'} | Tel: ${cliente.telefone || 'Não informado'}</div>
            </div>
        `;
    });
    html += '</div>';
    return html;
}

function configurarCliqueClientesCadastro() {
    const itens = document.querySelectorAll('.cliente-item-cadastro');
    itens.forEach(item => {
        if (!item.hasAttribute('data-listener')) {
            item.setAttribute('data-listener', 'true');
            item.addEventListener('click', function() {
                const id = parseInt(this.getAttribute('data-id'));
                const cliente = clientesOriginais.find(c => c.id == id);
                if (cliente) {
                    preencherFormCliente(cliente);
                }
            });
        }
    });
}

function preencherFormCliente(cliente) {
    editandoClienteId = cliente.id;
    document.getElementById('editNomeCliente').value = cliente.nome || '';
    document.getElementById('editCpfCliente').value = cliente.cpf || '';
    document.getElementById('editTelefoneCliente').value = cliente.telefone || '';
    document.getElementById('editUfCliente').value = cliente.uf || '';
    document.getElementById('editCidadeCliente').value = cliente.cidade || '';
    document.getElementById('editEnderecoCliente').value = cliente.endereco || '';
    document.getElementById('editNumeroCliente').value = cliente.numero || '';
    document.getElementById('editComplementoCliente').value = cliente.complemento || '';
    document.getElementById('editCepCliente').value = cliente.cep || '';
}

function limparFormCliente() {
    editandoClienteId = null;
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
        acao: 'cliente',
        modo: editandoClienteId ? 'editar' : 'novo',
        id: editandoClienteId,
        nome: document.getElementById('editNomeCliente').value,
        cpf: document.getElementById('editCpfCliente').value,
        telefone: document.getElementById('editTelefoneCliente').value,
        uf: document.getElementById('editUfCliente').value,
        cidade: document.getElementById('editCidadeCliente').value,
        endereco: document.getElementById('editEnderecoCliente').value,
        numero: document.getElementById('editNumeroCliente').value,
        complemento: document.getElementById('editComplementoCliente').value,
        cep: document.getElementById('editCepCliente').value
    };
    
    if (!cliente.nome) {
        alert('Por favor, informe o nome do cliente');
        return;
    }
    
    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cliente)
        });
        const resultado = await resposta.json();
        if (resultado.status === 'ok') {
            alert('Cliente salvo com sucesso!');
            limparFormCliente();
            await carregarClientesCadastro();
            await carregarClientes();
            if (clienteSelecionado && clienteSelecionado.id == editandoClienteId) {
                clienteSelecionado = { id: resultado.id, nome: cliente.nome };
                atualizarDisplayCliente();
            }
        } else {
            alert('Erro ao salvar cliente: ' + (resultado.erro || 'Erro desconhecido'));
        }
    } catch (erro) {
        console.error('Erro ao salvar cliente:', erro);
        alert('Erro ao salvar cliente');
    }
}

async function excluirCliente() {
    if (!editandoClienteId) {
        alert('Selecione um cliente para excluir');
        return;
    }
    
    if (!confirm('Tem certeza que deseja excluir este cliente permanentemente?')) return;
    
    try {
        const resposta = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                acao: 'cliente',
                modo: 'excluir',
                id: editandoClienteId
            })
        });
        const resultado = await resposta.json();
        if (resultado.status === 'ok') {
            alert('Cliente excluído com sucesso!');
            limparFormCliente();
            await carregarClientesCadastro();
            await carregarClientes();
            if (clienteSelecionado && clienteSelecionado.id == editandoClienteId) {
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
    const btnCriarNovo = document.getElementById('btnCriarNovoCliente');
    
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
    
    if (btnCriarNovo && !btnCriarNovo.hasAttribute('data-listener')) {
        btnCriarNovo.setAttribute('data-listener', 'true');
        btnCriarNovo.addEventListener('click', limparFormCliente);
    }
}

// ============================================
// FUNÇÕES DA TELA DE CONFIGURAÇÃO
// ============================================

function configurarBotoesVoltarConfig() {
    const botoesVoltar = document.querySelectorAll('#telaConfig .btn-voltar');
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

// ============================================
// INICIALIZAÇÃO
// ============================================

carregarTela('menu');
