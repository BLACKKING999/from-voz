FROM node:20.11.1-alpine

# Crear directorio de la aplicación
WORKDIR /app

# Copiar archivos de configuración del proyecto
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de archivos del proyecto
COPY . .

# Dar permisos explícitos a react-scripts
RUN chmod +x ./node_modules/.bin/react-scripts

# Construir la aplicación para producción
RUN CI=false npm run build

# Configurar servidor estático para servir la aplicación
FROM nginx:stable-alpine
COPY --from=0 /app/build /usr/share/nginx/html

# Copiar configuración personalizada de nginx si existe
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
