require('dotenv').config({ path: __dirname + '/.env' })

const express = require('express')
const mysql = require('mysql2/promise')
const cors = require('cors')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const sanitizeHtml = require('sanitize-html')

const app = express()

/* =========================
   MIDDLEWARES
========================= */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://cdn.jsdelivr.net"]
    },
  },
}))
app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:3000', credentials: true }))
app.use(express.json())
app.use(cookieParser())

function xssSanitizer(req, res, next) {
  const sanitize = (obj) => {
    for (let key in obj) {
      if (typeof obj[key] === 'string') {
        obj[key] = sanitizeHtml(obj[key], {
          allowedTags: [], // Remove todas as tags HTML
          allowedAttributes: {}
        });
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
  };
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
}
app.use(xssSanitizer)

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de login. Tente novamente mais tarde." },
  standardHeaders: true,
  legacyHeaders: false,
})

const publicPath = path.resolve(__dirname, '../frontend/public')
app.use(express.static(publicPath))

/* =========================
   DATABASE
========================= */
const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10
})

const SECRET = process.env.JWT_SECRET

/* =========================
   AUTH MIDDLEWARE
========================= */
function authMiddleware(req, res, next) {
  const token = req.cookies.token
  if (!token) return res.status(401).json({ error: "Não autorizado" })

  try {
    req.user = jwt.verify(token, SECRET)
    next()
  } catch (err) {
    res.clearCookie('token')
    return res.status(401).json({ error: "Sessão expirada" })
  }
}

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: "Acesso negado. Papel não identificado." })
    }
    const userRole = req.user.role.toLowerCase()
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ error: `Acesso restrito. Requer um dos seguintes perfis: ${allowedRoles.join(', ')}` })
    }
    next()
  }
}

/* =========================
   AUTH & USER ROUTES
========================= */
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  const [rows] = await db.query("SELECT id, name, email, must_change_password, role FROM users WHERE id=?", [req.user.id])
  if (rows.length === 0) return res.status(401).json({ error: "Usuário não encontrado" })
  res.json(rows[0])
})

app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: "Preencha todos os campos" })

    const [exists] = await db.query("SELECT id FROM users WHERE email=?", [email])
    if (exists.length > 0) return res.status(400).json({ error: "Email já cadastrado" })

    const userRole = 'leitura'
    const hash = await bcrypt.hash(password, 10)
    await db.query("INSERT INTO users (name,email,password,must_change_password,role) VALUES (?,?,?,1,?)", [name, email, hash, userRole])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Erro ao registrar usuário" })
  }
})

/* =========================
   USER MANAGEMENT (ADMIN)
========================= */
app.get('/api/users', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT id, name, email, role FROM users ORDER BY name ASC")
    res.json(rows)
  } catch (err) {
    res.status(500).json({ error: "Erro ao buscar usuários" })
  }
})

app.put('/api/users/:id/role', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.body
    const allowed = ['admin', 'tecnico', 'leitura']
    if (!role || !allowed.includes(role.toLowerCase())) {
      return res.status(400).json({ error: "Papel inválido. Use: admin, tecnico ou leitura" })
    }
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: "Você não pode alterar seu próprio papel" })
    }
    await db.query("UPDATE users SET role=? WHERE id=?", [role.toLowerCase(), req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Erro ao atualizar papel" })
  }
})

app.delete('/api/users/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user.id)) {
      return res.status(400).json({ error: "Você não pode excluir sua própria conta" })
    }
    await db.query("DELETE FROM users WHERE id=?", [req.params.id])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Erro ao excluir usuário" })
  }
})

app.put('/api/users/:id/reset-password', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Senha inválida (mínimo 6 caracteres)" })
    const [rows] = await db.query("SELECT id FROM users WHERE id=?", [req.params.id])
    if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" })
    const hash = await bcrypt.hash(newPassword, 10)
    await db.query("UPDATE users SET password=?, must_change_password=1 WHERE id=?", [hash, req.params.id])
    res.json({ message: "Senha redefinida com sucesso. O usuário deverá alterá-la no próximo acesso." })
  } catch (err) {
    res.status(500).json({ error: "Erro ao redefinir senha" })
  }
})
app.post('/api/users', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: "Preencha todos os campos" })
    const allowed = ['admin', 'tecnico', 'leitura']
    const userRole = (role && allowed.includes(role.toLowerCase())) ? role.toLowerCase() : 'leitura'
    const [exists] = await db.query("SELECT id FROM users WHERE email=?", [email])
    if (exists.length > 0) return res.status(400).json({ error: "Email já cadastrado" })
    const hash = await bcrypt.hash(password, 10)
    await db.query("INSERT INTO users (name,email,password,must_change_password,role) VALUES (?,?,?,1,?)", [name, email, hash, userRole])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar usuário" })
  }
})


app.post('/api/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body
    const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email])
    if (rows.length === 0) return res.status(401).json({ error: "Credenciais inválidas" })

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" })

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "8h" })
    res.cookie('token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 })

    res.json({ mustChangePassword: user.must_change_password === 1, user: { id: user.id, name: user.name, role: user.role } })
  } catch (err) {
    res.status(500).json({ error: "Erro no login" })
  }
})

