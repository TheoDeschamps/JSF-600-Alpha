# JSF-600-Alpha

JSF-600-Alpha est une application de chat en temps réel utilisant Node.js, Express, MongoDB et Socket.IO. Ce projet peut être exécuté en local ou via Docker.

## Prérequis

### Local
- Node.js (version 16 ou plus récente)
- MongoDB (installé localement)

### Docker
- Docker et Docker Compose

---

## Installation

### 1. Cloner le dépôt
```bash
git clone <url_du_dépôt>
cd JSF-600-Alpha
```

### 2. Installer les dépendances
```bash
npm install
```

---

## Exécution

### En local

#### Étape 1 : Configurer MongoDB
1. Assurez-vous que MongoDB est installé et en cours d'exécution sur `localhost:27017`.
2. MongoDB est géré automatiquement par le fichier `index.ts`, aucune configuration manuelle n'est nécessaire. Assurez-vous simplement que MongoDB est accessible via `localhost:27017` ou que Docker est configuré correctement.

#### Étape 2 : Lancer l'application
1. Démarrez le serveur avec :
   ```bash
   npx tsx src/index.ts
   ```
2. L'application sera accessible sur `http://localhost:3000` à `http://localhost:3007`.

### Avec Docker

#### Étape 1 : Configurer Docker
Assurez-vous que Docker est installé et configuré sur votre système.

#### Étape 2 : Lancer les conteneurs
1. Construisez et démarrez les services avec Docker Compose :
   ```bash
   docker-compose up --build
   ```
2. L'application sera accessible sur `http://localhost:3000` à `http://localhost:3003`.

#### Étape 3 : Arrêter les conteneurs
Pour arrêter les services :
```bash
docker-compose down
```
