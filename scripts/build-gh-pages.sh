#!/bin/bash

# Limpiar build anterior
rm -rf out

# Construir la aplicación
npm run build

# Crear archivo .nojekyll para evitar que GitHub Pages ignore archivos
touch out/.nojekyll

# Copiar archivo 404.html para SPA routing
cp out/index.html out/404.html

# Crear archivo _redirects para GitHub Pages
echo "/* /index.html 200" > out/_redirects

echo "✅ Build completado para GitHub Pages"
