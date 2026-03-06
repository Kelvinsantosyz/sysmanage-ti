require('dotenv').config({ path: __dirname + '/.env' });

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcrypt'); // 👈 FALTAVA ISSO
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

/* =========================
   SERVIR FRONTEND
========================= */
app.use(express.static(path.join(__dirname, '../frontend/public')));

/* =========================
   CONEXÃO MYSQL
========================= */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const SECRET = process.env.JWT_SECRET;

/* =========================
   MIDDLEWARE AUTENTICAÇÃO JWT
========================= */
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' });
  const [scheme, token] = authHeader.split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Formato de token inválido' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

/* =========================
   REGISTRO
========================= */
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Preencha todos os campos" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Senha deve ter pelo menos 6 caracteres" });
    }

    const hash = await bcrypt.hash(password, 10);

    const hasMustChange = await db.query("SHOW COLUMNS FROM users LIKE 'must_change_password'").then(([r]) => r.length > 0).catch(() => false);
    if (hasMustChange) {
      await db.query(
        "INSERT INTO users (name, email, password, must_change_password) VALUES (?, ?, ?, 1)",
        [name, email, hash]
      );
    } else {
      await db.query(
        "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
        [name, email, hash]
      );
    }

    res.json({ message: "Conta criada com sucesso" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao registrar usuário" });
  }
});

/* =========================
   LOGIN
========================= */
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email=?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: "Usuário não encontrado" });
    }

    const user = rows[0];

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({ error: "Senha inválida" });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      SECRET,
      { expiresIn: "8h" }
    );

    const mustChangePassword = user.must_change_password === 1 || user.must_change_password === true;

    res.json({
      token,
      mustChangePassword: !!mustChangePassword,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro no login" });
  }
});

