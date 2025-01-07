FROM node:22.12.0
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install -g tsx@4.19.2
COPY . .
EXPOSE 3000
CMD ["npx", "tsx", "src/index.ts"]