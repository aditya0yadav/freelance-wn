const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  } else if (req.query && req.query.key) {
    token = req.query.key;
  }

  if (!token) {
    return res.status(401).json({ code: 401, msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-auth-secret-key');
    req.user = decoded.data || decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, msg: 'Invalid token' });
  }
}

function verifyAdminToken(req, res, next) {
  let token = req.headers['authorization'];
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7);
  }

  if (!token) {
    return res.status(401).json({ code: 401, msg: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-jwt-auth-secret-key');
    req.user = decoded.data || decoded;
    next();
  } catch (err) {
    return res.status(401).json({ code: 401, msg: 'Invalid token' });
  }
}

module.exports = {
  verifyToken,
  verifyAdminToken
};
