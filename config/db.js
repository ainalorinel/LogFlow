const mongoose = require('mongoose');

const connectDB = async () => {
    // On ignore le .env temporairement pour tester la connexion directe
    const uri = "mongodb://ainalorinelrakotoson_db_user:CxkstxnxZvHRzbqs@ac-eitw68k-shard-00-00.otqdwi5.mongodb.net:27017,ac-eitw68k-shard-00-01.otqdwi5.mongodb.net:27017,ac-eitw68k-shard-00-02.otqdwi5.mongodb.net:27017/?ssl=true&replicaSet=atlas-12y7k8-shard-0&authSource=admin&appName=BackendCluster";
    
    try {
        console.log("Tentative de connexion à Atlas...");
        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000
        });
        console.log(`✅ MongoDB Connecté : ${conn.connection.host}`);
    } catch (error) {
        console.error(`❌ Erreur de connexion MongoDB : ${error.message}`);
        process.exit(1); 
    }
};

module.exports = connectDB;