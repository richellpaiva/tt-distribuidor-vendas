/* ============================================
   CONFIGURAÇÕES GLOBAIS
   ============================================ */
const API_URL = 'https://script.google.com/macros/s/AKfycbzFzi9oYzDGS3_dnVzm2H_Y-vDFyxf6_MCho977kbyMqhoSymsb8-mwc_lSeJJy_p1VZQ/exec';

let historicoNavegacao = ['tela_login.html'];
let produtosOriginais = [];
let clientesOriginais = [];
let clienteSelecionado = null;
let usuariosOriginais = [];
let usuarioSelecionadoId = null;
let sortStateEstoque = { col: -1, asc: true };
let produtosFiltradosAtuais = [];
let produtoSelecionado = null;
let estoqueAtual = 0;
let editandoClienteId = null;

/* ============================================
   FUNÇÕES DE MODAL
   ============================================ */
function exibirAlertaCustom(mensagem) {
    document.getElementById('mensagemAlertaCustom').innerText = mensagem;
    document.getElementById('modalAlertaCustom').style.display = 'flex';
}

function fecharAlertaCustom() {
    document.getElementById('modalAlertaCustom').style.display = 'none';
}

/* ============================================
   NAVEGAÇÃO
   ============================================ */
async function navegarPara(arquivo) {
    try {
        const resposta = await fetch(arquivo);
        if (!resposta.ok) throw new Error('Arquivo não encontrado: ' + arquivo);
        const html = await resposta.text();
        document.getElementById('conteudoApp').innerHTML = html;
        historicoNavegacao.push(arquivo);
        inicializarEventosTela(arquivo);
    } catch (erro) {
        console.error('Erro:', erro);
        document.getElementById('conteudoApp').innerHTML = '<div class="error-message">Erro ao carregar a tela: ' + arquivo + '</div>';
    }
}

function voltarParaTelaAnterior() {
    if (historicoNavegacao.length > 1) {
        historicoNavegacao.pop();
        const telaAnterior = historicoNavegacao[historicoNavegacao.length - 1];
        navegarPara(telaAnterior);
    } else {
        navegarPara('tela_login.html');
    }
}

/* ============================================
   INICIALIZAR EVENTOS POR TELA
   ============================================ */
