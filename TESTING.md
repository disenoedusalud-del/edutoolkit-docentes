# Documentación de Pruebas - EduToolkit Docentes

Este documento describe el plan de pruebas para verificar la funcionalidad del MVP de EduToolkit, enfocándose en la gestión de cursos, recursos y permisos diferenciados por roles (Admin vs Docente).

## 1. Prerrequisitos
- Tener una cuenta de administrador configurada (email en `NEXT_PUBLIC_ADMIN_EMAILS` o rol `ADMIN` en la colección `users`).
- Tener al menos una segunda cuenta de correo para simular el rol de "Docente".
- Aplicación corriendo (`npm run dev`).

## 2. Escenarios de Prueba

### A. Gestión de Cursos (Rol: ADMIN)
1. **Crear Curso:**
   - Iniciar sesión como Admin.
   - Ir al Dashboard.
   - Usar el botón "Administrar Cursos".
   - Completar formulario: Título y URL de imagen.
   - Verificar: El curso aparece en la grilla con la imagen correcta.
2. **Archivar/Activar (Opcional/Futuro):**
   - Verificar que el estado se refleje (por ahora visualmente).

### B. Gestión de Recursos (Rol: ADMIN)
1. **Agregar Recurso:**
   - Entrar al detalle de un curso.
   - Completar formulario "Agregar nuevo recurso" (Título y URL).
   - Verificar: El recurso aparece en la lista.
2. **Duplicar Recurso:**
   - Clic en el botón "Copiar" (icono).
   - Verificar: Se crea una copia con "(Copia)" en el título.
3. **Reordenar Recursos:**
   - Arrastrar un recurso y cambiarlo de posición.
   - Recargar la página.
   - Verificar: El orden se mantiene.
4. **Eliminar Recurso:**
   - Clic en el botón "Eliminar" (icono basura).
   - Confirmar diálogo.
   - Verificar: El recurso desaparece de la lista.

### C. Gestión de Permisos (Rol: ADMIN)
1. **Otorgar Permiso:**
   - En el detalle del curso, sección "Permisos de Acceso".
   - Ingresar el correo del usuario Docente.
   - Clic en "Autorizar".
   - Verificar: El correo aparece en la lista de permitidos.
2. **Revocar Permiso:**
   - Clic en el botón eliminar junto al correo del docente.
   - Verificar: El correo desaparece de la lista.

### D. Vista del Docente (Rol: DOCENTE)
1. **Acceso Restringido:**
   - Iniciar sesión con la cuenta de Docente (sin permisos admin).
   - Verificar: NO debe ver el botón "Administrar Cursos" en el Dashboard.
2. **Dashboard Docente:**
   - Si no tiene cursos asignados: Debe mostrar mensaje de "No hay cursos".
   - Si tiene cursos asignados (por el Admin en el paso C.1): Debe ver la tarjeta del curso asignado.
3. **Detalle del Curso:**
   - Clic en la tarjeta del curso.
   - Verificar:
     - Ve la lista de recursos (enlaces).
     - NO ve formularios de agregar recursos.
     - NO ve opciones de eliminar/duplicar.
     - NO ve la sección de permisos.
     - NO puede arrastrar/reordenar items.

### E. Seguridad (Reglas Firestore)
- Verificar que un usuario no autenticado sea redirigido al Login.
- Las reglas de Firestore (`firestore.rules`) aseguran que solo Admins escriban en cursos/recursos.

## 3. Estado de Pruebas (Checklist)
- [ ] Login/Logout funciona correctamente.
- [ ] Admin puede crear cursos.
- [ ] Admin puede gestionar recursos (CRUD + Sort).
- [ ] Admin puede dar acceso a email específico.
- [ ] Docente solo ve cursos autorizados.
- [ ] Docente no puede editar nada.

---
**Nota:** Para ejecutar las reglas de seguridad en producción, asegúrese de hacer deploy de `firestore.rules` mediante Firebase CLI (`firebase deploy --only firestore:rules`).
