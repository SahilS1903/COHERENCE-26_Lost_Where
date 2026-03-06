const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { z } = require('zod');
const prisma = require('../lib/prisma');

const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

async function register(req, res) {
  const data = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    return res.status(409).json({ error: 'Email already in use' });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
    select: { id: true, name: true, email: true, createdAt: true },
  });

  const token = signToken(user.id);
  res.status(201).json({ user, token });
}

async function login(req, res) {
  const data = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(data.password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = signToken(user.id);
  res.json({
    user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt },
    token,
  });
}

module.exports = { register, login };
