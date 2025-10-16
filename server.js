const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'produtos.json');
const CLIENTES_FILE = path.join(__dirname, 'clientes.json');
const ENVIOS_FILE = path.join(__dirname, 'envios.json');


app.use(cors());
app.use(express.json());

// Helpers para clientes
function readClientes() {
  if (!fs.existsSync(CLIENTES_FILE)) return [];
  const data = fs.readFileSync(CLIENTES_FILE, 'utf8');
  return data ? JSON.parse(data) : [];
}
function writeClientes(clientes) {
  fs.writeFileSync(CLIENTES_FILE, JSON.stringify(clientes, null, 2));
}

// Helpers para envios
function readEnvios() {
  if (!fs.existsSync(ENVIOS_FILE)) return [];
  const data = fs.readFileSync(ENVIOS_FILE, 'utf8');
  return data ? JSON.parse(data) : [];
}
function writeEnvios(envios) {
  fs.writeFileSync(ENVIOS_FILE, JSON.stringify(envios, null, 2));
}

// Helper to read products from JSON
function readProdutos() {
  if (!fs.existsSync(DATA_FILE)) return [];
  const data = fs.readFileSync(DATA_FILE, 'utf8');
  return data ? JSON.parse(data) : [];
}

// Helper to write products to JSON
function writeProdutos(produtos) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(produtos, null, 2));
}


// Listar todos os produtos
app.get('/produtos', (req, res) => {
  const produtos = readProdutos();
  res.json(produtos);
});

// Listar um produto pelo id
app.get('/produtos/:id', (req, res) => {
  const { id } = req.params;
  const produtos = readProdutos();
  const produto = produtos.find(p => p.id === id);
  if (!produto) return res.status(404).json({ error: 'Produto não encontrado.' });
  res.json(produto);
});

// Cadastrar produto
app.post('/produtos', (req, res) => {
  const { nome, preco, descricao, imagem } = req.body;
  if (!nome || !preco || !descricao || !imagem) {
    return res.status(400).json({ error: 'Todos os campos são obrigatórios.' });
  }
  const produtos = readProdutos();
  const novoProduto = {
    id: Date.now().toString(),
    nome,
    preco,
    descricao,
    imagem
  };
  produtos.push(novoProduto);
  writeProdutos(produtos);
  res.status(201).json(novoProduto);
});

// Editar produto
app.put('/produtos/:id', (req, res) => {
  const { id } = req.params;
  const { nome, preco, descricao, imagem } = req.body;
  const produtos = readProdutos();
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado.' });
  produtos[idx] = { id, nome, preco, descricao, imagem };
  writeProdutos(produtos);
  res.json(produtos[idx]);
});

// Excluir produto
app.delete('/produtos/:id', (req, res) => {
  const { id } = req.params;
  let produtos = readProdutos();
  const idx = produtos.findIndex(p => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Produto não encontrado.' });
  produtos = produtos.filter(p => p.id !== id);
  writeProdutos(produtos);
  res.status(204).end();
});


// CRUD de clientes
app.get('/clientes', (req, res) => {
  const clientes = readClientes();
  res.json(clientes);
});

app.post('/clientes', (req, res) => {
  const { nome, endereco } = req.body;
  if (!nome || !endereco) {
    return res.status(400).json({ error: 'Nome e endereço são obrigatórios.' });
  }
  const clientes = readClientes();
  const novoCliente = {
    id: Date.now().toString(),
    nome,
    endereco
  };
  clientes.push(novoCliente);
  writeClientes(clientes);
  res.status(201).json(novoCliente);
});

app.put('/clientes/:id', (req, res) => {
  const { id } = req.params;
  const { nome, endereco } = req.body;
  const clientes = readClientes();
  const idx = clientes.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Cliente não encontrado.' });
  clientes[idx] = { id, nome, endereco };
  writeClientes(clientes);
  res.json(clientes[idx]);
});

app.delete('/clientes/:id', (req, res) => {
  const { id } = req.params;
  let clientes = readClientes();
  const idx = clientes.findIndex(c => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Cliente não encontrado.' });
  clientes = clientes.filter(c => c.id !== id);
  writeClientes(clientes);
  res.status(204).end();
});

// CRUD de envios
app.get('/envios', (req, res) => {
  const envios = readEnvios();
  const clientes = readClientes();
  
  const enviosComCliente = envios.map(envio => {
    const cliente = clientes.find(c => c.id === envio.cliente_id);
    return {
      ...envio,
      cliente_nome: cliente ? cliente.nome : 'Cliente não encontrado'
    };
  });
  
  res.json(enviosComCliente);
});

app.post('/envios', (req, res) => {
  const { cliente_id, produtos_clientes } = req.body;
  if (!cliente_id || !Array.isArray(produtos_clientes)) {
    return res.status(400).json({ error: 'Campos obrigatórios: cliente_id, produtos_clientes (array).' });
  }
  const valor_total = produtos_clientes.reduce((total, item) => Number(total) + Number(item.preco), 0);
  const envios = readEnvios();
  const novoEnvio = {
    id: Date.now().toString(),
    cliente_id,
    produtos_clientes,
    valor_total,
    status: false
  };
  envios.push(novoEnvio);
  writeEnvios(envios);
  res.status(201).json(novoEnvio);
});

app.put('/envios/:id', (req, res) => {
  const { id } = req.params;
  const { cliente_id, produtos_clientes } = req.body;
  if (!cliente_id || !Array.isArray(produtos_clientes)) {
    return res.status(400).json({ error: 'Campos obrigatórios: cliente_id, produtos_clientes (array).' });
  }
  const valor_total = produtos_clientes.reduce((total, item) => Number(total) + Number(item.preco), 0);
  const envios = readEnvios();
  const idx = envios.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Envio não encontrado.' });
  envios[idx] = { id, cliente_id, produtos_clientes, valor_total, status: false };
  writeEnvios(envios);
  res.json(envios[idx]);
});

app.delete('/envios/:id', (req, res) => {
  const { id } = req.params;
  let envios = readEnvios();
  const idx = envios.findIndex(e => e.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Envio não encontrado.' });
  envios = envios.filter(e => e.id !== id);
  writeEnvios(envios);
  res.status(204).end();
});

app.get('/envios/:id', (req, res) => {
  const { id } = req.params;
  const envios = readEnvios();
  const clientes = readClientes();
  
  const envio = envios.find(e => e.id === id);
  if (!envio) return res.status(404).json({ error: 'Envio não encontrado.' });
  
  const cliente = clientes.find(c => c.id === envio.cliente_id);
  const envioComCliente = {
    ...envio,
    cliente_nome: cliente ? cliente.nome : 'Cliente não encontrado'
  };
  
  res.json(envioComCliente);
});

app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
