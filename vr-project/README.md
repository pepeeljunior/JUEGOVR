# 🌿 MUNDO PERDIDO — VR EXPLORER
## Práctica 3.7 · Escenarios VR · Graficación · Meta Quest 3

---

## 📁 ESTRUCTURA DE CARPETAS

```
vr-project/
├── index.html                  ← Portada (pantalla de inicio)
├── game/
│   ├── index.html              ← Escena 3D (juego)
│   └── main.js                 ← Lógica Three.js completa
└── assets/
    ├── models/                 ← Modelos FBX del personaje y animaciones
    ├── hdr/                    ← Ambiente 360° HDR
    ├── textures/               ← Texturas de suelo y roca
    ├── sounds/                 ← Música y efectos de sonido
    └── icons/                  ← Favicon
```

---

## 🎨 ASSETS REQUERIDOS — DESCARGA GRATUITA

### 1. PERSONAJE FBX (Mixamo — GRATIS)
Sitio: https://www.mixamo.com (requiere cuenta gratuita Adobe)

**Paso a paso:**
1. Entra a mixamo.com → sección **Characters**
2. Busca **"Kaya"** o **"Maria"** (skin humano realista, NO X-Bot/Y-Bot)
3. Haz clic en "Download" → formato: **FBX for Unity** → Include Skin: ✅
4. Guarda como: `assets/models/character.fbx`

**Animaciones** (mismo personaje, descarga **POR SEPARADO** cada una):
- Vuelve a Characters → selecciona el MISMO personaje
- Animations → busca cada animación → Download → **FBX** → Sin skin (animation only):

| Animación   | Nombre a buscar en Mixamo     | Guardar como                |
|-------------|-------------------------------|-----------------------------|
| Caminar     | "Walking" (In Place: ✅)      | `assets/models/Walking.fbx` |
| Correr      | "Running" (In Place: ✅)      | `assets/models/Running.fbx` |
| Saltar      | "Jump" o "Jumping Up"         | `assets/models/Jump.fbx`    |
| Bailar      | "Samba Dancing" o "Hip Hop"   | `assets/models/Dance.fbx`   |

> ⚠️ IMPORTANTE: Marca **"In Place"** en Walking y Running para que el personaje
>    no se mueva solo en el espacio — el código mueve la posición manualmente.

---

### 2. AMBIENTE HDR 360° (Poly Haven — GRATIS)
Sitio: https://polyhaven.com/hdris

**Recomendados (coherentes con escenario de bosque/naturaleza):**
- "Kiara 1 Dawn" → `kiara_1_dawn_4k.hdr` ← luz de amanecer, muy bonito
- "Autumn Forest" → cualquier opción de bosque

**Descarga:** Resolución **2K** (no uses 4K, pesa demasiado)
**Guardar como:** `assets/hdr/environment.hdr`

---

### 3. TEXTURAS (Poly Haven o AmbientCG — GRATIS)

#### Piso (hierba/tierra):
**Poly Haven:** https://polyhaven.com/textures → busca "Grass" o "Ground"
- Descarga: **Color map** → `assets/textures/ground_color.jpg`
- Descarga: **Normal map** → `assets/textures/ground_normal.jpg`
- Resolución: 1K o 2K está bien

**Alternativa AmbientCG:** https://ambientcg.com
- Busca "Grass001" o "Ground037"
- Descarga los archivos _Color y _Normal en jpg

#### Rocas:
- Busca "Rock" en las mismas páginas
- Guardar como: `assets/textures/rock_color.jpg` y `rock_normal.jpg`

---

### 4. SONIDOS (FreeSound — GRATIS, requiere cuenta gratuita)
Sitio: https://freesound.org

| Archivo                        | Búsqueda sugerida                          |
|--------------------------------|--------------------------------------------|
| `assets/sounds/music.mp3`     | "forest ambient music loop"                |
| `assets/sounds/footstep.mp3`  | "footstep grass single"                    |
| `assets/sounds/jump.mp3`      | "jump whoosh short"                        |
| `assets/sounds/land.mp3`      | "landing thud grass"                       |
| `assets/sounds/collide.mp3`   | "rock hit bump"                            |

