# SASA Premiere Studio 0.2 — Sesión de Codex en Premiere

El panel integra una sesión independiente de Codex App Server mediante un proceso local y comunicación privada por stdio. Usa la sesión de ChatGPT de Codex; no copia credenciales ni utiliza una clave de API como alternativa silenciosa. El MCP de edición existente permanece disponible para el chat de Codex y para el panel.

## Uso

1. Abre Window > UXP Plugins > SASA Premiere Studio en Premiere.
2. La conexión es automática cuando el servicio local está activo. Si falta, abre la app auxiliar o conecta el MCP desde Codex.
3. Elige un modelo y un nivel de razonamiento. Los modelos y niveles provienen de la cuenta, no de una lista fija.
4. Escribe la instrucción y pulsa Enviar. La selección se aplica a la siguiente petición.
5. Detener interrumpe la petición; conserva los cambios ya aplicados en Premiere. Nueva sesión inicia una conversación y un contador independientes; el historial anterior permanece en Codex.

El panel se puede acoplar al espacio de trabajo. Su contenido tiene desplazamiento vertical para ventanas pequeñas.

## Contador

Los eventos `thread/tokenUsage/updated` proporcionan instantáneas absolutas: total acumulado, entrada, salida y detalle de la última respuesta interna. Se reemplaza el valor anterior, sin sumar cada notificación. Los tokens de caché y razonamiento son subconjuntos y no se suman otra vez. «Última petición» muestra la diferencia del total desde el inicio de la petición del usuario; puede incluir varias llamadas al modelo y a herramientas.

El contador se actualiza cuando Codex confirma consumo, no token por token. Antes de recibir datos se muestra un guion. Los tokens consumidos no equivalen a dinero, porcentaje de cuota disponible ni ocupación de la ventana de contexto. La sesión del panel es independiente de esta conversación en la app de Codex.

La sesión activa, la selección, hasta 60 mensajes visibles y el consumo se conservan en `agent-session.json` dentro del directorio de estado local. La conversación completa pertenece al almacenamiento de Codex. No se sincronizan historial ni credenciales con APPS.

## Validación real

Premiere 26.5.0, panel y servicio 0.2.0. Cuenta ChatGPT detectada. Seis modelos devueltos por `model/list`.

- GPT-6 Astra/medio consultó `premiere_project_snapshot` mediante MCP y reconoció el proyecto sintético SASA-Prueba-MCP.prproj. Consumo confirmado: 34 681 tokens acumulados.
- Se cambió a GPT-5.6 Sol/bajo y se envió una segunda petición breve sin herramientas. Respondió «Selector y contador conectados.». Consumo acumulado: 56 139; segunda petición: 21 458.
- Se restauró Astra/medio al terminar la prueba.
- La recarga del panel recuperó la conversación y el consumo.
- 30 pruebas automáticas aprobadas: transporte autenticado, edición existente, modelo/nivel, instantáneas repetidas, restauración, concurrencia, detención, solicitudes al usuario y presentación del contador.

Esta validación no amplía las operaciones de edición: siguen siendo consultas, recorte del final de un clip de vídeo y guardado. Las autorizaciones de comandos/archivos y preguntas se presentan al usuario; interacciones adicionales de permisos y formularios MCP no implementadas se rechazan explícitamente. Las peticiones con resultados inciertos no se reintentan automáticamente.

## Componentes

- `services/codex-session/rpc.js`: descubrimiento del ejecutable, JSON-RPC, límites de espera y ciclo de vida del proceso.
- `services/codex-session/session.js`: catálogo, selección, turnos, eventos, persistencia y respuestas del usuario.
- `apps/premiere-panel/agent-ui.js`: controles UXP, historial y contador.
- `/agent` HTTP autenticado y mensajes `agent.command`, `agent.result`, `agent.state` sobre la conexión local del panel.

Prueba real optativa: `node scripts/verify-codex.js`. Envía una consulta y consume cuota de la cuenta; las pruebas automáticas no invocan modelos.

Fuentes: [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Adobe UXP dropdown](https://developer.adobe.com/premiere-pro/uxp/uxp-api/reference-spectrum/spectrum-uxp-widgets/user-interface/sp-dropdown).
