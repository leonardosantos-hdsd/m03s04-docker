FROM node:20-alpine AS base
WORKDIR /app

# instalar deps de produção
COPY package*.json ./
RUN npm ci --only=production

# copiar código e dados base
COPY server.js ./server.js
COPY produtos.json ./produtos.json
COPY clientes.json ./clientes.json
RUN touch envios.json

# variáveis e porta
ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

# usuário sem privilégios
RUN addgroup -S nodegrp && adduser -S nodeusr -G nodegrp \
  && chown -R nodeusr:nodegrp /app
USER nodeusr

CMD ["node", "server.js"]