function inicializarEventosTela(arquivo) {
    // Botões voltar
    document.querySelectorAll('.btn-voltar').forEach(btn => {
        btn.removeEventListener('click', voltarParaTelaAnterior);
        btn.addEventListener('click', voltarParaTelaAnterior);
    });

    // Botão fechar alerta
    document.getElementById('btnFecharAlertaCustom')?.addEventListener('click', fecharAlertaCustom);

    if (arquivo === 'tela_login.html') {
        document.getElementById('btnLogin')?.addEventListener('click', fazerLogin);
    } else if (arquivo === 'tela_menu.html') {
        document.querySelectorAll('.menu-botao').forEach(btn => {
            btn.addEventListener('click', () => {
                const destino = btn.getAttribute('data-tela');
                if (destino) navegarPara(destino);
            });
        });
    } else if (arquivo === 'tela_estoque.html') {
        carregarEstoque();
        document.getElementById('pesquisaEstoque')?.addEventListener('input', () => {
            sortStateEstoque = { col: -1, asc: true };
            atualizarEstoque();
        });
        document.getElementById('btnNovaVendaEstoque')?.addEventListener('click', () => navegarPara('tela_venda.html'));
        document.getElementById('btnExportarExcel')?.addEventListener('click', exportarParaExcel);
        window.ordenarTabelaEstoque = ordenarTabelaEstoque;
    } else if (arquivo === 'tela_usuarios.html') {
        carregarUsuarios();
        document.getElementById('btnAdicionarUsuario')?.addEventListener('click', () => {
            limparFormUsuario();
            habilitarEdicaoUsuario(true);
        });
        document.getElementById('btnEditarUsuario')?.addEventListener('click', () => {
            if (!usuarioSelecionadoId) {
                exibirAlertaCustom('Selecione um usuário na lista para editar.');
                return;
            }
            habilitarEdicaoUsuario(true);
        });
        document.getElementById('btnExcluirUsuario')?.addEventListener('click', excluirUsuario);
        document.getElementById('btnPesquisarUsuario')?.addEventListener('click', () => {
            const termo = document.getElementById('pesquisaUsuario')?.value || '';
            carregarUsuarios(termo);
        });
        document.getElementById('btnSalvarUsuario')?.addEventListener('click', salvarUsuario);
        document.getElementById('btnCancelarUsuario')?.addEventListener('click', limparFormUsuario);
        document.getElementById('btnMenuUsuarios')?.addEventListener('click', () => navegarPara('tela_menu.html'));
    } else if (arquivo === 'tela_clientes.html') {
        carregarClientes();
        document.getElementById('pesquisaClientesCadastro')?.addEventListener('input', () => atualizarListaClientesCadastro());
        document.getElementById('btnCriarNovoCliente')?.addEventListener('click', () => {
            limparFormCliente();
            habilitarEdicaoCliente(true);
        });
        document.getElementById('btnEditarCliente')?.addEventListener('click', () => {
            if (!editandoClienteId) {
                exibirAlertaCustom('Selecione um cliente na lista para editar.');
                return;
            }
            habilitarEdicaoCliente(true);
        });
        document.getElementById('btnSalvarCliente')?.addEventListener('click', salvarCliente);
        document.getElementById('btnExcluirCliente')?.addEventListener('click', excluirCliente);
        document.getElementById('btnCancelarCliente')?.addEventListener('click', () => {
            limparFormCliente();
            habilitarEdicaoCliente(false);
        });
        document.getElementById('btnMenuClientes')?.addEventListener('click', () => navegarPara('tela_menu.html'));
    } else if (arquivo === 'tela_venda.html') {
        if (clienteSelecionado) {
            const display = document.getElementById('clienteSelecionadoDisplay');
            if (display) {
                display.innerHTML = `<i class="fas fa-user-check"></i> <strong>Cliente:</strong> ${clienteSelecionado.nome} (ID: ${clienteSelecionado.id})`;
            }
        }
        document.getElementById('btnPesquisarClientes')?.addEventListener('click', () => navegarPara('tela_selecionar_cliente.html'));
        document.getElementById('btnPesquisarVendas')?.addEventListener('click', () => navegarPara('tela_historico_vendas.html'));
        document.getElementById('btnLancarProdutos')?.addEventListener('click', () => navegarPara('tela_lancar_produtos.html'));
        document.getElementById('btnCadastrarClienteVenda')?.addEventListener('click', () => navegarPara('tela_clientes.html'));
    } else if (arquivo === 'tela_selecionar_cliente.html') {
        carregarClientesParaSelecao();
        document.getElementById('pesquisaCliente')?.addEventListener('input', (e) => exibirListaClientes(e.target.value));
        document.getElementById('btnCadastrarNovoCliente')?.addEventListener('click', () => navegarPara('tela_clientes.html'));
    } else if (arquivo === 'tela_lancar_produtos.html') {
        carregarProdutosLancamento();
        document.getElementById('pesquisaProdutoLancamento')?.addEventListener('input', (e) => {
            if (window.produtosLancamento) renderizarTabelaLancamento(window.produtosLancamento, e.target.value);
        });
        document.getElementById('btnConfirmarLancamento')?.addEventListener('click', confirmarLancamento);
        document.getElementById('btnCancelarLancamento')?.addEventListener('click', () => {
            document.getElementById('modalQuantidade').style.display = 'none';
            produtoSelecionado = null;
        });
    } else if (arquivo === 'tela_historico_vendas.html') {
        carregarHistoricoVendas();
        document.getElementById('pesquisaHistoricoVendas')?.addEventListener('input', (e) => {
            if (window.vendasHistorico) renderizarHistoricoVendas(window.vendasHistorico, e.target.value);
        });
    }
}

/* ============================================
   LOGIN CORRIGIDO
   ============================================ */
async function fazerLogin() {
    const usuarioInput = document.getElementById('usuarioLogin').value.trim();
    const senhaInput = document.getElementById('senhaLogin').value.trim();

    if (!usuarioInput || !senhaInput) {
        exibirAlertaCustom('Preencha todos os campos.');
        return;
    }

    try {
        const resposta = await fetch(`${API_URL}?tipo=usuarios`);
        const usuarios = await resposta.json();

        // A busca agora usa a chave 'nome' que o backend retorna e adiciona 'trim()' para evitar erros de espaço
        const encontrado = usuarios.find(u => 
            u.nome && u.nome.trim() === usuarioInput && 
            u.senha && u.senha.trim() === senhaInput
        );

        if (encontrado) {
            localStorage.setItem('usuarioLogado', JSON.stringify(encontrado));
            navegarPara('tela_menu.html');
        } else {
            exibirAlertaCustom('Usuário ou senha incorretos.');
        }
    } catch (erro) {
        console.error('Erro no login:', erro);
        exibirAlertaCustom('Erro ao conectar ao servidor.');
    }
}

