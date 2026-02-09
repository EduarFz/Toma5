const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'toma5_cerrejon_secret_key_2026';
const JWT_EXPIRES_IN = '365d'; // 365 días (sesión persistente)

/**
 * Genera un token JWT para un usuario
 * @param {Object} payload - Datos del usuario (id, cedula, rol)
 * @returns {String} Token JWT
 */
const generarToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

/**
 * Verifica y decodifica un token JWT
 * @param {String} token - Token a verificar
 * @returns {Object} Datos decodificados del token
 */
const verificarToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Token inválido o expirado');
  }
};

module.exports = {
  generarToken,
  verificarToken,
};
