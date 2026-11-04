# Versión 0.1: conexión y edición inicial

Esta versión consulta, analiza y permite un recorte inicial de vídeo. El panel ya fue cargado en Premiere 26.5 y se completó una edición real sobre material sintético. Sigue siendo una versión de desarrollo; los resultados y limitaciones están en docs/08-validacion-premiere-real.md.

## Abrir la app

En la carpeta APPS/sasa-premiere-studio, ejecutar `Abrir SASA Premiere Studio.cmd`. El lanzador prepara una copia local bajo `%LOCALAPPDATA%/SASA/PremiereStudio/runtime` y abre una ventana propia. Las dependencias y el proceso se ejecutan localmente; el código fuente permanece en APPS. Requiere Node.js 22 o posterior, npm y acceso a Internet para la primera preparación. FFprobe es necesario para analizar medios.

La interfaz permite ver el estado de conexión, consultar un proyecto conectado, leer sus secuencias y clips y seleccionar un archivo para analizarlo. Mientras el panel esté desconectado, la app muestra ese estado. No contiene proyectos ni montajes ficticios.

## Preparación de Premiere

1. Instalar UXP Developer Tools desde Creative Cloud y abrirlo.
2. Activar el modo desarrollador requerido por Adobe. Premiere puede necesitar reiniciarse. Cualquier diálogo de credenciales del sistema lo atiende el usuario.
3. Abrir la app y entrar en Conexión con Premiere → Mostrar carpeta del panel.
4. En UDT, añadir el `manifest.json` de esa carpeta local y cargarlo en Premiere.
5. Abrir Ventana → UXP Plugins → SASA Premiere Studio. El panel preparado tiene su conexión local configurada automáticamente.
6. Abrir un proyecto de prueba, volver a la app y pulsar Actualizar.

La copia local del panel incluye `session.json`, que contiene la clave de emparejamiento de este equipo. No compartir esa carpeta ni copiar ese archivo al NAS. El código fuente y los paquetes de distribución no contienen claves.

## MCP

El servidor usa stdio del SDK oficial y está registrado en Codex como `sasa-premiere-studio`. Ejecuta la copia local del servidor e inicia el motor si no está abierto. La ventana auxiliar puede permanecer cerrada. Si otro cliente era dueño del motor y se cierra, la siguiente llamada MCP recupera el servicio; el panel se reconecta.

Herramientas de la primera versión:

- studio_status: estado real del servicio y panel.
- premiere_host_info: versión y capacidades comunicadas por el panel.
- premiere_project_snapshot: proyecto activo y secuencias.
- premiere_sequence_timeline: clips y tiempos de una secuencia del proyecto consultado.
- media_probe: formato, duración, resolución y pistas de un archivo.
- premiere_trim_video_clip_end: acorta un clip de vídeo; requiere identidad y tiempos de una lectura reciente. No cambia el audio ni guarda.
- premiere_save_project: guarda el proyecto identificado en su archivo actual.
- premiere_create_demo_edit: crea material sintético en una carpeta nueva y una edición de prueba de seis a cuatro segundos; requiere no tener proyecto activo.

El archivo `mcp-client.example.json` es una plantilla de conexión, no registra el servidor en ningún cliente automáticamente. La instalación o disponibilidad del MCP en una sesión concreta debe verificarse por separado.

## Pruebas

En una copia local del código: `npm ci`, `node node_modules/electron/install.js`, `npm run check`, `npm test`. FFmpeg/FFprobe deben estar en PATH para las pruebas de medios.

Las pruebas cubren autenticación, rechazo de operaciones no disponibles, desconexión, tiempos de espera, identidad del proyecto, truncamiento de consultas, transporte MCP real, análisis de medios sintéticos y la interfaz Electron. El adaptador de Premiere se prueba también con objetos simulados. La validación final del panel requiere Premiere real.

## Límites actuales

- Consultas de hasta 500 clips por llamada; la interfaz solicita 200. Se informa si el resultado está truncado.
- El snapshot se actualiza al conectar o al pulsar Actualizar; no es una suscripción a todos los cambios del editor.
- Los tiempos se devuelven en ticks como texto y segundos; la vista redondea segundos.
- La importación y creación de secuencias se limitan a la demostración. No hay exportación, edición de audio, títulos, efectos ni ejecución de scripts arbitrarios.
- Un servicio local y un panel por equipo. No se expone el puente a la red.
- El historial mostrado vive en memoria durante la sesión y no guarda rutas de medios ni claves.

Fuentes de implementación: [MCP SDK](https://ts.sdk.modelcontextprotocol.io/server), [seguridad Electron](https://www.electronjs.org/docs/latest/tutorial/security), [UXP y manifest](https://developer.adobe.com/uxp/guides/explanation/concepts/manifest/), [red UXP](https://developer.adobe.com/premiere-pro/uxp/resources/recipes/network/), [Sequence](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequence), [VideoTrack](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videotrack), [TickTime](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/ticktime).
