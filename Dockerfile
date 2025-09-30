# Usa Node.js LTS
FROM node:18-alpine

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instala las dependencias
RUN npm ci --only=production

# Genera el cliente de Prisma
RUN npx prisma generate

# Copia el código fuente
COPY . .

# Construye la aplicación
RUN npm run build

# Expone el puerto
EXPOSE 4000

# Comando para ejecutar en producción
CMD ["node", "dist/src/main"]