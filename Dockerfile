# Dockerfile

FROM node:22.12.0

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers de configuration
COPY package*.json ./

# Installer les dépendances
RUN npm install
RUN npm install -g tsx@4.19.2
RUN npm install mongoose

# Copier le reste du code
COPY . .

# Exposer les ports requis par l'application
EXPOSE 8000

# Commande par défaut pour exécuter le backend
CMD ["node", "dist/index.js"]

#cd client et npm install

RUN cd client
RUN npm install

# Exposer les ports requis par l'application
EXPOSE 3000

# Commande par défaut pour exécuter le frontend
CMD ["npm", "start"]