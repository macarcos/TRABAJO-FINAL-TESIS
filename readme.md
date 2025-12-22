dentro del frontend y backend
npm run dev






# 1. Crea la rama de backup con todo lo actual
git checkout -b backup-anterior-tesis

# 2. Agrega y guarda todos los cambios actuales
git add .
git commit -m "Backup: Versión anterior - antes de cambios en login y visitantes"

# 3. Sube este backup a GitHub
git push origin backup-anterior-tesis

# 4. Vuelve a main
git checkout main
GIT INI
# 5. Crea la rama nueva para los cambios
git checkout -b feature/login-visitantes-credenciales

# 6. Confirma que estés en la rama nueva
git status