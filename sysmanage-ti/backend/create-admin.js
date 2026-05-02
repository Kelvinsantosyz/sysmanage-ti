require('dotenv').config({ path: __dirname + '/.env' })
const bcrypt = require('bcrypt')
const mysql = require('mysql2/promise')

async function createAdmin() {
  const db = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  })

  const email = 'admin@sysmanage.com'
  const password = 'Admin@123'
  const name = 'Administrador'
  const role = 'admin'

  const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email])
  if (exists.length > 0) {
    console.log(`⚠️  Usuário com email "${email}" já existe! Atualizando para admin...`)
    const hash = await bcrypt.hash(password, 10)
    await db.query('UPDATE users SET role = ?, password = ?, must_change_password = 0 WHERE email = ?', [role, hash, email])
    console.log('✅ Usuário atualizado para admin com sucesso!')
  } else {
    const hash = await bcrypt.hash(password, 10)
    await db.query(
      'INSERT INTO users (name, email, password, must_change_password, role) VALUES (?, ?, ?, 0, ?)',
      [name, email, hash, role]
    )
    console.log('✅ Usuário admin criado com sucesso!')
  }

  console.log('---')
  console.log('📧 Email:', email)
  console.log('🔑 Senha:', password)
  console.log('👑 Papel: admin')

  await db.end()
}

createAdmin().catch(err => {
  console.error('❌ Erro:', err.message)
  process.exit(1)
})
