# Multi-stage build para optimizar el tamaño final
FROM node:18-alpine AS builder

# Establece el directorio de trabajo
WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instala todas las dependencias (incluyendo devDependencies)
RUN npm ci

# Genera el cliente de Prisma
RUN npx prisma generate

# Copia el código fuente
COPY . .

# Construye la aplicación
RUN npm run build

# Etapa de producción
FROM node:18-alpine AS production

WORKDIR /app

# Copia los archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# Instala solo dependencias de producción
RUN npm ci --only=production

# Genera el cliente de Prisma para producción
RUN npx prisma generate

# Copia los archivos compilados desde la etapa de build
COPY --from=builder /app/dist ./dist

# Expone el puerto
EXPOSE 4000

# Comando para ejecutar en producción
CMD ["node", "dist/src/main"]