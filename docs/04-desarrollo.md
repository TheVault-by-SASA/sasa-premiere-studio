# Desarrollo y criterios de aceptación

Estado actual: carpeta y documentación inicial listas. No hay código funcional. Las etapas siguientes describen trabajo futuro.

## 1. Prueba de conexión

Localizar o instalar UXP Developer Tool, comprobar modo desarrollador y cargar un panel mínimo. Implementar servicio local y emparejamiento. Leer versión real del host, nombre del proyecto y secuencia activa. Desconectar y reconectar sin bloquear Premiere. Resolver esta prueba antes de ampliar la interfaz.

## 2. Primer flujo completo

Con medios sintéticos y un proyecto de prueba: importar dos clips, crear una secuencia, insertarlos, recortar uno y exportar un archivo. Comparar posiciones y duración a precisión de fotograma; inspeccionar el archivo exportado y revisar imagen y audio. Verificar una edición manual intercalada y la recuperación tras un fallo. No emplear proyectos de clientes como primera prueba.

## 3. App y MCP

Conectar interfaz y MCP al mismo motor. Mostrar capacidades disponibles, estado del proyecto, progreso y errores claros. Probar solicitudes duplicadas, referencia a proyecto equivocado, cancelación y reinicio. Empaquetar el servicio para que no dependa de una terminal abierta; decidir entonces el contenedor de escritorio e instalador de Windows.

## 4. Ampliar edición

Añadir operaciones en bloques verificables: montaje avanzado, audio, efectos y color, gráficos y subtítulos, y entregas múltiples. Investigar multicámara, velocidad, máscaras y funciones de IA sin darlas por disponibles. Incorporar C++ o un adaptador adicional solo cuando resuelva una necesidad comprobada.

## 5. Comprensión del material

Seleccionar transcripción y análisis visual; definir almacenamiento, costos y calidad esperada. Asociar decisiones a tiempos y medios identificables. Medir precisión de selección, ritmo, sincronía y calidad del montaje con proyectos representativos.

## 6. Distribución

Construir instalador, conexión inicial, actualización y desinstalación. Ejecutar pruebas en instalación limpia y con varias versiones objetivo de Premiere. Documentar cobertura real y recuperación. La publicación y distribución de la app son trabajo posterior.

## Pendientes inmediatos

- Confirmar UXP Developer Tool y modo desarrollador.
- Verificar SDK/compilador solo si se selecciona una primera necesidad C++.
- Elegir tareas representativas de edición para priorizar la matriz.
- Probar permisos y conexión del panel en Premiere 26.5.
- Elegir UI después de demostrar el flujo básico.

No se ha fijado estimación de tiempo: debe derivarse del primer flujo funcionando y del alcance seleccionado.
