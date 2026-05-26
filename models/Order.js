const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    chauffeur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    depart: {
        adresse: { type: String, required: true },
        lat: { type: Number, required: false },
        lng: { type: Number, required: false }
    },
    destination: {
        adresse: { type: String, required: true },
        lat: { type: Number, required: false },
        lng: { type: Number, required: false }
    },
    produitType: { 
        type: String, 
        required: [true, 'Le type de produit est obligatoire'] 
    },
    poids: { type: Number, required: true },
    dateDebut: { type: Date, required: true },
    tarif: { type: Number, required: true },
    statut: { type: String, enum: ['en_attente', 'assignee', 'en_route', 'charge', 'livre', 'annule'], default: 'en_attente' },
    createdAt: { type: Date, default: Date.now }
}, {
    autoIndex: true // ✨ Force Mongoose à reconstruire les règles et index au démarrage
});

// Optionnel mais recommandé en développement pour vider les vieux modèles en mémoire :
mongoose.models = {};

module.exports = mongoose.model('Order', OrderSchema);