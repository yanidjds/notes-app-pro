const { MongoClient, ObjectId } = require('mongodb');

// Configuration MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://djaidaniadam02_db_user:0WZcqW2iFYDyiDtb@cluster0.vlltcxf.mongodb.net/?retryWrites=true&w=majority&appName=cluster0';
const DB_NAME = 'notes_pro_db';
const COLLECTION_NAME = 'notes';

let cachedClient = null;
let cachedDb = null;

// Connexion à MongoDB avec cache
async function connectToDatabase() {
    if (cachedClient && cachedDb) {
        return { client: cachedClient, db: cachedDb };
    }

    const client = await MongoClient.connect(MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });

    const db = client.db(DB_NAME);

    cachedClient = client;
    cachedDb = db;

    return { client, db };
}

// Handler principal pour l'API
module.exports = async (req, res) => {
    // Configuration CORS
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Gestion de la requête OPTIONS
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { db } = await connectToDatabase();
        const collection = db.collection(COLLECTION_NAME);

        // GET - Récupérer toutes les notes
        if (req.method === 'GET') {
            try {
                const notes = await collection.find({}).sort({ modifiedAt: -1 }).toArray();
                
                res.status(200).json({
                    success: true,
                    notes: notes,
                    count: notes.length,
                });
            } catch (error) {
                console.error('Erreur GET:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la récupération des notes',
                    message: error.message,
                });
            }
        }

        // POST - Créer une nouvelle note
        else if (req.method === 'POST') {
            try {
                const note = req.body;

                // Validation
                if (!note.title && !note.content) {
                    return res.status(400).json({
                        success: false,
                        error: 'Le titre ou le contenu est requis',
                    });
                }

                // Ajouter des timestamps si absents
                if (!note.createdAt) {
                    note.createdAt = new Date().toISOString();
                }
                if (!note.modifiedAt) {
                    note.modifiedAt = new Date().toISOString();
                }

                // Insérer la note
                const result = await collection.insertOne(note);
                const insertedNote = await collection.findOne({ _id: result.insertedId });

                res.status(201).json({
                    success: true,
                    note: insertedNote,
                    message: 'Note créée avec succès',
                });
            } catch (error) {
                console.error('Erreur POST:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la création de la note',
                    message: error.message,
                });
            }
        }

        // PUT - Mettre à jour une note
        else if (req.method === 'PUT') {
            try {
                const { noteId, updates } = req.body;

                if (!noteId) {
                    return res.status(400).json({
                        success: false,
                        error: 'ID de la note requis',
                    });
                }

                // Ajouter le timestamp de modification
                updates.modifiedAt = new Date().toISOString();

                // Mettre à jour la note
                const result = await collection.findOneAndUpdate(
                    { _id: noteId },
                    { $set: updates },
                    { returnDocument: 'after' }
                );

                if (!result.value) {
                    return res.status(404).json({
                        success: false,
                        error: 'Note non trouvée',
                    });
                }

                res.status(200).json({
                    success: true,
                    note: result.value,
                    message: 'Note mise à jour avec succès',
                });
            } catch (error) {
                console.error('Erreur PUT:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la mise à jour de la note',
                    message: error.message,
                });
            }
        }

        // DELETE - Supprimer une note
        else if (req.method === 'DELETE') {
            try {
                const { noteId } = req.body;

                if (!noteId) {
                    return res.status(400).json({
                        success: false,
                        error: 'ID de la note requis',
                    });
                }

                const result = await collection.deleteOne({ _id: noteId });

                if (result.deletedCount === 0) {
                    return res.status(404).json({
                        success: false,
                        error: 'Note non trouvée',
                    });
                }

                res.status(200).json({
                    success: true,
                    message: 'Note supprimée avec succès',
                });
            } catch (error) {
                console.error('Erreur DELETE:', error);
                res.status(500).json({
                    success: false,
                    error: 'Erreur lors de la suppression de la note',
                    message: error.message,
                });
            }
        }

        // Méthode non supportée
        else {
            res.status(405).json({
                success: false,
                error: 'Méthode non autorisée',
            });
        }
    } catch (error) {
        console.error('Erreur générale:', error);
        res.status(500).json({
            success: false,
            error: 'Erreur serveur',
            message: error.message,
        });
    }
};
