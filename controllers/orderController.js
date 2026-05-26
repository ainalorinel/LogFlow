const Order = require('../models/Order');
const User = require('../models/User');
const mongoose = require('mongoose');

// Fonction interne pour simuler le calcul automatique du tarif
const calculerTarifAutomatique = (poids, produitType) => {
    let tarifDeBase = 100000;
    let multiplicateurPoids = poids * 50000;
    let extraProduit = 0;

    if (produitType === 'Denrées périssables' || produitType === 'Carburant') {
        extraProduit = 50000;
    }
    return tarifDeBase + multiplicateurPoids + extraProduit;
};

// @desc    Créer une nouvelle commande (Appelé par le Client)
// @route   POST /api/orders
exports.createOrder = async (req, res) => {
    try {
        const { depart, destination, produitType, poids, dateDebut } = req.body;

        // 🛡️ SÉCURITÉ ACCRUE : Si produitType arrive sous forme d'objet par erreur, on extrait sa valeur textuelle
        let valeurProduit = produitType;
        if (produitType && typeof produitType === 'object') {
            valeurProduit = produitType.produitType || produitType.value || JSON.stringify(produitType);
        }

        const tarifCalcule = calculerTarifAutomatique(poids, valeurProduit);

        const order = await Order.create({
            client: req.user.id, // Utilise bien l'ID utilisateur extrait du token JWT
            depart,
            destination,
            produitType: String(valeurProduit), // 🎯 On s'assure à 100% que c'est un String primitif
            poids,
            dateDebut,
            tarif: tarifCalcule
        });

        res.status(201).json({ success: true, message: 'Commande enregistrée avec succès', data: order });
    } catch (error) {
        console.error("Erreur complète capturée :", error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Obtenir toutes les commandes (Dépend du rôle)
// @route   GET /api/orders
exports.getOrders = async (req, res) => {
    try {
        let query;
        if (req.user.role === 'proprietaire') {
            query = Order.find().populate('client', 'nom telephone').populate('chauffeur', 'nom telephone');
        } else if (req.user.role === 'chauffeur') {
            query = Order.find({ chauffeur: req.user.id }).populate('client', 'nom telephone');
        } else {
            query = Order.find({ client: req.user.id }).populate('chauffeur', 'nom telephone');
        }

        const orders = await query.sort('-createdAt');
        res.status(200).json({ success: true, count: orders.length, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};

// @desc    Obtenir la liste de tous les chauffeurs
// @route   GET /api/auth/drivers
exports.getDrivers = async (req, res) => {
    try {
        const drivers = await User.find({ role: 'chauffeur' }).select('nom telephone email');
        return res.status(200).json({ success: true, count: drivers.length, data: drivers });
    } catch (error) {
        console.error("❌ Erreur dans getDrivers :", error);
        return res.status(500).json({ success: false, message: "Erreur lors de la récupération des chauffeurs.", error: error.message });
    }
};

// @desc    Assigner une commande à un chauffeur spécifique
// @route   PUT /api/orders/:id/assign
exports.assignDriverToOrder = async (req, res) => {
    console.log("=== TENTATIVE D'ASSIGNATION ===");
    console.log("ID de la commande reçu (params) :", req.params.id);
    console.log("ID du chauffeur reçu (body) :", req.body.driverId);
    console.log("===============================");

    try {
        const { driverId } = req.body;
        const orderId = req.params.id;

        // 1. Vérification de la présence des IDs
        if (!driverId || !orderId) {
            return res.status(400).json({
                success: false,
                message: `Données manquantes. Commande: ${orderId}, Chauffeur: ${driverId}`
            });
        }

        // 2. Validation stricte du format des IDs pour éviter le crash 500 de Mongoose
        if (!mongoose.Types.ObjectId.isValid(driverId) || !mongoose.Types.ObjectId.isValid(orderId)) {
            return res.status(400).json({
                success: false,
                message: "L'identifiant de la commande ou du chauffeur est mal formaté."
            });
        }

        // 3. Recherche du chauffeur
        const driver = await User.findById(driverId);
        if (!driver || driver.role !== 'chauffeur') {
            return res.status(404).json({ success: false, message: "Chauffeur introuvable ou rôle invalide." });
        }

        // 4. Recherche de la commande
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Commande introuvable." });
        }

        // 5. Mise à jour et sauvegarde
        order.chauffeur = driverId;
        order.statut = 'en_route';
        await order.save();

        return res.status(200).json({
            success: true,
            message: `La commande a été assignée avec succès à ${driver.nom}.`,
            data: order
        });
    } catch (error) {
        console.error("❌ Erreur d'assignation chauffeur :", error);
        // On renvoie l'erreur explicite pour comprendre le problème dans les logs Expo
        return res.status(500).json({ success: false, message: error.message });
    }
};

// @desc    Mettre à jour le statut d'une course (Appelé par le Chauffeur)
// @route   PUT /api/orders/:id/status
exports.updateStatus = async (req, res) => {
    try {
        const { statut } = req.body;
        let order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Commande introuvable' });
        }

        if (req.user.role === 'chauffeur' && order.chauffeur?.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Vous n\'êtes pas autorisé à modifier cette course' });
        }

        order.statut = statut;
        await order.save();

        res.status(200).json({ success: true, message: `Statut de la commande mis à jour : ${statut}`, data: order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};