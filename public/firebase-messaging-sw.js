// Service worker de Firebase Cloud Messaging para mostrar notificaciones push con la pestaña cerrada.
// La configuración llega por la URL con que se registra (ver src/lib/firebaseWeb.ts), porque un
// service worker no puede leer las variables de Vite.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const params = new URL(self.location.href).searchParams;

firebase.initializeApp({
    apiKey: params.get('apiKey'),
    authDomain: params.get('authDomain'),
    projectId: params.get('projectId'),
    messagingSenderId: params.get('messagingSenderId'),
    appId: params.get('appId'),
});

firebase.messaging();
