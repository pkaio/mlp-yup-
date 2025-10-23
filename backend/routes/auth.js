const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const pool = require('../config/database');
const { authMiddleware } = require('../middleware/auth');
const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Validation schemas
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.pattern.base':
        'O nome de usuário deve conter apenas letras, números ou underscore.',
    }),
  fullName: Joi.string().min(2).max(100).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Register
router.post('/register', async (req, res) => {
  const { error, value } = registerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password, username, fullName } = value;

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id, email_verified FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email ou usuário já existe' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const insertResult = await pool.query(
      `INSERT INTO users (email, password_hash, username, full_name, is_active, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, username, full_name, bio, profile_image_url, role`,
      [email, hashedPassword, username, fullName || null, true, 'user']
    );

    const user = insertResult.rows[0];
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    return res.status(201).json({
      message: 'Usuário criado com sucesso',
      token,
      user,
    });
  } catch (err) {
    console.error('Erro no registro:', err);
    return res.status(500).json({
      error: 'Erro ao criar usuário',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { error, value } = loginSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  const { email, password } = value;

  try {
    const result = await pool.query(
      `SELECT id, email, username, password_hash, full_name, bio, profile_image_url, role
       FROM users
       WHERE email = $1
         AND is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const user = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;

    return res.json({
      message: 'Login realizado com sucesso',
      token,
      user,
    });
  } catch (err) {
    console.error('Erro no login:', err);
    return res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// Verify email
router.post('/verify-email', async (req, res) => {
  return res.status(200).json({
    message: 'Verificação de e-mail não é necessária neste ambiente.',
  });
});

// Resend verification code
router.post('/resend-verification', async (req, res) => {
  return res.status(200).json({
    message: 'Verificação de e-mail não é necessária neste ambiente.',
  });
});

// Get current user
router.get('/me', authMiddleware, async (req, res) => {
  try {
    res.json({ user: req.user });
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro ao buscar usuário' });
  }
});

// Update profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { fullName, bio } = req.body;
    
    const result = await pool.query(
      'UPDATE users SET full_name = $1, bio = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING id, email, username, full_name, bio, profile_image_url, role',
      [fullName || null, bio || null, req.user.id]
    );

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: result.rows[0]
    });

  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({ error: 'Erro ao atualizar perfil' });
  }
});

module.exports = router;
