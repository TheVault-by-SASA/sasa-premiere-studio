# Interfaz compacta del panel

Actualización visual de 0.2.0, 14 de septiembre de 2026. Referencia: cuadro de mensajes de Codex compartido por el usuario.

- Historial flexible y cuadro de mensaje fijo en la parte inferior.
- Botón compacto que muestra modelo y razonamiento juntos; abre las dos opciones de selección.
- Flecha circular de envío; cambia a Detener durante una petición.
- Enter envía y Shift + Enter inserta una nueva línea.
- Iconos de conectar Premiere, desconectar, reconectar Codex y ajustes con tooltips nativos y etiquetas accesibles.
- La clave de conexión manual se muestra desde ajustes.
- Contador discreto; al pulsarlo se despliega entrada, salida y última petición.
- Se conserva el texto si falla el envío o si el usuario comienza un borrador diferente mientras espera.

Controles Spectrum UXP quiet para evitar el aspecto elevado de los botones HTML nativos. Panel cargado y revisado en Premiere 26.5; menú combinado abierto y tooltips comprobados. Pruebas existentes de interfaz e inicio del panel aprobadas; sintaxis validada. No se hicieron llamadas nuevas a modelos ni cambios en el proyecto de Premiere para esta actualización.

Refinamiento posterior: caja de fondo uniforme, sin subrayado visible del editor; placeholder breve; nombre del modelo y razonamiento a 10 px. Se conserva el editor multilinea nativo dentro de una superficie que recorta únicamente su borde inferior. Iconos SVG con trazados rellenos compatibles con UXP: lápiz para nueva sesión, chevron para el selector, flecha para enviar y controles de conexión discretos. Revisados dentro de Premiere, incluido el menú y su tooltip; las dos pruebas de interfaz y los 39 controles de sintaxis/JSON pasan.

Las sesiones del panel se guardan como tareas independientes en Codex: se comprobó que la sesión de prueba aparece en la lista de tareas. No se fusionan con la conversación desde la que se desarrolla el plugin. Aún no existe sincronización completa de mensajes entre el panel y otro cliente que abra esa tarea.

El panel envía actualmente solo texto. Para imágenes de referencia se puede utilizar una conversación de Codex que admita adjuntos, pero estos no se transfieren automáticamente a la sesión del panel. Los adjuntos en Premiere requieren una implementación posterior.

Conexión unificada: un solo botón de encendido sustituye a conectar/desconectar. Se ilumina en verde tras la confirmación del servicio, queda gris al desconectar y ámbar mientras conecta o espera un reintento. Su tooltip indica la acción siguiente. El apagado manual cancela los reintentos; durante el cierre se bloquea momentáneamente para evitar conexiones superpuestas. Probado el ciclo conectado → desconectado → conectado dentro de Premiere, además de las pruebas de arranque y recuperación de red.

Distribución final del compositor: Nueva sesión pasa a la cabecera, junto al botón de conexión. El selector de modelo se alinea a la izquierda y su texto se reduce a 9 px. Enviar utiliza una flecha verde de 20 px con trazo más grueso, sin círculo blanco ni fondo contrastante al estar activo; se mantienen las protecciones de envío vacío y petición en curso. Verificado escribiendo y retirando un borrador visual, sin enviarlo. Las pruebas existentes de interfaz y panel y la comprobación de sintaxis/JSON pasan.

La caja de escritura conserva el fondo #202020, elimina el borde exterior y reduce el radio de las esquinas de 16 a 8 px. Comprobado visualmente en Premiere.
