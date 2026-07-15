# Système d'Authentification - WebMapping App

## Configuration Backend (NestJS)

### Structure des fichiers créés
```
backend/src/
├── auth/
│   ├── user.entity.ts         # Entité User avec rôles
│   ├── auth.dto.ts            # DTOs pour register/login
│   ├── auth.service.ts        # Logique d'authentification (bcrypt, JWT)
│   ├── auth.controller.ts     # Endpoints /auth/register et /auth/login
│   ├── auth.module.ts         # Module d'authentification
│   ├── jwt.strategy.ts        # Stratégie Passport JWT
│   ├── jwt-auth.guard.ts      # Guard JWT pour routes protégées
│   └── admin.guard.ts         # Guard pour vérifier le rôle admin
```

### Endpoints Backend

#### POST /auth/register
Inscription d'un nouvel utilisateur
```json
{
  "email": "user@example.com",
  "password": "motdepasse123",
  "role": "admin" | "visitor"
}
```

#### POST /auth/login
Connexion d'un utilisateur
```json
{
  "email": "user@example.com",
  "password": "motdepasse123"
}
```

#### GET /auth/profile
Récupérer le profil de l'utilisateur connecté (nécessite JWT)

#### GET /facilities/dashboard
Route protégée accessible uniquement aux admins

### Démarrer le backend
```bash
cd backend
npm install
npm run start:dev
```

Le backend sera accessible sur `http://localhost:5000`

## Configuration Frontend (React)

### Structure des fichiers créés
```
frontend/src/
├── services/
│   └── api.js                 # Service API avec axios et gestion JWT
├── components/
│   └── ProtectedRoute.jsx     # Composant pour routes protégées
├── page/
│   ├── Login.jsx              # Page de connexion
│   ├── Register.jsx           # Page d'inscription
│   ├── Dashboard.jsx          # Page dashboard admin
│   ├── Auth.css               # Styles pour login/register
│   └── Dashboard.css          # Styles pour dashboard
```

### Routes Frontend

- `/` - Page publique avec la carte (MapView)
- `/login` - Page de connexion
- `/register` - Page d'inscription
- `/dashboard` - Dashboard admin (protégé, admin uniquement)

### Démarrer le frontend
```bash
cd frontend
npm install
npm start
```

Le frontend sera accessible sur `http://localhost:3000`

## Fonctionnalités

### Backend
✅ Entité User avec id, email, password (hashé bcrypt), role, createdAt
✅ Endpoint POST /auth/register avec choix du rôle
✅ Endpoint POST /auth/login qui retourne un JWT
✅ Guard JWT pour protéger les routes
✅ Guard Admin pour vérifier le rôle administrateur
✅ CORS activé pour le frontend

### Frontend
✅ Page Login avec formulaire et lien vers inscription
✅ Page Register avec sélecteur de rôle (Admin/Visiteur)
✅ Stockage JWT dans localStorage
✅ Redirection automatique selon le rôle (admin → /dashboard, visitor → /)
✅ Route protégée /dashboard accessible uniquement aux admins
✅ React Router pour la navigation
✅ Intercepteur axios pour ajouter automatiquement le JWT

## Sécurité

- Mots de passe hashés avec bcrypt (salt rounds: 10)
- JWT avec expiration 24h
- Guards NestJS pour validation des tokens
- Protected routes côté frontend
- Validation des rôles côté backend et frontend

## Test du système

1. Démarrer PostgreSQL
2. Démarrer le backend: `cd backend && npm run start:dev`
3. Démarrer le frontend: `cd frontend && npm start`
4. Aller sur `http://localhost:3000/register`
5. Créer un compte admin
6. Se connecter → redirection automatique vers /dashboard
7. Créer un compte visitor
8. Se connecter → redirection automatique vers /

## Variables d'environnement

Backend `.env`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=admin
DB_NAME=webmapping
JWT_SECRET=webmapping_secret_key
PORT=5000
```
