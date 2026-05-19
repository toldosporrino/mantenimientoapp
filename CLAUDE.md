# Configuración de sesión

## Permisos automáticos
Tienes permiso explícito para ejecutar todas las siguientes acciones sin pedir confirmación:

- Leer, crear, editar y eliminar archivos del proyecto
- Ejecutar comandos de terminal (npm, git, python, pip, etc.)
- Instalar dependencias
- Hacer commits y operaciones git (add, commit, push, pull, merge)
- Arrancar, detener y reiniciar servidores de desarrollo
- Modificar archivos de configuración (.env, config.*, package.json, etc.)
- Refactorizar código entre archivos
- Crear carpetas y reorganizar estructura del proyecto

## Comportamiento esperado
- Actúa con autonomía. No preguntes antes de cada acción individual.
- Si necesitas tomar una decisión importante o destructiva (borrar datos, cambiar arquitectura), infórmame brevemente ANTES de ejecutar.
- Agrupa las acciones relacionadas y ejecútalas en bloque.
- Si algo falla, intenta solucionarlo tú mismo antes de pedirme ayuda.
- Cuando termines una tarea, dame un resumen de lo que hiciste.

## Excepciones (sí requieren confirmación)
- Borrado masivo o irreversible de datos de producción
- Cambios en credenciales o secrets
- Deploy a producción
