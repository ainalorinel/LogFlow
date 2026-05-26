const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Accès non autorisé, token invalide' });
        }
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Accès non autorisé, aucun token fourni' });
    }
};

// Middleware pour restreindre l'accès selon les rôles (ex: authorize('proprietaire'))
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                message: `Le rôle '${req.user ? req.user.role : 'inconnu'}' n'est pas autorisé à accéder à cette ressource` 
            });
        }
        next();
    };
};

module.exports = { protect, authorize };