# 🚀 Guide de démarrage - WebMapping App

## Prérequis à installer sur le nouvel ordinateur
1. **Node.js** (v18+) → https://nodejs.org
2. **PostgreSQL** (v14+) → https://www.postgresql.org/download/
3. **Git** (optionnel) → https://git-scm.com

---

## ⚙️ Configuration PostgreSQL

1. Ouvrez pgAdmin ou psql
2. Créez la base de données :
```sql
CREATE DATABASE webmapping;
```
3. Créez l'utilisateur si nécessaire :
```sql
CREATE USER postgres WITH PASSWORD 'admin';
GRANT ALL PRIVILEGES ON DATABASE webmapping TO postgres;
```

---

## 🔧 Configuration Backend

1. Ouvrez le fichier `backend/.env` et adaptez si nécessaire :
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=admin
DB_NAME=webmapping
JWT_SECRET=webmapping_secret_key
PORT=5000
```

2. Installez les dépendances et démarrez :
```bash
cd backend
npm install
npm run start
```

---

## 🎨 Configuration Frontend

1. Ouvrez le fichier `frontend/.env` et adaptez si nécessaire :
```
REACT_APP_API_URL=http://localhost:5000
```

2. Installez les dépendances et démarrez :
```bash
cd frontend
npm install
npm start
```

---

## ⚠️ Notes importantes

- **La carte** (OpenStreetMap) et **les itinéraires** (OSRM) nécessitent une connexion internet
- **L'authentification** et **les données** fonctionnent en local sans internet
- Si vous changez le port du backend, mettez à jour `frontend/.env`
- Si vous changez le port du frontend, mettez à jour `backend/src/main.ts` (CORS)

---

## 🌐 Accès à l'application

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3002         |
| Backend   | http://localhost:5000         |
| Register  | http://localhost:3002/register|
| Login     | http://localhost:3002/login   |
| Dashboard | http://localhost:3002/dashboard|
