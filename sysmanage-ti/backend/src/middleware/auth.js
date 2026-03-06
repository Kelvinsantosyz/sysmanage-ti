const jwt = require('jsonwebtoken');

const SECRET = "SUPER_SECRET_KEY";

module.exports = (req, res, next) => {

  try {

    const header = req.headers.authorization;

    if (!header)
      return res.status(401).json({ error: "Token necessário" });

    const token = header.replace("Bearer ", "");

    const decoded = jwt.verify(token, SECRET);

    req.user = decoded;

    next();

  } catch {

    return res.status(401).json({ error: "Token inválido" });

  }

};