/* =========================
   ALTERAR SENHA (primeiro login ou a qualquer momento)
========================= */
app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres' });
    }

    const [rows] = await db.query('SELECT id, password, must_change_password FROM users WHERE id = ?', [req.user.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = rows[0];
    const isFirstLogin = user.must_change_password === 1 || user.must_change_password === true;

    if (!isFirstLogin) {
      if (!currentPassword) return res.status(400).json({ error: 'Informe a senha atual' });
      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return res.status(401).json({ error: 'Senha atual incorreta' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    const hasMustChange = await db.query("SHOW COLUMNS FROM users LIKE 'must_change_password'").then(([r]) => r.length > 0).catch(() => false);

    if (hasMustChange) {
      await db.query('UPDATE users SET password = ?, must_change_password = 0 WHERE id = ?', [hash, req.user.id]);
    } else {
      await db.query('UPDATE users SET password = ? WHERE id = ?', [hash, req.user.id]);
    }

    res.json({ message: 'Senha alterada com sucesso' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

/* =========================
   COLABORADORES - CRUD
========================= */
app.get('/api/colaboradores', async (req, res) => {
  try {
    const { setor, status } = req.query;
    let sql = 'SELECT * FROM colaboradores WHERE 1=1';
    const params = [];
    if (setor) { sql += ' AND setor = ?'; params.push(setor); }
    if (status) { sql += ' AND status = ?'; params.push(status); }
    sql += ' ORDER BY nome';
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar colaboradores' });
  }
});

app.post('/api/colaboradores', async (req, res) => {
  try {
    const { nome, funcao, telefone, cpf, data_nascimento, setor, status } = req.body;
    if (!nome || !funcao || !cpf || !setor) {
      return res.status(400).json({ error: 'Nome, função, CPF e setor são obrigatórios' });
    }
    const st = (status && (status === 'Inativo' || status === 'Ativo')) ? status : 'Ativo';
    await db.query(
      'INSERT INTO colaboradores (nome, funcao, telefone, cpf, data_nascimento, setor, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [nome, funcao, telefone || null, cpf, data_nascimento || null, setor, st]
    );
    res.json({ message: 'Colaborador cadastrado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'CPF já cadastrado' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar colaborador' });
  }
});

app.get('/api/colaboradores/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM colaboradores WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar colaborador' });
  }
});

app.put('/api/colaboradores/:id', async (req, res) => {
  try {
    const { nome, funcao, telefone, cpf, data_nascimento, setor, status } = req.body;
    if (!nome || !funcao || !cpf || !setor) {
      return res.status(400).json({ error: 'Nome, função, CPF e setor são obrigatórios' });
    }
    const st = (status === 'Inativo' || status === 'Ativo') ? status : 'Ativo';
    const [r] = await db.query(
      'UPDATE colaboradores SET nome=?, funcao=?, telefone=?, cpf=?, data_nascimento=?, setor=?, status=? WHERE id=?',
      [nome, funcao, telefone || null, cpf, data_nascimento || null, setor, st, req.params.id]
    );
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json({ message: 'Colaborador atualizado' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'CPF já cadastrado' });
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar colaborador' });
  }
});

app.delete('/api/colaboradores/:id', async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM colaboradores WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Colaborador não encontrado' });
    res.json({ message: 'Colaborador excluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir colaborador' });
  }
});

/* =========================
   ASSETS (MÁQUINAS / INVENTÁRIO) - CRUD
========================= */
function hasAssetsSetor() {
  return db.query("SHOW COLUMNS FROM assets LIKE 'setor'").then(([r]) => r.length > 0).catch(() => false);
}
function hasAssetsPatrimonio() {
  return db.query("SHOW COLUMNS FROM assets LIKE 'patrimonio'").then(([r]) => r.length > 0).catch(() => false);
}

app.get('/api/assets', async (req, res) => {
  try {
    const { setor, status, tipo } = req.query;
    const hasSetor = await hasAssetsSetor();
    const hasPatrimonio = await hasAssetsPatrimonio();
    const extra = [hasSetor && 'setor', hasPatrimonio && 'patrimonio', hasPatrimonio && 'numero_serie'].filter(Boolean);
    const sel = ['id', 'name', 'type', 'status', ...extra].join(', ');
    let sql = 'SELECT ' + sel + ' FROM assets WHERE 1=1';
    const params = [];
    if (status) { sql += ' AND status = ?'; params.push(status); }
    if (tipo) { sql += ' AND type = ?'; params.push(tipo); }
    if (hasSetor && setor) { sql += ' AND setor = ?'; params.push(setor); }
    sql += ' ORDER BY id DESC';
    const [rows] = await db.query(sql, params);
    const list = rows.map(r => ({
      id: r.id, nome: r.name, tipo: r.type, status: r.status,
      setor: r.setor || null,
      patrimonio: r.patrimonio || null,
      numero_serie: r.numero_serie || null
    }));
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao listar ativos' });
  }
});

app.post('/api/assets', async (req, res) => {
  try {
    const { name, type, status, setor, patrimonio, numero_serie } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    const st = (status === 'Inativo' || status === 'Ativo') ? status : 'Ativo';
    const hasSetor = await hasAssetsSetor();
    const hasPatrimonio = await hasAssetsPatrimonio();
    if (hasPatrimonio) {
      const cols = ['name', 'type', 'status'].concat(hasSetor ? ['setor'] : []).concat(['patrimonio', 'numero_serie']);
      const vals = [name, type, st].concat(hasSetor ? [setor || null] : []).concat([patrimonio || null, numero_serie || null]);
      await db.query('INSERT INTO assets (' + cols.join(', ') + ') VALUES (' + cols.map(() => '?').join(', ') + ')', vals);
    } else if (hasSetor) {
      await db.query('INSERT INTO assets (name, type, status, setor) VALUES (?, ?, ?, ?)', [name, type, st, setor || null]);
    } else {
      await db.query('INSERT INTO assets (name, type, status) VALUES (?, ?, ?)', [name, type, st]);
    }
    res.json({ message: 'Ativo cadastrado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao cadastrar ativo' });
  }
});

app.get('/api/assets/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM assets WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Ativo não encontrado' });
    const r = rows[0];
    res.json({
      id: r.id, nome: r.name, tipo: r.type, status: r.status, setor: r.setor || null,
      patrimonio: r.patrimonio != null ? r.patrimonio : null,
      numero_serie: r.numero_serie != null ? r.numero_serie : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao buscar ativo' });
  }
});

