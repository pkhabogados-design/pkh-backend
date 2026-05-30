const express = require('express');
const jwt     = require('jsonwebtoken');
const router  = express.Router();

// POST /api/auth/login  — acepta el PIN actual
router.post('/login', (req, res) => {
  const { pin } = req.body;
  if (!pin || pin !== process.env.ACCESS_PIN) {
    return res.status(401).json({ error: 'PIN incorrecto' });
  }
  const token = jwt.sign({ user: 'pkh' }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
  res.json({ token });
});

module.exports = router;
