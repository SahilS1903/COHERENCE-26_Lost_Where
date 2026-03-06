const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  req.user = user;
  next();
}

module.exports = { authenticate };
