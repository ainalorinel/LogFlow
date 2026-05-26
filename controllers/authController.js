const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { Resend } = require('resend');
// const resend = new Resend(process.env.CLE_API_RESEND);


const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

// @desc    Inscription d'un utilisateur (Client ou Propriétaire)
// @route   POST /api/auth/register
exports.register = async (req, res) => {
    try {
        const { nom, email, telephone, password, role, entrepriseName, entrepriseEmail } = req.body;

        // 1. Vérifier de manière stricte si l'utilisateur existe déjà via son email perso
        const userExists = await User.findOne({ email });
        if (userExists) {
            return res.status(400).json({
                success: false,
                message: 'Cet email personnel est déjà associé à un compte.'
            });
        }

        // 2. Préparation des données de base communes
        const userData = {
            nom,
            email,
            telephone,
            password,
            role: role || 'client',
            entrepriseName: role === 'proprietaire' ? entrepriseName : undefined
        };

        // 3. Traitement spécifique si c'est un propriétaire
        if (role === 'proprietaire') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
            userData.verificationCode = otpCode;
            userData.verificationCodeExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
            userData.isVerified = false;

            // On crée le compte en base de données d'abord
            const newUser = await User.create(userData);

            // Vérification de la clé API
            if (!process.env.CLE_API_RESEND) {
                console.error("❌ ERREUR : La clé API Resend n'est pas chargée dans le fichier .env");
                return res.status(500).json({
                    success: false,
                    message: "Le serveur de messagerie n'est pas configuré. Contactez l'administrateur."
                });
            }

            // Envoi de l'e-mail sécurisé dans un try/catch dédié pour ne pas crasher le serveur
            try {
                const resend = new Resend(process.env.CLE_API_RESEND);
                await resend.emails.send({
                    from: 'LOGIFLOW MADAGASCAR <onboarding@resend.dev>',
                    to: entrepriseEmail, // Reçoit sur l'email officiel
                    subject: `🛡️ Alerte de Sécurité : Demande d'accès Administrateur - ${entrepriseName}`,
                    html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="utf-8">
                        <style>
                            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f4f6f9; color: #333333; margin: 0; padding: 0; }
                            .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border: 1px solid #e1e4e8; }
                            .email-header { background-color: #1a2a3a; padding: 25px; text-align: center; }
                            .email-header h1 { color: #ffffff; font-size: 22px; margin: 0; letter-spacing: 1px; }
                            .email-body { padding: 30px; line-height: 1.6; }
                            .company-alert { background-color: #f8f9fa; border-left: 4px solid #1a2a3a; padding: 15px; margin-bottom: 25px; border-radius: 0 4px 4px 0; }
                            .company-alert p { margin: 5px 0; font-size: 14px; color: #4a5568; }
                            .otp-box { background-color: #fffaf0; border: 2px dashed #ff9800; border-radius: 6px; padding: 20px; text-align: center; margin: 30px 0; }
                            .otp-code { font-size: 36px; font-weight: bold; color: #ff9800; letter-spacing: 8px; margin: 0; }
                            .security-note { font-size: 13px; color: #718096; border-top: 1px solid #edf2f7; padding-top: 20px; margin-top: 30px; }
                            .email-footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a0aec0; border-top: 1px solid #edf2f7; }
                        </style>
                    </head>
                    <body>
                        <div class="email-container">
                            <div class="email-header">
                                <h1>LOGIFLOW NETWORK</h1>
                            </div>
                            <div class="email-body">
                                <p>Madame, Monsieur,</p>
                                <p>Un nouvel utilisateur a initié une demande d'inscription pour créer un espace <strong>Propriétaire / Administrateur de flotte</strong> sur notre plateforme logistique.</p>
                                <div class="company-alert">
                                    <p><strong>Organisation concernée :</strong> ${entrepriseName}</p>
                                    <p><strong>Nom du demandeur :</strong> ${nom}</p>
                                    <p><strong>Email d'accès personnel :</strong> ${email}</p>
                                </div>
                                <p><strong>Pourquoi recevez-vous cet e-mail ?</strong><br>
                                Pour des raisons de sécurité, cet accès administrateur exige votre accord. En transmettant ce code, vous autorisez ce compte à gérer vos transports.</p>
                                <div class="otp-box">
                                    <p style="margin: 0 0 10px 0; font-size: 14px; color: #718096; font-weight: bold; text-transform: uppercase;">Code d'autorisation unique</p>
                                    <h2 class="otp-code">${otpCode}</h2>
                                </div>
                                <p style="color: #e53e3e; font-size: 14px; font-weight: 500;">⚠️ Si vous ne connaissez pas ce collaborateur, ignorez ce message.</p>
                            </div>
                            <div class="email-footer">
                                <p>Émis par <strong>LogiFlow Enterprise</strong>.<br>© 2026 LogiFlow Dev Team.</p>
                            </div>
                        </div>
                    </body>
                    </html>`
                });
            } catch (mailError) {
                // Si Resend bloque (ex: restriction de compte de test), on trace l'erreur sans faire planter Node !
                console.error("❌ Erreur d'envoi d'e-mail via Resend :", mailError);

                // Optionnel : Afficher le code directement dans la console serveur pour tes tests locaux
                console.log(`[TEST LOCAL] Code OTP pour ${entrepriseEmail} : ${otpCode}`);
            }

            return res.status(201).json({
                success: true,
                requiresVerification: true,
                message: 'Le protocole a été initialisé. Veuillez vérifier l’e-mail de l’entreprise.'
            });
        }

        // 4. Si c'est un client classique, création directe
        await User.create(userData);

        return res.status(201).json({
            success: true,
            requiresVerification: false,
            message: 'Compte client créé avec succès'
        });

    } catch (error) {
        console.error("❌ Erreur globale d'inscription :", error);
        return res.status(500).json({ success: false, message: "Erreur interne du serveur." });
    }
};

// @desc    Vérifier le code OTP pour le Propriétaire
// @route   POST /api/auth/verify-owner
exports.verifyOwner = async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ success: false, message: 'Veuillez fournir le code de vérification.' });
        }

        // Nettoyage de la chaîne reçue
        const stringCode = code.toString().trim();

        // Recherche unique basée sur le code de vérification actuel
        const user = await User.findOne({ verificationCode: stringCode });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Code invalide. Aucun compte ne correspond à ce code.'
            });
        }

        if (user.verificationCodeExpires && user.verificationCodeExpires < Date.now()) {
            return res.status(400).json({
                success: false,
                message: 'Le code de vérification a expiré (limite de 15 minutes dépassée).'
            });
        }

        // Validation et activation du compte propriétaire
        user.isVerified = true;
        user.verificationCode = null;
        user.verificationCodeExpires = null;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Votre compte propriétaire a été activé avec succès ! Vous pouvez vous connecter.'
        });

    } catch (error) {
        console.error("❌ Erreur de validation OTP :", error);
        return res.status(500).json({ success: false, message: "Erreur interne lors de la validation." });
    }
};

// Dans ton authController.js (ou fichier similaire)
exports.createDriver = async (req, res) => {
    try {
        const { nom, email, password, telephone, avatar } = req.body;
        
        // Validation simple : si l'image est trop lourde, le serveur peut rejeter avant même de toucher MongoDB
        const driver = await User.create({
            nom, email, password, telephone, avatar, role: 'chauffeur'
        });

        res.status(201).json({ success: true, data: driver });
    } catch (error) {
        // Log très important ici :
        console.error("Détail de l'erreur Mongoose :", error.errors || error.message);
        res.status(400).json({ success: false, message: error.message });
    }
}; 

// @desc    Connexion d'un utilisateur
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Valider l'email et le mot de passe reçus
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Veuillez fournir un email et un mot de passe' });
        }

        // Vérifier si l'utilisateur existe en incluant explicitement le champ password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides' });
        }

        // Vérifier si le mot de passe match
        const isMatch = await user.matchPassword(password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Identifiants invalides' });
        }
        if (user.role === 'proprietaire' && !user.isVerified) {
            return res.status(401).json({
                success: false,
                message: "Votre compte propriétaire n'est pas encore vérifié. Veuillez valider le code envoyé par mail."
            });
        }
        res.status(200).json({
            success: true,
            token: generateToken(user._id),
            user: {
                id: user._id,
                nom: user.nom,
                email: user.email,
                role: user.role,
                telephone: user.telephone
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};


// @desc    Obtenir la liste des chauffeurs (réservé aux propriétaires)
// @route   GET /api/auth/drivers
// @access  Private
exports.getDrivers = async (req, res) => {
    try {
        // On récupère uniquement les utilisateurs possédant le rôle 'chauffeur'
        const drivers = await User.find({ role: 'chauffeur' }).select('-password');

        return res.status(200).json({
            success: true,
            count: drivers.length,
            data: drivers
        });
    } catch (error) {
        console.error("❌ Erreur récupération chauffeurs :", error);
        return res.status(500).json({ success: false, error: error.message });
    }
};


// @desc    Obtenir le profil de l'utilisateur connecté actuel
// @route   GET /api/auth/me
// @access  Private (Nécessite le token)
exports.getMe = async (req, res) => {
    try {
        // req.user est rendu accessible grâce au middleware "protect"
        const user = await User.findById(req.user.id);
        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
};