app.put('/api/assets/:id', async (req, res) => {
  try {
    const { name, type, status, setor, patrimonio, numero_serie } = req.body;
    if (!name || !type) return res.status(400).json({ error: 'Nome e tipo são obrigatórios' });
    const st = (status === 'Inativo' || status === 'Ativo') ? status : 'Ativo';
    const hasSetor = await hasAssetsSetor();
    const hasPatrimonio = await hasAssetsPatrimonio();
    if (hasPatrimonio) {
      const setPart = hasSetor
        ? 'name=?, type=?, status=?, setor=?, patrimonio=?, numero_serie=?'
        : 'name=?, type=?, status=?, patrimonio=?, numero_serie=?';
      const setVals = hasSetor
        ? [name, type, st, setor || null, patrimonio || null, numero_serie || null, req.params.id]
        : [name, type, st, patrimonio || null, numero_serie || null, req.params.id];
      const [r] = await db.query('UPDATE assets SET ' + setPart + ' WHERE id=?', setVals);
      if (r.affectedRows === 0) return res.status(404).json({ error: 'Ativo não encontrado' });
    } else if (hasSetor) {
      const [r] = await db.query('UPDATE assets SET name=?, type=?, status=?, setor=? WHERE id=?', [name, type, st, setor || null, req.params.id]);
      if (r.affectedRows === 0) return res.status(404).json({ error: 'Ativo não encontrado' });
    } else {
      const [r] = await db.query('UPDATE assets SET name=?, type=?, status=? WHERE id=?', [name, type, st, req.params.id]);
      if (r.affectedRows === 0) return res.status(404).json({ error: 'Ativo não encontrado' });
    }
    res.json({ message: 'Ativo atualizado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao atualizar ativo' });
  }
});

app.delete('/api/assets/:id', async (req, res) => {
  try {
    const [r] = await db.query('DELETE FROM assets WHERE id = ?', [req.params.id]);
    if (r.affectedRows === 0) return res.status(404).json({ error: 'Ativo não encontrado' });
    res.json({ message: 'Ativo excluído' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao excluir ativo' });
  }
});

/* =========================
   DASHBOARD POR SETOR E MÁQUINAS
========================= */
app.get('/api/dashboard/summary', async (req, res) => {
  try {
    const [colRows] = await db.query('SELECT setor, status, COUNT(*) AS total FROM colaboradores GROUP BY setor, status').catch(() => [[]]);
    const [assetRows] = await db.query('SELECT type, status, COUNT(*) AS total FROM assets GROUP BY type, status').catch(() => [[]]);
    const hasSetor = await hasAssetsSetor();
    let assetBySetor = [];
    if (hasSetor) {
      const [setorRows] = await db.query('SELECT setor, COUNT(*) AS total FROM assets GROUP BY setor');
      assetBySetor = setorRows;
    }
    const colaboradoresBySetor = {};
    colRows.forEach(r => {
      if (!colaboradoresBySetor[r.setor]) colaboradoresBySetor[r.setor] = { ativos: 0, inativos: 0 };
      if (r.status === 'Ativo') colaboradoresBySetor[r.setor].ativos += Number(r.total);
      else colaboradoresBySetor[r.setor].inativos += Number(r.total);
    });
    const porSetor = Object.keys(colaboradoresBySetor).map(setor => ({
      setor,
      colaboradores: (colaboradoresBySetor[setor].ativos || 0) + (colaboradoresBySetor[setor].inativos || 0),
      ativos: colaboradoresBySetor[setor].ativos || 0,
      inativos: colaboradoresBySetor[setor].inativos || 0,
      maquinas: (assetBySetor.find(a => (a.setor || '') === setor) || {}).total || 0
    }));
    let totalMachines = 0, totalSoftwares = 0, maintenance = 0, ativos = 0, inativos = 0;
    assetRows.forEach(r => {
      const n = Number(r.total);
      const t = (r.type || '').toLowerCase();
      if (t === 'software') totalSoftwares += n;
      else totalMachines += n;
      if ((r.status || '').toLowerCase() === 'manutenção') maintenance += n;
      else if ((r.status || '').toLowerCase() === 'ativo') ativos += n;
      else inativos += n;
    });
    const [latest] = await db.query('SELECT id, name, type, status FROM assets ORDER BY id DESC LIMIT 10').catch(() => [[]]);
    const latestAssets = latest.map(r => ({ id: r.id, nome: r.name, tipo: r.type, status: r.status }));
    res.json({
      totalMachines,
      totalSoftwares,
      maintenance,
      ativos,
      inativos,
      porSetor,
      latestAssets
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard' });
  }
});

app.get('/api/setores', async (req, res) => {
  try {
    const [c] = await db.query('SELECT DISTINCT setor FROM colaboradores WHERE setor IS NOT NULL AND setor != "" ORDER BY setor');
    const setores = (c || []).map(r => r.setor);
    res.json(setores);
  } catch (err) {
    res.json([]);
  }
});

/* =========================
   ROTA PADRÃO
========================= */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/public/login.html'));
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
