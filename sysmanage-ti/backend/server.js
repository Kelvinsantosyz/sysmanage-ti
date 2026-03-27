require('dotenv').config({ path: __dirname + '/.env' })

const express = require('express')
const mysql = require('mysql2/promise')
const cors = require('cors')
const path = require('path')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const cookieParser = require('cookie-parser')

const app = express()

/* =========================
   MIDDLEWARES
========================= */
app.use(cors({ origin: true, credentials: true }))
app.use(express.json())
app.use(cookieParser())

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

    const hash = await bcrypt.hash(password, 10)
    await db.query("INSERT INTO users (name,email,password,must_change_password) VALUES (?,?,?,1)", [name, email, hash])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: "Erro ao registrar usuário" })
  }
})

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email])
    if (rows.length === 0) return res.status(401).json({ error: "Credenciais inválidas" })

    const user = rows[0]
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ error: "Credenciais inválidas" })

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, SECRET, { expiresIn: "8h" })
    res.cookie('token', token, { httpOnly: true, secure: false, sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60 * 1000 })
    
    // Retorna a role para o frontend aplicar as permissões
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
    const { newPassword } = req.body
    if (!newPassword || newPassword.length < 6) return res.status(400).json({ error: "Senha inválida" })
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
    const [status] = await db.query("SELECT status, COUNT(*) count FROM assets GROUP BY status")
    const [porSetor] = await db.query("SELECT setor, COUNT(*) maquinas FROM assets WHERE type!='Software' GROUP BY setor")

    res.json({
      totalMachines: machines.count || 0,
      totalSoftwares: softwares.count || 0,
      ativos: status.find(s => s.status === "Ativo")?.count || 0,
      inativos: status.find(s => s.status === "Inativo")?.count || 0,
      porSetor
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

app.post('/api/assets', authMiddleware, async (req, res) => {
  try {
    const { nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, data_expiracao } = req.body;
    const expFormatada = (!data_expiracao || data_expiracao.trim() === "") ? null : data_expiracao;

    const [result] = await db.query(
      "INSERT INTO assets (nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, data_expiracao) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, expFormatada]
    )
    res.json({ success: true, id: result.insertId })
  } catch (err) {
    res.status(500).json({ error: "Erro ao criar ativo" })
  }
})

app.put('/api/assets/:id', authMiddleware, async (req, res) => {
  try {
    const { nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, data_expiracao } = req.body;
    const expFormatada = (!data_expiracao || data_expiracao.trim() === "") ? null : data_expiracao;

    await db.query(
      "UPDATE assets SET nome=?, type=?, patrimonio=?, numero_serie=?, status=?, setor=?, fabricante=?, versao=?, chave_licenca=?, data_expiracao=? WHERE id=?",
      [nome, type, patrimonio, numero_serie, status, setor, fabricante, versao, chave_licenca, expFormatada, req.params.id]
    )
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar ativo" }) }
})

app.delete('/api/assets/:id', authMiddleware, async (req, res) => {
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

app.post('/api/colaboradores', authMiddleware, async (req, res) => {
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

app.put('/api/colaboradores/:id', authMiddleware, async (req, res) => {
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

app.delete('/api/colaboradores/:id', authMiddleware, async (req, res) => {
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

app.post('/api/setores', authMiddleware, async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || nome.trim() === '') return res.status(400).json({ error: "O nome do setor é obrigatório." });

    const [result] = await db.query("INSERT INTO setores (nome) VALUES (?)", [nome.trim()])
    res.json({ success: true, id: result.insertId })
  } catch (err) { res.status(500).json({ error: "Erro ao criar setor (Nome já existe?)" }) }
})

app.put('/api/setores/:id', authMiddleware, async (req, res) => {
  try {
    const { nome } = req.body;
    if (!nome || nome.trim() === '') return res.status(400).json({ error: "O nome do setor é obrigatório." });

    await db.query("UPDATE setores SET nome=? WHERE id=?", [nome.trim(), req.params.id])
    res.json({ success: true })
  } catch (err) { res.status(500).json({ error: "Erro ao atualizar setor" }) }
})

app.delete('/api/setores/:id', authMiddleware, async (req, res) => {
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

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Servidor rodando: http://localhost:${PORT}`)
})