app.post('/api/logout', (req, res) => {
  res.clearCookie('token')
  res.json({ message: "Sessão encerrada" })
})

app.put('/api/auth/change-password', authMiddleware, async (req, res) => {
  try {
    const { newPassword, currentPassword } = req.body
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Nova senha inválida (mínimo 6 caracteres)" })

    const [rows] = await db.query("SELECT password, must_change_password FROM users WHERE id=?", [req.user.id])
    if (rows.length === 0) return res.status(404).json({ error: "Usuário não encontrado" })
    const user = rows[0]

    if (user.must_change_password !== 1) {
      if (!currentPassword) return res.status(400).json({ error: "Senha atual é obrigatória" })
      const valid = await bcrypt.compare(currentPassword, user.password)
      if (!valid) return res.status(400).json({ error: "Senha atual incorreta" })
    }

    const hash = await bcrypt.hash(newPassword, 10)
    await db.query("UPDATE users SET password=?, must_change_password=0 WHERE id=?", [hash, req.user.id])
    res.json({ message: "Senha alterada com sucesso" })
  } catch (err) {
    res.status(500).json({ error: "Erro ao alterar senha" })
  }
})

/* =========================
   DASHBOARD
========================= */
app.get('/api/dashboard/summary', authMiddleware, async (req, res) => {
  try {
    const [[machines]] = await db.query("SELECT COUNT(*) count FROM assets WHERE type!='Software'")
    const [[softwares]] = await db.query("SELECT COUNT(*) count FROM assets WHERE type='Software'")
    const [[colabs]] = await db.query("SELECT COUNT(*) count FROM colaboradores")
    const [[colabsAtivos]] = await db.query("SELECT COUNT(*) count FROM colaboradores WHERE status='Ativo'")
    const [[sectors]] = await db.query("SELECT COUNT(*) count FROM setores")
    const [[totalUsers]] = await db.query("SELECT COUNT(*) count FROM users")
    const [status] = await db.query("SELECT status, COUNT(*) count FROM assets GROUP BY status")
    const [porSetor] = await db.query("SELECT setor, COUNT(*) maquinas FROM assets WHERE type!='Software' GROUP BY setor ORDER BY maquinas DESC LIMIT 8")
    const [licExpiring] = await db.query(
      "SELECT nome, data_expiracao FROM assets WHERE type='Software' AND data_expiracao IS NOT NULL AND data_expiracao <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) AND data_expiracao >= CURDATE() ORDER BY data_expiracao ASC LIMIT 5"
    )
    const [licExpired] = await db.query(
      "SELECT nome, data_expiracao FROM assets WHERE type='Software' AND data_expiracao IS NOT NULL AND data_expiracao < CURDATE() ORDER BY data_expiracao DESC LIMIT 5"
    )
    const [[estoque]] = await db.query("SELECT COUNT(*) count FROM assets WHERE status='Estoque'")

    res.json({
      totalMachines: machines.count || 0,
      totalSoftwares: softwares.count || 0,
      totalColabs: colabs.count || 0,
      colabsAtivos: colabsAtivos.count || 0,
      totalSectors: sectors.count || 0,
      totalUsers: totalUsers.count || 0,
      totalEstoque: estoque.count || 0,
      ativos: status.find(s => s.status === 'Ativo')?.count || 0,
      inativos: status.find(s => s.status === 'Inativo')?.count || 0,
      porSetor,
      licExpiring,
      licExpired
    })
  } catch (err) {
    res.status(500).json({ error: "Erro no dashboard" })
  }
})

/* =========================
   ASSETS CRUD
========================= */
app.get('/api/assets', authMiddleware, async (req, res) => {
  try {
    const { type } = req.query
    let query = "SELECT * FROM assets"
    let params = []
    if (type) { query += " WHERE type = ?"; params.push(type) }
    const [rows] = await db.query(query, params)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: "Erro ao buscar ativos" }) }
})

app.get('/api/assets/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM assets WHERE id = ?", [req.params.id])
    res.json(rows[0] || null)
  } catch (err) { res.status(500).json({ error: "Erro ao buscar ativo" }) }
})

app.post('/api/assets', authMiddleware, authorizeRoles('admin', 'tecnico'), async (req, res) => {
  try {

    const { nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, data_expiracao, colaborador_id } = req.body;
    const expFormatada = (!data_expiracao || data_expiracao.trim() === "") ? null : data_expiracao;
    const colabIdFinal = colaborador_id ? Number(colaborador_id) : null;

    const [result] = await db.query(
      "INSERT INTO assets (nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, data_expiracao, colaborador_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, expFormatada, colabIdFinal]
    )
    res.json({ success: true, id: result.insertId })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao criar ativo" })
  }
})

