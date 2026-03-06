const pool = require('../config/database');

exports.register = async (req, res) => {

  const { hostname, ip, os } = req.body;

  await pool.query(
    "INSERT INTO agents (hostname, ip_address, os) VALUES (?, ?, ?)",
    [hostname, ip, os]
  );

  res.json({ message: "Agent registrado" });

};

exports.heartbeat = async (req, res) => {

  const { hostname, cpu, ram, disk } = req.body;

  const [rows] = await pool.query(
    "SELECT id FROM agents WHERE hostname = ?",
    [hostname]
  );

  if (rows.length === 0)
    return res.status(404).json({ error: "Agent não encontrado" });

  const agentId = rows[0].id;

  await pool.query(
    "UPDATE agents SET last_seen = NOW() WHERE id = ?",
    [agentId]
  );

  await pool.query(
    "INSERT INTO system_info (agent_id, cpu, ram, disk) VALUES (?, ?, ?, ?)",
    [agentId, cpu, ram, disk]
  );

  res.json({ message: "Heartbeat recebido" });

};

exports.list = async (req, res) => {

  const [rows] = await pool.query(
    "SELECT *, TIMESTAMPDIFF(SECOND, last_seen, NOW()) as seconds_offline FROM agents"
  );

  res.json(rows);

};