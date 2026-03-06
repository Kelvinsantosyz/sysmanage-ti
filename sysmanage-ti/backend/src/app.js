const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/authRoutes');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas API
app.use('/api', authRoutes);

// Servir frontend (CORRIGIDO)
app.use(express.static(path.join(__dirname, '../../frontend/public')));

// Rota padrão
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/public/login.html'));
});

module.exports = app;