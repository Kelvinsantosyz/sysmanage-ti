-- Tabela de colaboradores (execute no MySQL se ainda não existir)
CREATE TABLE IF NOT EXISTS colaboradores (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  funcao VARCHAR(80) NOT NULL,
  telefone VARCHAR(20) DEFAULT NULL,
  cpf VARCHAR(14) NOT NULL UNIQUE,
  data_nascimento DATE DEFAULT NULL,
  setor VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Ativo',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Opcional: adicionar setor na tabela assets (para filtrar máquinas por setor)
-- ALTER TABLE assets ADD COLUMN setor VARCHAR(80) DEFAULT NULL;

-- Patrimônio e número de série (preenchimento manual nos ativos)
-- ALTER TABLE assets ADD COLUMN patrimonio VARCHAR(50) DEFAULT NULL;
-- ALTER TABLE assets ADD COLUMN numero_serie VARCHAR(80) DEFAULT NULL;
