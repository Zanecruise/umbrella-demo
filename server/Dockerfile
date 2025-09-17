# Estágio 1: Build da aplicação
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
COPY package*.json ./

# Instala todas as dependências (incluindo devDependencies) para buildar o projeto
RUN npm install

COPY . .
RUN npm run build

# Estágio 2: Imagem de produção final
FROM node:18-alpine
WORKDIR /usr/src/app
COPY package*.json ./

# Instala SOMENTE as dependências de produção
RUN npm install --only=production

# Copia a aplicação buildada (a pasta dist) do estágio de builder
COPY --from=builder /usr/src/app/dist ./dist

EXPOSE 8080
CMD [ "npm", "start" ]
