const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

const SECRET = process.env.JWT_SECRET;

if (!SECRET) {
    console.error("ERRO CRÍTICO: JWT_SECRET não configurado no .env");
    process.exit(1);
}

exports.register = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Preencha todos os campos" });
        }

        const hash = await bcrypt.hash(password, 10);

        await db.query(
            "INSERT INTO users (name, email, password, must_change_password) VALUES (?, ?, ?, 1)",
            [name, email, hash]
        );

        res.json({ message: "Conta criada com sucesso" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro ao registrar usuário" });
    }
};

exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const [rows] = await db.query("SELECT * FROM users WHERE email=?", [email]);

        // Mensagem genérica por segurança (não confirmar se e-mail existe)
        if (rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const user = rows[0];
        const valid = await bcrypt.compare(password, user.password);

        if (!valid) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        const token = jwt.sign(
            { id: user.id, email: user.email },
            SECRET,
            { expiresIn: "8h" }
        );

       
        res.cookie('token', token, {
            httpOnly: true,      
            secure: process.env.NODE_ENV === 'production', // Apenas HTTPS em produção
            sameSite: 'strict',  
            maxAge: 8 * 60 * 60 * 1000 
        });

        
        res.json({
            mustChangePassword: user.must_change_password === 1 || user.must_change_password === true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Erro interno no login" });
    }
};