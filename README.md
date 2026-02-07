# Notes Pro - Application Professionnelle de Notes

Une application moderne de prise de notes avec synchronisation cloud, intelligence artificielle et interface responsive.

## 🚀 Fonctionnalités

### ✨ Principales
- 📝 **Éditeur riche** : Formatage de texte, listes, liens, code
- 🤖 **Intelligence Artificielle** : Amélioration, correction, résumé, traduction avec Google AI
- ☁️ **Synchronisation cloud** : MongoDB Atlas pour sync entre tous vos appareils
- 🏷️ **Organisation** : Catégories, tags, favoris, archives
- 🔍 **Recherche puissante** : Recherche dans titres, contenus et tags
- 📱 **Responsive** : Fonctionne parfaitement sur mobile, tablette et PC
- 🎨 **Interface moderne** : Design professionnel avec animations fluides
- 🌓 **Thème sombre** : Mode clair/sombre
- 💾 **Mode hors ligne** : Fonctionne même sans connexion

### 🛠️ Technologies
- **Frontend** : HTML5, CSS3, JavaScript vanilla (pur)
- **Backend** : Vercel Serverless Functions
- **Base de données** : MongoDB Atlas
- **IA** : Google AI Studio (Gemini Pro)
- **Hébergement** : Vercel

## 📦 Installation et Déploiement

### Prérequis
- Compte Vercel (gratuit)
- Compte MongoDB Atlas (gratuit)
- Clé API Google AI Studio (gratuit)
- Git installé sur votre ordinateur

### 1️⃣ Préparation

1. **Télécharger ce dossier** sur votre ordinateur

2. **Ouvrir un terminal** dans le dossier du projet

### 2️⃣ Initialiser Git

```bash
git init
git add .
git commit -m "Initial commit - Notes Pro"
```

### 3️⃣ Déployer sur Vercel

**Option A : Via le site Vercel (Recommandé)**

