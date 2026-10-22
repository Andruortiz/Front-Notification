## Variables de entorno y adjuntos

- El backend se alcanza por la ruta relativa `/api`: en desarrollo la redirige el proxy de `vite.config.ts` hacia `http://localhost:8060`. `VITE_API_BASE_URL` no se usa en el codigo; en un despliegue hace falta una redireccion de `/api/*` hacia el backend (por ejemplo `vercel.json`).
- `VITE_AUTH_TOKEN`: JWT del backend (se envia como `Authorization: Bearer`). Para pruebas, generarlo con el emisor local del backend.
- Adjuntos por correo: hasta 5 archivos; los de mas de 1 MB se suben a MinIO con una URL prefirmada y se envian por referencia tras el escaneo antivirus. Los limites por archivo y en total salen del `contentSchema` del canal (`sizeBytes` y `attachmentsTotalBytes`); con Brevo el total es de 4 MB.
- El navegador sube directo a MinIO, asi que el backend debe tener `MINIO_CORS_ALLOW_ORIGIN` con el origen del frontend.

## Probar el canal PUSH desde este navegador

Si defines las variables `VITE_FIREBASE_*` de `.env.example` (valores de Firebase Console, del mismo proyecto que usa el backend), al elegir el canal PUSH aparece el boton **Usar este navegador**: pide el permiso de notificaciones, genera el token de dispositivo y lo carga como destinatario. Solo funciona en `localhost` o HTTPS, por el service worker (`public/firebase-messaging-sw.js`). Sin esas variables el boton no aparece. Es una herramienta de pruebas: en produccion cada aplicacion cliente genera y guarda su propio token.

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
