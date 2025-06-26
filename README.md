# ✈️ Bot de Vuelos Caribe

Bot automatizado que consulta diariamente los vuelos más baratos de Buenos Aires (BUE) a **Punta Cana** y **Cancún** para las fechas del 2 al 12 de abril de 2026, y envía las notificaciones a Discord.

## 🚀 Características

- 🔍 Consulta automática de vuelos usando **Skyscanner API** y **Kiwi.com API**
- 🏝️ **Destinos específicos:** Punta Cana (PUJ) y Cancún (CUN)
- 💰 Encuentra los vuelos más baratos para ambos destinos
- 📱 Notificaciones automáticas a Discord con ranking de precios o screenshots
- ⏰ Programado para ejecutarse diariamente a un horario aleatorio (7:00 a 23:00, hora de Argentina)
- 🛫 Búsqueda desde Buenos Aires con ida y vuelta
- 📅 Fechas específicas: 2-12 abril 2026

## 📋 Requisitos

- Node.js (versión 18 o superior recomendado)
- Cuenta en Discord para crear un webhook
- Railway.app (o Render/Fly.io) para deploy 24/7

## 🔧 Instalación local

1. **Clona o descarga este repositorio**

   ```bash
   git clone <tu-repositorio>
   cd vuelos-caribe
   ```

2. **Instala las dependencias**

   ```bash
   npm install
   ```

3. **Configura las variables de entorno**

   Edita el archivo `.env` y agrega tu webhook de Discord:

   ```env
   DISCORD_WEBHOOK=tu_webhook_discord_aqui
   ```

4. **Ejecuta el script manualmente para probar**
   ```bash
   node screenshot-skyscanner.js
   ```
   (Descomenta la línea `// main();` en el script si quieres testear manualmente)

---

## 🚀 Deploy 24/7 en Railway.app

### 1. **Sube tu código a GitHub**

### 2. **Crea un proyecto en Railway**

- Ve a [https://railway.app/](https://railway.app/)
- Haz click en "New Project" > "Deploy from GitHub repo"
- Selecciona tu repositorio

### 3. **Configura las variables de entorno**

- Ve a la pestaña "Variables"
- Agrega:
  - `DISCORD_WEBHOOK` (tu webhook de Discord)

### 4. **Configura el servicio como "Background Worker"**

- Ve a la pestaña "Services" > selecciona tu servicio
- En "Start Command" pon:
  ```bash
  node screenshot-skyscanner.js
  ```
- Railway mantendrá el proceso corriendo 24/7

### 5. **¡Listo!**

- El bot tomará screenshots de Skyscanner para Punta Cana y Cancún una vez al día en un horario aleatorio (entre 7:00 y 23:00, hora de Argentina) y los enviará a Discord.
- Puedes ver logs en el panel de Railway.

---

## 🛠️ Estructura del proyecto

```
vuelos-caribe/
├── screenshot-skyscanner.js   # Script de screenshots diarios
├── flight-discord-bot.js     # Bot de vuelos con Kiwi.com
├── flight-bot.js             # Bot de vuelos con Skyscanner API
├── package.json              # Dependencias y configuración
├── .env                      # Variables de entorno
├── .gitignore                # Archivos a ignorar
└── README.md                 # Este archivo
```

---

## 📝 Notas

- Railway tiene plan gratuito con horas limitadas por mes. Si necesitas más, puedes usar Render.com o Fly.io (el proceso es similar).
- Si Skyscanner cambia su protección anti-bot, puede que el screenshot falle. Puedes ajustar el script para otros sitios de vuelos si lo necesitas.
- Puedes cambiar las fechas, origen y destinos editando las variables al inicio de `screenshot-skyscanner.js`.

---

**¡Listo para automatizar tus screenshots de vuelos! ✈️**
