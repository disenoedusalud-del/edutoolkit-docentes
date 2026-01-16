# Configuración Local

## Firebase Setup

1.  Ve a [Firebase Console](https://console.firebase.google.com/).
2.  Crea un nuevo proyecto o selecciona uno existente.
3.  Registra una web app.
4.  Copia la configuración ("firebaseConfig").
5.  Pega los valores en `.env.local` (ya se actualizó con tus credenciales).

## Authentication

1.  En Firebase Console -> Authentication -> Sign-in method.
2.  Habilita **Email/Password** (Correo electrónico/Contraseña).

## Firestore

1.  En Firebase Console -> Firestore Database.
2.  Crea la base de datos en modo de prueba (actualizaremos las reglas luego).
