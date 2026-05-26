const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

// Initialisation d'Express et du serveur HTTP
const app = express();
const server = http.createServer(app);

// Configuration de Socket.io avec CORS autorisé pour le mobile
const io = new Server(server, {
    cors: {
        origin: "*", // Permet aux applications mobiles de se connecter
        methods: ["GET", "POST"]
    }
});

// Connexion Base de données
connectDB();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Import des routes
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');

// Montage des routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

app.get('/', (req, res) => {
    res.send('🚀 L\'API de Gestion de Course et WebSockets sont fonctionnels !');
});

// ==========================================
// LOGIQUE TEMPS RÉEL (SOCKET.IO)
// ==========================================

// Les "rooms" (salons) permettent d'isoler les flux de données par course
io.on('connection', (socket) => {
    console.log(`🔌 Un utilisateur s'est connecté au WebSocket : ${socket.id}`);

    // 1. Rejoindre le salon d'une course spécifique (Chauffeur et Propriétaire rejoignent la room "order_ID")
    socket.on('join_order_room', (orderId) => {
        socket.join(orderId);
        console.log(`📦 Socket ${socket.id} a rejoint la room de la course : ${orderId}`);
    });

    // 2. Événement : Le chauffeur envoie sa position géographique actuelle
    socket.on('send_location', (data) => {
        const { orderId, chauffeurId, latitude, longitude } = data;
        
        console.log(`📍 Position reçue du Chauffeur ${chauffeurId} pour la course ${orderId}: Lat ${latitude}, Lng ${longitude}`);

        // On retransmet IMMÉDIATEMENT la position à tous ceux présents dans la room (donc Toi, le Propriétaire)
        socket.to(orderId).emit('receive_location', {
            chauffeurId,
            latitude,
            longitude,
            timestamp: new Date()
        });
    });

    // 3. Événement : Changement de statut de la course à la volée (ex: "Livré !")
    socket.on('status_changed', (data) => {
        const { orderId, nouveauStatut } = data;
        // On informe le client et le propriétaire instantanément sans qu'ils aient à rafraîchir l'écran
        socket.to(orderId).emit('update_ui_status', { orderId, nouveauStatut });
    });

    // Déconnexion
    socket.on('disconnect', () => {
        console.log(`❌ Utilisateur déconnecté du WebSocket : ${socket.id}`);
    });
});

// IMPORTANT : On lance le "server" HTTP (et non plus app.listen)
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🔥 Serveur hybride (HTTP + WS) démarré sur le port ${PORT}`);
});