> Descarga en formato MP3. En FreeSound filtra por License = Creative Commons 0.

**Alternativa sin registro:** https://mixkit.co/free-sound-effects/
- No requiere cuenta, descarga directa

---

### 5. FAVICON
Crea o descarga un ícono 32×32 px (o 64×64 px).
- Puedes usar: https://favicon.io/emoji-favicons/ → busca 🌿 o 🗺️
- Guarda como: `assets/icons/favicon.png`

---

## 🎮 CONTROLES

| Tecla            | Acción                              |
|------------------|-------------------------------------|
| W / A / S / D    | Mover personaje                     |
| SHIFT + W/A/S/D  | Correr                              |
| ESPACIO          | Saltar                              |
| B                | Activar/desactivar baile            |
| Q                | Girar personaje 90° a la izquierda  |
| E                | Girar personaje 90° a la derecha    |
| Ratón            | Rotar cámara alrededor (orbitar)    |
| M                | Silenciar/reanudar música           |
| R                | Reiniciar escena                    |

### Controles VR (Meta Quest 3):
| Control               | Acción              |
|-----------------------|---------------------|
| Joystick izquierdo    | Mover personaje     |
| Joystick derecho ←→  | Girar 90°           |
| Botón A (mano der.)   | Saltar              |
| Botón B (mano der.)   | Bailar              |

---

## 🚀 CÓMO EJECUTAR (IMPORTANTE: necesita servidor HTTP)

Three.js **NO funciona** abriendo el archivo directamente (file://).
Necesitas un servidor local:

### Opción 1 — VS Code + Live Server (más fácil):
1. Instala extensión "Live Server" en VS Code
2. Click derecho en `index.html` → "Open with Live Server"
3. Abre en navegador: `http://localhost:5500`

### Opción 2 — Python:
```bash
cd vr-project
python -m http.server 8080
# Abre: http://localhost:8080
```

### Opción 3 — Node.js:
```bash
npx serve vr-project
```

### Para Meta Quest 3:
El visor debe acceder a la IP de tu computadora en la misma red WiFi:
`http://192.168.X.X:8080` (ajusta a tu IP local)

O usa **ngrok** para exponerlo con HTTPS (requerido para WebXR en producción):
```bash
ngrok http 8080
```

---

## ✅ CHECKLIST DE REQUISITOS CUBIERTOS

- [x] Personaje con skin humano (Mixamo: Kaya/Maria)
- [x] 3+ secuencias de movimiento (caminar, correr, saltar, bailar) + fluido con fadeIn/fadeOut
- [x] Giro circular de 90° (teclas Q/E y joystick derecho VR)
- [x] Plano 3D con textura de suelo (hierba/tierra, ondulada)
- [x] Ambiente 360° HDR coherente con el escenario
- [x] Control por teclado (WASD + SHIFT + ESPACIO + B + Q/E)
- [x] Fronteras del escenario (clamp de posición)
- [x] Cámara con ratón (OrbitControls)
- [x] Iluminación: sol, luna, hoguera/antorcha, ambiente hemisférico
- [x] Niebla gris clara (FogExp2) al alejarse
- [x] ≥5 objetos 3D con física (8 objetos: 5 piedras, pelota, barril, caja)
- [x] Colisión física entre personaje y objetos
- [x] Algunos objetos con movimiento (pelota rueda)
- [x] Footer HTML con nombres, N° control, título, Arial negrita H1, instrucciones
- [x] Título en ventana web + favicon en pestaña
- [x] Música de fondo
- [x] Efectos de sonido (pasos, salto, aterrizaje, choque)
- [x] Visión VR con controladores de mando Meta Quest 3 (WebXR)
- [x] HUD flotante 3D en modo VR
- [x] Portada web llamativa (index.html con animaciones CSS)
- [x] Estructura `assets/` organizada
- [x] Tamaño moderado (sin assets en el código, se cargan externamente)

---

## 📝 PERSONALIZACIÓN

Antes de entregar, modifica en `game/index.html` y `index.html`:
- Nombres reales del equipo
- Números de control
- Nombre del maestro y institución

---

*Desarrollado con Three.js r169 · WebXR API · Meta Quest 3*
