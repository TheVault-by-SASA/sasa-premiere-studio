# Primera edición real mediante MCP

Verificada el 13 de septiembre de 2026 (hora de Nueva York), con Premiere 26.5.0 y UXP Developer Tools 2.3.0.5.

## Resultado

El cliente MCP stdio consultó el host, creó un proyecto nuevo con vídeo sintético de seis segundos, creó la secuencia, acortó el clip a cuatro segundos mediante una transacción de Premiere y guardó el proyecto. Una lectura posterior devolvió cuatro segundos para el clip y la secuencia. La inspección del archivo .prproj guardado confirmó tanto la secuencia como el tiempo de 1016064000000 ticks. El vídeo original sigue durando seis segundos.

Prueba completa: 3394 ms. Consultas posteriores: 55–70 ms en este equipo. Estos tiempos corresponden a una secuencia mínima y no predicen el rendimiento con proyectos grandes ni renderizados.

## Integración instalada

- Panel cargado desde la copia local preparada, con emparejamiento automático.
- MCP `sasa-premiere-studio` registrado en Codex mediante su CLI y verificado por lectura de configuración.
- Ocho herramientas MCP; cinco consultas y tres operaciones de escritura.
- Motor bajo demanda desde el MCP; la ventana Electron es auxiliar.
- No se requiere clave de OpenAI ni otro proveedor para este puente: usa la conversación de Codex y la API local de Premiere.

La prueba usó un cliente real del SDK MCP. La aparición de las nuevas herramientas en el catálogo de esta conversación de Codex depende de que la aplicación recargue los MCP; no se confunde registro con disponibilidad inmediata de herramientas en una tarea ya abierta.

## Correcciones verificadas

1. UXP exige `plugin.create` cuando se declara el ciclo de vida del plugin.
2. El campo HTML vacío devuelve null en UXP; se normaliza antes de leerlo.
3. El dominio local con dirección IP fue rechazado por el permiso de red. `ws://localhost/` funcionó; el servidor sigue escuchando solo en loopback y exige autenticación.
4. Crear acciones requiere `project.lockedAccess`. La transacción crea y aplica la acción dentro del mismo bloqueo síncrono.
5. Las órdenes abandonan el callback de red antes de entrar al host, mediante una espera de 50 ms. Se conserva la ejecución serial.

## Incidencia y límites

La primera prueba de guardado dejó de responder y requirió recuperar la sesión de Premiere, que contenía exclusivamente el proyecto sintético. La prueba posterior pasó después de separar la entrada al host del evento de red y usar una carpeta de documentos fuera del runtime empaquetado. No se ha aislado cuál de esos cambios resolvió el fallo; aún requiere más pruebas de estabilidad. No se modificaron proyectos del usuario.

La herramienta de recorte modifica solamente el final de un clip de vídeo; no mueve otros clips ni modifica audio vinculado. Comprueba nombre, posición e identidad del proyecto y secuencia antes de editar. El cambio es deshacible en Premiere. El guardado es una operación explícita separada, salvo en la demostración.

Ante un timeout de escritura, el resultado se informa como incierto y se debe leer el proyecto antes de repetir. No hay reintentos automáticos de edición. El panel reconecta su transporte cuando es necesario.

Importación y creación de secuencias generales, edición de audio, títulos, efectos, transiciones, reencuadre y exportación están pendientes. No se anuncia edición total.

Fuentes: [API Project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project), [cambios UXP y bloqueo de acciones](https://developer.adobe.com/premiere-pro/uxp/changelog/), [red UXP](https://developer.adobe.com/premiere-pro/uxp/resources/recipes/network/), [configurar MCP en Codex](https://learn.chatgpt.com/docs/extend/mcp?surface=cli).
