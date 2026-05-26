const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    nom: {
        type: String,
        required: [true, 'Veuillez ajouter un nom']
    },
    email: {
        type: String,
        required: [true, 'Veuillez ajouter un email'],
        unique: true,
        match: [
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
            'Veuillez ajouter un email valide'
        ]
    },
    password: {
        type: String,
        required: [true, 'Veuillez ajouter un mot de passe'],
        minlength: 6,
        select: false 
    },
    role: {
        type: String,
        enum: ['client', 'chauffeur', 'proprietaire'],
        default: 'client'
    },
    telephone: {
        type: String,
        required: [true, 'Veuillez ajouter un numéro de téléphone']
    },
    avatar: {
        type: String,
        default: null, 
        select: true
    },
    entrepriseName: {
        type: String,
        required: function () { return this.role === 'proprietaire'; } 
    },
    isVerified: {
        type: Boolean,
        default: function () { return this.role === 'client'; } 
    },
    verificationCode: {
        type: String,
        default: null
    },
    verificationCodeExpires: {
        type: Date,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});


UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Méthode de comparaison des mots de passe
UserSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);