1. Allez sur [vercel.com](https://vercel.com)
2. Connectez-vous ou créez un compte
3. Cliquez sur "Add New" → "Project"
4. Importez votre dépôt Git
5. Configurez les variables d'environnement :
   - Nom : `MONGODB_URI`
   - Valeur : `mongodb+srv://djaidaniadam02_db_user:0WZcqW2iFYDyiDtb@cluster0.vlltcxf.mongodb.net/?retryWrites=true&w=majority&appName=cluster0`
6. Cliquez sur "Deploy"

**Option B : Via CLI Vercel**

```bash
# Installer Vercel CLI
npm install -g vercel

# Se connecter à Vercel
vercel login

# Déployer le projet
vercel

# Ajouter les variables d'environnement
vercel env add MONGODB_URI
# Coller votre URI MongoDB quand demandé

# Déployer en production
vercel --prod
```

### 4️⃣ Configuration Post-Déploiement

1. **Vérifier le déploiement** : Ouvrez l'URL fournie par Vercel
2. **Tester les fonctionnalités** : Créez une note, synchronisez-la
3. **Activer le domaine personnalisé** (optionnel) dans les paramètres Vercel

## 🔧 Configuration

### Variables d'environnement

Créez un fichier `.env` (ou configurez dans Vercel) :

```env
MONGODB_URI=mongodb+srv://djaidaniadam02_db_user:0WZcqW2iFYDyiDtb@cluster0.vlltcxf.mongodb.net/?retryWrites=true&w=majority&appName=cluster0
```

### Clés API

Les clés sont déjà configurées dans le code :
- **Google AI** : Configurée dans `app.js`
- **MongoDB** : Configurée dans `api/notes.js`

⚠️ **IMPORTANT** : Changez ces clés pour la production !

## 📱 Utilisation

### Créer une note
1. Cliquez sur "Nouvelle note" ou le bouton "+"
2. Ajoutez un titre et du contenu
3. Sélectionnez une catégorie
4. Ajoutez des tags (optionnel)
5. Cliquez sur "Enregistrer"

### Utiliser l'IA
1. Écrivez du texte dans votre note
2. Cliquez sur le bouton "IA" dans la barre d'outils
3. Choisissez une action :
   - Améliorer le texte
   - Corriger la grammaire
   - Résumer
   - Développer
   - Traduire
   - Convertir en points
4. Appliquez le résultat

### Synchronisation
- **Automatique** : Toutes les 30 secondes
- **Manuel** : Cliquez sur l'icône de synchronisation

### Rechercher
- Tapez dans la barre de recherche
- Recherche dans titres, contenus et tags
- Résultats en temps réel

## 🎨 Personnalisation

### Ajouter une catégorie
1. Ouvrez les paramètres (icône engrenage)
2. Section "Catégories personnalisées"
3. Entrez le nom et cliquez "Ajouter"

### Changer le thème
1. Ouvrez les paramètres
2. Sélectionnez "Clair", "Sombre" ou "Automatique"

## 📂 Structure du projet

```
notes-app-pro/
├── public/
│   ├── index.html      # Page principale
│   ├── styles.css      # Styles (2000+ lignes)
│   └── app.js          # JavaScript principal (1500+ lignes)
├── api/
│   └── notes.js        # API Vercel pour MongoDB
├── package.json        # Dépendances Node.js
├── vercel.json         # Configuration Vercel
└── README.md           # Ce fichier
```

## 🔒 Sécurité

### Recommandations de sécurité

1. **Changez les clés API** :
   ```javascript
   // Dans app.js, ligne ~15
   GOOGLE_AI_API_KEY: 'VOTRE_NOUVELLE_CLE'
   
   // Dans api/notes.js, ligne ~3
   const MONGODB_URI = process.env.MONGODB_URI;
   ```

2. **Régénérez les identifiants MongoDB** :
   - Allez sur MongoDB Atlas
   - Database Access → Modifiez le mot de passe
   - Mettez à jour la variable d'environnement Vercel

3. **Activez HTTPS** (automatique sur Vercel)

4. **Limitez l'accès MongoDB** :
   - Network Access → Whitelist IP : 0.0.0.0/0 (tous) ou spécifique

## 🐛 Dépannage

### La synchronisation ne fonctionne pas
1. Vérifiez votre connexion internet
2. Vérifiez les variables d'environnement Vercel
3. Consultez les logs Vercel : `vercel logs`

### L'IA ne répond pas
1. Vérifiez la clé API Google AI
2. Vérifiez les quotas de l'API
3. Ouvrez la console du navigateur (F12) pour voir les erreurs

### Notes non sauvegardées
1. Les notes sont d'abord sauvegardées localement
2. Elles se synchroniseront à la prochaine connexion
3. Utilisez "Synchroniser maintenant" dans les paramètres

## 📊 Limites

### Quotas gratuits
- **Vercel** : 100 GB bande passante/mois
- **MongoDB Atlas** : 512 MB stockage
- **Google AI** : 60 requêtes/minute

### Recommandations
- Pour usage personnel : parfait avec les quotas gratuits
- Pour usage intensif : considérez les plans payants

## 🚀 Améliorations futures

- [ ] Partage de notes
- [ ] Collaboration en temps réel
- [ ] Export PDF
- [ ] Pièces jointes
- [ ] Notes vocales
- [ ] Application mobile native
- [ ] Extensions navigateur

## 📝 Licence

MIT License - Libre d'utilisation

## 👨‍💻 Support

Pour toute question ou problème :
1. Vérifiez ce README
2. Consultez les logs Vercel
3. Vérifiez la console du navigateur

## 🎉 Félicitations !

Votre application de notes professionnelle est prête ! 

Profitez de :
- ✅ Synchronisation automatique entre tous vos appareils
- ✅ Intelligence artificielle intégrée
- ✅ Interface moderne et intuitive
- ✅ Fonctionne hors ligne
- ✅ Gratuit et sans publicité

**Bon usage ! 📝✨**
