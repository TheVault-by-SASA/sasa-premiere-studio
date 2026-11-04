# Matriz inicial de capacidades

Documentada significa que existe una operación pertinente en la documentación consultada. No significa implementada ni probada en este equipo. Todas las pruebas dentro de Premiere están pendientes.

| Área | Evidencia o vía | Estado y límite |
|---|---|---|
| Consultar proyecto y secuencias | Project.getActiveProject, getSequences | Documentada |
| Importar medios | Project.importFiles | Documentada; formatos y errores por probar |
| Crear secuencias con preset | Project.createSequenceWithPresetPath | Documentada desde 26.3 |
| Insertar y sobrescribir clips | SequenceEditor.createInsertProjectItemAction, createOverwriteItemAction | Documentada |
| Duplicar y eliminar clips | createCloneTrackItemAction, createRemoveItemsAction | Documentada; ripple y audio enlazado por probar |
| Posición y recorte de video | VideoClipTrackItem: acciones start/end/in/out y move | Documentada; semántica temporal por comprobar |
| Transiciones de video | createAddVideoTransitionAction, createRemoveVideoTransitionAction | Documentada; compatibilidad y límites por probar |
| Insertar gráficos MOGRT | insertMogrtFromPath / insertMogrtFromLibrary | Documentada; editar todos sus campos no está comprobado |
| Guardado y transacciones | Project.save, saveAs, executeTransaction, lockedAccess | Documentada; recuperación por probar |
| Exportar y enviar a Media Encoder | EncoderManager.exportSequence | Documentada; presets y archivo final por comprobar |
| Importar composiciones AE | Project.importAEComps / importAllAEComps | Documentada; no prueba control completo de After Effects |
| Efectos, parámetros y keyframes | Cadena de componentes del clip | Investigación detallada pendiente |
| Lumetri y gestión completa de color | APIs y parámetros concretos por identificar | No confirmado |
| Mezcla, automatización y efectos de audio | APIs de clips y componentes de audio por revisar | No confirmado |
| Subtítulos y edición por transcripción | Funciones nativas e intercambio por investigar | No confirmado; análisis externo como vía posible |
| Multicámara, remapeo de tiempo, máscaras y tracking | Revisar cada operación por separado | No confirmado |
| Funciones generativas de Adobe | Disponibilidad de APIs y acceso por investigar | No confirmado |
| Plugins y efectos de terceros | Depende de lo que expongan sus parámetros | Sin garantía universal |
| Procesamiento nativo C++ | UXP Hybrid Plugins desde 26.2 | Plataforma documentada; no añade por sí sola nuevas APIs del editor |

## Fuentes

- [Project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project)
- [SequenceEditor](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequenceeditor)
- [VideoClipTrackItem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videocliptrackitem)
- [EncoderManager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/encodermanager)
- [Hybrid Plugins](https://developer.adobe.com/premiere-pro/uxp/plugins/hybrid-plugins/)

Para promover una operación a verificada se registrarán versión del host, parámetros, resultado esperado, lectura posterior y comportamiento de recuperación. La cobertura incluirá casos reales de edición y limitaciones conocidas.