/* ============================================
   ESTOQUE
   ============================================ */
async function carregarEstoque() {
    const container = document.getElementById('estoqueContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-message">Carregando...</div>';
    try {
        const res = await fetch(`${API_URL}?tipo=estoque`);
        produtosOriginais = await res.json();
        atualizarEstoque();
    } catch (e) {
        container.innerHTML = '<div class="error-message">Erro ao carregar estoque</div>';
    }
}

function atualizarEstoque() {
    const termo = document.getElementById('pesquisaEstoque')?.value.toLowerCase() || '';
    produtosFiltradosAtuais = produtosOriginais.filter(p =>
        String(p.CODPROD || '').toLowerCase().includes(termo) ||
        String(p.DESCRICAO || '').toLowerCase().includes(termo)
    );
    if (sortStateEstoque.col !== -1) {
        ordenarDados(produtosFiltradosAtuais, sortStateEstoque.col, sortStateEstoque.asc);
    }
    atualizarTotaisEstoque(produtosFiltradosAtuais);
    document.getElementById('estoqueContainer').innerHTML = renderizarTabelaEstoque(produtosFiltradosAtuais);
}

function ordenarDados(dados, colIndex, asc) {
    const chaves = ['CODPROD', 'DESCRICAO', 'QT', 'VLCMVCUSTO'];
    dados.sort((a, b) => {
        let va = a[chaves[colIndex]];
        let vb = b[chaves[colIndex]];
        if (va === undefined) va = '';
        if (vb === undefined) vb = '';
        if (typeof va === 'string') {
            return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        } else {
            return asc ? va - vb : vb - va;
        }
    });
}

function ordenarTabelaEstoque(colIndex) {
    if (!produtosFiltradosAtuais || produtosFiltradosAtuais.length === 0) return;
    if (sortStateEstoque.col === colIndex) {
        sortStateEstoque.asc = !sortStateEstoque.asc;
    } else {
        sortStateEstoque.col = colIndex;
        sortStateEstoque.asc = true;
    }
    ordenarDados(produtosFiltradosAtuais, sortStateEstoque.col, sortStateEstoque.asc);
    document.getElementById('estoqueContainer').innerHTML = renderizarTabelaEstoque(produtosFiltradosAtuais);
    atualizarTotaisEstoque(produtosFiltradosAtuais);
}

function atualizarTotaisEstoque(produtos) {
    let valorTotal = 0, qtdTotal = 0;
    produtos.forEach(p => {
        let preco = parseFloat(p.VLCMVCUSTO) || 0;
        let qtd = parseInt(p.QT) || 0;
        valorTotal += preco * qtd;
        qtdTotal += qtd;
    });
    document.getElementById('valorTotal').innerText = Number(valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('qtTotal').innerText = qtdTotal.toLocaleString('pt-BR');
}

function renderizarTabelaEstoque(produtos) {
    if (!produtos || produtos.length === 0) {
        return `<div class="placeholder-mensagem"><i class="fas fa-box-open"></i>Nenhum produto encontrado</div>`;
    }
    let html = '<table class="estoque-tabela"><thead><tr><th onclick="ordenarTabelaEstoque(0)">Código <i class="fas fa-sort"></i></th><th onclick="ordenarTabelaEstoque(1)">Produto <i class="fas fa-sort"></i></th><th onclick="ordenarTabelaEstoque(2)">Quantidade <i class="fas fa-sort"></i></th><th onclick="ordenarTabelaEstoque(3)">Preço <i class="fas fa-sort"></i></th></tr></thead><tbody>';
    produtos.forEach(p => {
        html += `<tr><td style="white-space:nowrap">${p.CODPROD || '-'}</td><td style="white-space:normal; word-break:break-word"><strong>${p.DESCRICAO || '-'}</strong></td><td style="white-space:nowrap">${Number(p.QT).toLocaleString('pt-BR')}</td><td style="white-space:nowrap">${Number(p.VLCMVCUSTO).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td></tr>`;
    });
    html += '</tbody></table>';
    return html;
}

function exportarParaExcel() {
    if (!produtosFiltradosAtuais || produtosFiltradosAtuais.length === 0) {
        exibirAlertaCustom('Nenhum dado para exportar.');
        return;
    }
    let csv = 'Código;Produto;Quantidade;Preço (R$)\n';
    produtosFiltradosAtuais.forEach(p => {
        csv += `"${p.CODPROD || ''}";"${p.DESCRICAO || ''}";${p.QT || 0};${(parseFloat(p.VLCMVCUSTO) || 0).toFixed(2).replace('.', ',')}\n`;
    });
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = 'estoque_filtrado.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/* ============================================
   CLIENTES
   ============================================ */
async function carregarClientes() {
    try {
        const res = await fetch(`${API_URL}?tipo=clientes`);
        clientesOriginais = await res.json();
        if (document.getElementById('listaClientesCadastro')) atualizarListaClientesCadastro();
    } catch (e) {
        console.error(e);
    }
}

function atualizarListaClientesCadastro() {
    const termo = document.getElementById('pesquisaClientesCadastro')?.value || '';
    let filtrados = clientesOriginais;
    if (termo) {
        const low = termo.toLowerCase();
        filtrados = clientesOriginais.filter(c =>
            (c.nome || '').toLowerCase().includes(low) ||
            (c.telefone || '').includes(low)
        );
    }
    const container = document.getElementById('listaClientesCadastro');
    if (!filtrados.length) {
        container.innerHTML = '<div class="placeholder-mensagem">Nenhum cliente encontrado</div>';
        return;
    }
    let html = '<div class="lista-clientes">';
    filtrados.forEach(c => {
        html += `<div class="cliente-card" data-id="${c.id}">
                    <strong>${c.nome}</strong><br>
                    <span style="font-size:0.7rem;">Telefone: ${c.telefone || '-'} | ID: ${c.id}</span>
                 </div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll('#listaClientesCadastro .cliente-card').forEach(card => {
        card.addEventListener('click', () => {
            const id = parseInt(card.dataset.id);
            const cliente = clientesOriginais.find(c => c.id == id);
            if (cliente) preencherFormCliente(cliente);
        });
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
    habilitarEdicaoCliente(false);
}

function limparFormCliente() {
    editandoClienteId = null;
    document.querySelectorAll('#telaClientes input, #telaClientes select').forEach(inp => inp.value = '');
    habilitarEdicaoCliente(false);
}

function habilitarEdicaoCliente(habilitar) {
    document.querySelectorAll('#telaClientes input, #telaClientes select').forEach(input => {
        input.disabled = !habilitar;
    });
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
        exibirAlertaCustom('Nome é obrigatório');
        return;
    }
    try {
        const formData = new FormData();
        formData.append('dados', JSON.stringify(cliente));
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'ok') {
            exibirAlertaCustom('Cliente salvo!');
            limparFormCliente();
            await carregarClientes();
        } else {
            exibirAlertaCustom('Erro ao salvar cliente');
        }
    } catch (e) {
        exibirAlertaCustom('Erro de conexão');
    }
}

async function excluirCliente() {
    if (!editandoClienteId) {
        exibirAlertaCustom('Selecione um cliente');
        return;
    }
    if (!confirm('Excluir permanentemente?')) return;
    try {
        const formData = new FormData();
        formData.append('dados', JSON.stringify({ acao: 'cliente', modo: 'excluir', id: editandoClienteId }));
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'ok') {
            exibirAlertaCustom('Cliente excluído');
            limparFormCliente();
            await carregarClientes();
        } else {
            exibirAlertaCustom('Erro ao excluir cliente');
        }
    } catch (e) {
        exibirAlertaCustom('Erro de conexão');
    }
}

/* ============================================
   SELEÇÃO DE CLIENTES
   ============================================ */
async function carregarClientesParaSelecao() {
    const container = document.getElementById('listaClientesContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-message">Carregando clientes...</div>';
    try {
        const res = await fetch(`${API_URL}?tipo=clientes`);
        clientesOriginais = await res.json();
        exibirListaClientes('');
    } catch (e) {
        container.innerHTML = '<div class="error-message">Erro ao carregar clientes</div>';
    }
}

function exibirListaClientes(termo) {
    const container = document.getElementById('listaClientesContainer');
    let filtrados = clientesOriginais;
    if (termo) {
        const low = termo.toLowerCase();
        filtrados = clientesOriginais.filter(c =>
            (c.nome || '').toLowerCase().includes(low) ||
            (c.cpf || '').includes(low)
        );
    }
    if (!filtrados.length) {
        container.innerHTML = '<div class="placeholder-mensagem">Nenhum cliente encontrado</div>';
        return;
    }
    let html = '<div class="lista-clientes">';
    filtrados.forEach(c => {
        html += `<div class="cliente-card" data-id="${c.id}" data-nome="${c.nome.replace(/'/g, "\\'")}" style="display:flex; justify-content:space-between; align-items:center;">
                    <div><strong>${c.nome}</strong><br><span style="font-size:0.7rem;">CPF: ${c.cpf || '-'} | Tel: ${c.telefone || '-'}</span></div>
                    <button class="btn-selecionar-cliente" style="background:#1E5A99; color:white; border:none; border-radius:8px; padding:8px 12px;">Selecionar</button>
                </div>`;
    });
    container.innerHTML = html;
    document.querySelectorAll('.btn-selecionar-cliente').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const card = btn.closest('.cliente-card');
            clienteSelecionado = {
                id: card.dataset.id,
                nome: card.dataset.nome
            };
            navegarPara('tela_venda.html');
        });
    });
}

/* ============================================
   USUÁRIOS
   ============================================ */
async function carregarUsuarios(termo = '') {
    const container = document.getElementById('listaUsuariosContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-message">Carregando...</div>';
    try {
        const res = await fetch(`${API_URL}?tipo=usuarios`);
        usuariosOriginais = await res.json();
        let filtrados = usuariosOriginais;
        if (termo) {
            const low = termo.toLowerCase();
            filtrados = usuariosOriginais.filter(u => u.nome.toLowerCase().includes(low));
        }
        if (!filtrados.length) {
            container.innerHTML = '<div class="placeholder-mensagem">Nenhum usuário encontrado</div>';
            return;
        }
        let html = '<table class="data-table"><thead><tr><th>USUÁRIOS</th><th>SENHAS</th><th>NÍVEIS</th></tr></thead><tbody>';
        filtrados.forEach(u => {
            html += `<tr data-id="${u.id}"><td>${u.nome}<td>******<\/td><td>${u.nivel || 'Vendedor'}<\/td></tr>`;
        });
        html += '</tbody></table>';
        container.innerHTML = html;
        document.querySelectorAll('#listaUsuariosContainer tbody tr').forEach(row => {
            row.addEventListener('click', () => {
                const id = parseInt(row.dataset.id);
                const usuario = usuariosOriginais.find(u => u.id == id);
                if (usuario) preencherFormUsuario(usuario);
            });
        });
    } catch (e) {
        container.innerHTML = '<div class="error-message">Erro ao carregar usuários</div>';
    }
}

function preencherFormUsuario(usuario) {
    usuarioSelecionadoId = usuario.id;
    document.getElementById('editUsuario').value = usuario.nome || '';
    document.getElementById('editSenha').value = '';
    document.getElementById('editNivel').value = usuario.nivel || 'Vendedor';
    habilitarEdicaoUsuario(false);
}

function limparFormUsuario() {
    usuarioSelecionadoId = null;
    document.getElementById('editUsuario').value = '';
    document.getElementById('editSenha').value = '';
    document.getElementById('editNivel').value = 'Vendedor';
    habilitarEdicaoUsuario(false);
}

function habilitarEdicaoUsuario(habilitar) {
    document.getElementById('editUsuario').disabled = !habilitar;
    document.getElementById('editSenha').disabled = !habilitar;
    document.getElementById('editNivel').disabled = !habilitar;
}

async function salvarUsuario() {
    const usuario = {
        acao: 'usuario',
        modo: usuarioSelecionadoId ? 'editar' : 'novo',
        id: usuarioSelecionadoId,
        nome: document.getElementById('editUsuario').value,
        senha: document.getElementById('editSenha').value,
        nivel: document.getElementById('editNivel').value
    };
    if (!usuario.nome) {
        exibirAlertaCustom('Usuário é obrigatório');
        return;
    }
    if (!usuario.senha && !usuarioSelecionadoId) {
        exibirAlertaCustom('Senha é obrigatória');
        return;
    }
    try {
        const formData = new FormData();
        formData.append('dados', JSON.stringify(usuario));
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'ok') {
            exibirAlertaCustom('Usuário salvo!');
            limparFormUsuario();
            carregarUsuarios();
        } else {
            exibirAlertaCustom('Erro ao salvar usuário');
        }
    } catch (e) {
        exibirAlertaCustom('Erro de conexão');
    }
}

async function excluirUsuario() {
    if (!usuarioSelecionadoId) {
        exibirAlertaCustom('Selecione um usuário para excluir');
        return;
    }
    if (!confirm('Excluir permanentemente?')) return;
    try {
        const formData = new FormData();
        formData.append('dados', JSON.stringify({ acao: 'usuario', modo: 'excluir', id: usuarioSelecionadoId }));
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'ok') {
            exibirAlertaCustom('Usuário excluído');
            limparFormUsuario();
            carregarUsuarios();
        } else {
            exibirAlertaCustom('Erro ao excluir usuário');
        }
    } catch (e) {
        exibirAlertaCustom('Erro de conexão');
    }
}

/* ============================================
   LANÇAR PRODUTOS
   ============================================ */
function formatarDataISO(dataISO) {
    if (!dataISO) return '-';
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return '-';
    return `${String(data.getDate()).padStart(2, '0')}/${String(data.getMonth() + 1).padStart(2, '0')}/${data.getFullYear()}`;
}

async function carregarProdutosLancamento() {
    const container = document.getElementById('tabelaLancamentoContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-message">Carregando...</div>';
    try {
        const res = await fetch(`${API_URL}?tipo=estoque`);
        const produtos = await res.json();
        window.produtosLancamento = produtos;
        renderizarTabelaLancamento(produtos);
    } catch (e) {
        container.innerHTML = '<div class="error-message">Erro ao carregar produtos</div>';
    }
}

function renderizarTabelaLancamento(produtos, termo = '') {
    const container = document.getElementById('tabelaLancamentoContainer');
    let filtrados = produtos;
    if (termo) {
        const low = termo.toLowerCase();
        filtrados = produtos.filter(p =>
            String(p.CODPROD || '').toLowerCase().includes(low) ||
            String(p.DESCRICAO || '').toLowerCase().includes(low)
        );
    }
    if (!filtrados.length) {
        container.innerHTML = '<div class="placeholder-mensagem">Nenhum produto encontrado</div>';
        atualizarTotaisLancamento([]);
        return;
    }
    let html = '<table class="estoque-tabela" id="tabelaLancamento"><thead><tr><th>Código</th><th>Produto</th><th>Validade</th><th>Quantidade</th><th>Preço Unit.</th><tr></thead><tbody>';
    filtrados.forEach((p, idx) => {
        html += `<tr data-idx="${idx}" data-codprod="${p.CODPROD}" data-estoque="${p.QT}" data-preco="${p.VLCMVCUSTO}">
                    <td style="white-space:nowrap">${p.CODPROD || '-'}</td>
                    <td style="white-space:normal; word-break:break-word"><strong>${p.DESCRICAO || '-'}</strong></td>
                    <td style="white-space:nowrap">${formatarDataISO(p.DTVAL)}</td>
                    <td style="white-space:nowrap">${Number(p.QT).toLocaleString('pt-BR')}</td>
                    <td style="white-space:nowrap">${Number(p.VLCMVCUSTO).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                  </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    atualizarTotaisLancamento(filtrados);
    document.querySelectorAll('#tabelaLancamento tbody tr').forEach(row => {
        row.addEventListener('click', function() {
            produtoSelecionado = {
                codprod: this.dataset.codprod,
                estoque: parseInt(this.dataset.estoque) || 0,
                preco: parseFloat(this.dataset.preco) || 0
            };
            estoqueAtual = produtoSelecionado.estoque;
            document.getElementById('inputQuantidade').value = 1;
            document.getElementById('modalQuantidade').style.display = 'flex';
        });
    });
}

function atualizarTotaisLancamento(produtos) {
    let qtdeTotal = 0, valorTotal = 0;
    produtos.forEach(p => {
        qtdeTotal += parseInt(p.QT) || 0;
        valorTotal += (parseFloat(p.VLCMVCUSTO) || 0) * (parseInt(p.QT) || 0);
    });
    document.getElementById('lancQtdeTotal').innerText = qtdeTotal.toLocaleString('pt-BR');
    document.getElementById('lancValorTotal').innerText = valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

async function confirmarLancamento() {
    const quantidade = parseInt(document.getElementById('inputQuantidade').value);
    if (isNaN(quantidade) || quantidade <= 0) {
        exibirAlertaCustom('Informe uma quantidade válida.');
        return;
    }
    if (quantidade > estoqueAtual) {
        exibirAlertaCustom(`Estoque insuficiente! Saldo disponível: ${estoqueAtual}`);
        return;
    }
    if (!clienteSelecionado) {
        exibirAlertaCustom('Nenhum cliente selecionado.');
        return;
    }
    const venda = {
        acao: 'venda',
        cliente_id: clienteSelecionado.id,
        cliente_nome: clienteSelecionado.nome,
        produtoId: produtoSelecionado.codprod,
        quantidade: quantidade,
        valorUnitario: produtoSelecionado.preco,
        valorTotal: quantidade * produtoSelecionado.preco
    };
    try {
        const formData = new FormData();
        formData.append('dados', JSON.stringify(venda));
        const res = await fetch(API_URL, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.status === 'ok') {
            exibirAlertaCustom(`Produto adicionado à venda! Valor: R$ ${(quantidade * produtoSelecionado.preco).toFixed(2)}`);
            document.getElementById('modalQuantidade').style.display = 'none';
            await carregarProdutosLancamento();
        } else {
            exibirAlertaCustom('Erro ao registrar venda');
        }
    } catch (e) {
        exibirAlertaCustom('Erro de conexão');
    }
}

/* ============================================
   HISTÓRICO DE VENDAS
   ============================================ */
async function carregarHistoricoVendas() {
    const container = document.getElementById('tabelaHistoricoContainer');
    if (!container) return;
    container.innerHTML = '<div class="loading-message">Carregando histórico...</div>';
    try {
        const vendas = [
            { id: 1, data: '15/06/2024', cliente: 'João Silva', valorTotal: 1250.90, itens: [{ produto: 'Produto A', qtd: 2, preco: 50.00 }] },
            { id: 2, data: '14/06/2024', cliente: 'Maria Oliveira', valorTotal: 89.50, itens: [{ produto: 'Produto B', qtd: 1, preco: 89.50 }] },
            { id: 3, data: '13/06/2024', cliente: 'Carlos Souza', valorTotal: 350.00, itens: [{ produto: 'Produto C', qtd: 5, preco: 70.00 }] }
        ];
        window.vendasHistorico = vendas;
        renderizarHistoricoVendas(vendas);
    } catch (e) {
        container.innerHTML = '<div class="error-message">Erro ao carregar histórico</div>';
    }
}

function renderizarHistoricoVendas(vendas, termo = '') {
    const container = document.getElementById('tabelaHistoricoContainer');
    let filtrados = vendas;
    if (termo) {
        const low = termo.toLowerCase();
        filtrados = vendas.filter(v =>
            v.id.toString().includes(low) ||
            v.cliente.toLowerCase().includes(low) ||
            v.data.includes(low)
        );
    }
    if (!filtrados.length) {
        container.innerHTML = '<div class="placeholder-mensagem">Nenhuma venda encontrada</div>';
        return;
    }
    let html = '<table class="data-table"><thead><tr><th>ID</th><th>Data</th><th>Cliente</th><th>Valor Total</th><th>Ações</th></tr></thead><tbody>';
    filtrados.forEach(v => {
        html += `<tr>
                    <td>${v.id}</td>
                    <td>${v.data}</td>
                    <td>${v.cliente}</td>
                    <td>${Number(v.valorTotal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td><button class="btn-ver-detalhes" data-id="${v.id}" style="background:#1E5A99; color:white; border:none; padding:5px 10px; border-radius:5px;">Ver</button></td>
                 </tr>`;
    });
    html += '</tbody></table>';
    container.innerHTML = html;
    document.querySelectorAll('.btn-ver-detalhes').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = parseInt(btn.dataset.id);
            const venda = window.vendasHistorico.find(v => v.id === id);
            if (venda) {
                let msg = `Itens da venda ${venda.id}:\n`;
                venda.itens.forEach(i => {
                    msg += `- ${i.produto}: ${i.qtd} x R$ ${i.preco.toFixed(2)}\n`;
                });
                exibirAlertaCustom(msg);
            }
        });
    });
}

// Inicializar
navegarPara('tela_login.html');