app.put('/api/assets/:id', authMiddleware, authorizeRoles('admin', 'tecnico'), async (req, res) => {
  try {

    const { nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, data_expiracao, colaborador_id } = req.body;
    const expFormatada = (!data_expiracao || data_expiracao.trim() === "") ? null : data_expiracao;
    const colabIdFinal = colaborador_id ? Number(colaborador_id) : null;

    await db.query(
      "UPDATE assets SET nome=?, type=?, patrimonio=?, numero_serie=?, status=?, setor=?, fabricante=?, versao=?, chave_licenca=?, data_expiracao=?, colaborador_id=? WHERE id=?",
      [nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, expFormatada, colabIdFinal, req.params.id]
    )
    res.json({ success: true })
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao atualizar ativo" })
  }
})

app.delete('/api/assets/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    await db.query("DELETE FROM assets WHERE id = ?", [req.params.id])
    res.json({ success: true, message: "Ativo excluído" })
  } catch (err) { res.status(500).json({ error: "Erro ao excluir ativo" }) }
})

/* =========================
   COLABORADORES CRUD
========================= */
app.get('/api/colaboradores', authMiddleware, async (req, res) => {
  try {
    const { setor, status } = req.query
    let query = "SELECT * FROM colaboradores WHERE 1=1"
    let params = []
    if (setor) { query += " AND setor = ?"; params.push(setor); }
    if (status) { query += " AND status = ?"; params.push(status); }
    const [rows] = await db.query(query, params)
    res.json(rows)
  } catch (err) { res.status(500).json({ error: "Erro ao buscar colaboradores" }) }
})

app.get('/api/colaboradores/:id', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM colaboradores WHERE id = ?", [req.params.id])
    res.json(rows[0] || null)
  } catch (err) { res.status(500).json({ error: "Erro ao buscar colaborador" }) }
})

app.post('/api/colaboradores', authMiddleware, authorizeRoles('admin', 'tecnico'), async (req, res) => {
  try {
    const { nome, funcao, cpf, telefone, data_nascimento, setor, status } = req.body
    const dataFormatada = (!data_nascimento || data_nascimento.trim() === "") ? null : data_nascimento;

    const [result] = await db.query(
      "INSERT INTO colaboradores (nome, funcao, cpf, telefone, data_nascimento, setor, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [nome, funcao, cpf, telefone, dataFormatada, setor, status]
    )
    res.json({ success: true, id: result.insertId })
  } catch (err) { res.status(500).json({ error: "Erro ao criar colaborador" }) }
})

app.put('/api/colaboradores/:id', authMiddleware, authorizeRoles('admin', 'tecnico'), async (req, res) => {
  try {
    const { nome, funcao, cpf, telefone, data_nascimento, setor, status } = req.body
    const dataFormatada = (!data_nascimento || data_nascimento.trim() === "") ? null : data_nascimento;

    await db.query(
      "UPDATE colaboradores SET nome=?, funcao=?, cpf=?, telefone=?, data_nascimento=?, setor=?, status=? WHERE id=?",
      [nome, funcao, cpf, telefone, dataFormatada, setor, status, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar colaborador" }) }
})

app.delete('/api/colaboradores/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    await db.query("DELETE FROM colaboradores WHERE id = ?", [req.params.id])
    res.json({ success: true, message: "Colaborador excluído" })
  } catch (err) { res.status(500).json({ error: "Erro ao excluir colaborador" }) }
})

/* =========================
   SETORES CRUD 
========================= */
app.get('/api/setores', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM setores ORDER BY nome ASC")
    res.json(rows)
  } catch (err) { res.status(500).json({ error: "Erro ao buscar setores" }) }
})

app.post('/api/setores', authMiddleware, authorizeRoles('admin', 'tecnico'), async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || nome.trim() === '') return res.status(400).json({ error: "O nome do setor é obrigatório." });

    const [result] = await db.query("INSERT INTO setores (nome) VALUES (?)", [nome.trim()])
    res.json({ success: true, id: result.insertId })
  } catch (err) { res.status(500).json({ error: "Erro ao criar setor (Nome já existe?)" }) }
})

app.put('/api/setores/:id', authMiddleware, authorizeRoles('admin', 'tecnico'), async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || nome.trim() === '') return res.status(400).json({ error: "O nome do setor é obrigatório." });

    await db.query("UPDATE setores SET nome=? WHERE id=?", [nome.trim(), req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar setor" }) }
})

app.delete('/api/setores/:id', authMiddleware, authorizeRoles('admin'), async (req, res) => {
  try {
    await db.query("DELETE FROM setores WHERE id = ?", [req.params.id])
    res.json({ success: true, message: "Setor excluído" })
  } catch (err) { res.status(500).json({ error: "Erro ao excluir setor" }) }
})

/* =========================
   DEFAULT ROUTE & SERVER
========================= */
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'login.html'))
})

const PORT = process.env.PORT || 3001
const server = app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Erro: A porta ${PORT} já está em uso.`)
    console.error(`   Feche o outro processo e tente novamente.\n`)
  } else {
    console.error('Erro no servidor:', err)
  }
  process.exit(1)
})