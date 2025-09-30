#!/bin/bash

# Script de inicio para Railway
echo "🚀 Iniciando aplicación..."

# Ejecutar migraciones de Prisma
echo "📦 Ejecutando migraciones de Prisma..."
npx prisma migrate deploy

# Verificar que las migraciones se ejecutaron correctamente
if [ $? -eq 0 ]; then
    echo "✅ Migraciones ejecutadas correctamente"
else
    echo "❌ Error en las migraciones"
    exit 1
fi

# Iniciar la aplicación
echo "🌟 Iniciando servidor..."
node dist/src/main