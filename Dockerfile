# Estágio 1: Build da aplicação do servidor
FROM node:18-alpine AS builder
WORKDIR /usr/src/app
# Copia os arquivos de dependência do servidor
COPY server/package*.json ./
# Instala todas as dependências (incluindo devDependencies)
RUN npm install
# Copia o resto do código do servidor
COPY server/ .
# Roda o script de build
RUN npm run build

# Estágio 2: Imagem de produção final
FROM node:18-alpine
WORKDIR /usr/src/app
# Copia os arquivos de dependência do servidor
COPY server/package*.json ./
# Instala SOMENTE as dependências de produção
RUN npm install --only=production
# Copia a aplicação buildada (a pasta dist) do estágio de builder
COPY --from=builder /usr/src/app/dist ./dist
# Copia o package.json para que o 'npm start' funcione
COPY server/package.json ./

EXPOSE 8080
# O script 'start' no package.json é 'node .', que usa o 'main' ('dist/index.js')
CMD [ "npm", "start" ]
