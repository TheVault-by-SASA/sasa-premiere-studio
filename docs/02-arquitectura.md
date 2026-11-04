# Arquitectura propuesta

Decisión de producto: una app integrada, con el panel de Premiere como uno de sus componentes. Ninguno está implementado todavía.

## Componentes

1. Interfaz de escritorio: estado de Premiere, proyectos, medios, trabajos, resultados y recuperación. La tecnología de interfaz se decidirá después de la prueba de conexión.
2. Servicio local en TypeScript/Node.js: mantiene sesiones, coordina solicitudes y ejecuta procesos de medios fuera de Premiere. El código, documentos y versiones pertenecen a APPS; dependencias, cachés y renderizados de desarrollo deben usar almacenamiento local para evitar depender del rendimiento del NAS.
3. Servidor MCP: publica operaciones estructuradas y sus resultados. Comparte contratos con la app; no contiene una segunda implementación de edición.
4. Panel UXP: conecta al servicio local, consulta el proyecto y ejecuta las operaciones admitidas por la API de Premiere.
5. Adaptador de Premiere: detecta versión y capacidades en tiempo de ejecución. Ofrece únicamente operaciones disponibles y comprobadas.
6. Análisis de medios: FFmpeg/FFprobe para inspección y derivados; transcripción y análisis visual mediante proveedores por seleccionar. Esta capa propone decisiones editoriales; no se presupone que las funciones de IA internas de Adobe sean accesibles.
7. Extensión C++ opcional: solo para necesidades medidas de rendimiento o integración nativa. No equivale a acceso universal al editor. CEP u otras APIs se evaluarán por función si UXP deja una carencia documentada; no son dependencias iniciales.

## Conexión y ejecución

Flujo: interfaz o cliente MCP -> servicio local -> panel UXP -> Premiere -> lectura del resultado -> respuesta.

El panel inicia la conexión WebSocket. El puente se limita al equipo local, con emparejamiento autenticado y permisos de red explícitos. Se proponen contratos tipados de operaciones; no una herramienta genérica de ejecución de código recibido.

Cada solicitud incluye identificador único, proyecto, secuencia, parámetros y estado esperado. El sistema distingue recibido, ejecutando, completado, fallido y resultado incierto. Tras una desconexión no repite una edición sin comprobar si ya ocurrió.

Las operaciones de edición se serializan por proyecto y revalidan sus objetivos. Cuando corresponda se crean acciones bajo lockedAccess y se ejecutan en una transacción de Premiere. La respuesta confirma los cambios mediante una nueva lectura del proyecto. Las exportaciones tienen seguimiento de trabajo independiente: comenzar una exportación no significa haber generado el archivo correctamente.

La recuperación combina transacciones deshacibles, registro de operaciones y copias de trabajo según el caso. No todas las acciones ni los efectos externos son deshacibles. saveAs cambia el proyecto activo y el objeto Project: el adaptador debe actualizar su identidad y no reutilizar una referencia como si siguiera apuntando al original.

## Calidad editorial

El tiempo se representa con precisión de fotograma/ticks y tasas racionales. Audio enlazado, canales, límites de medio, clips anidados, transiciones, medios offline y cambios realizados por el editor deben formar parte de las pruebas.

El acceso a efectos y parámetros se determina por lo que expone el host. Una función pendiente o no disponible debe explicar su estado. Ninguna interfaz anunciará control total mientras no exista evidencia de esa cobertura.

Fuentes: [red UXP](https://developer.adobe.com/premiere-pro/uxp/resources/recipes/network/), [Project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project), [plugins híbridos](https://developer.adobe.com/premiere-pro/uxp/plugins/hybrid-plugins/). El diseño del servicio, contratos y recuperación es una propuesta propia, no una arquitectura prescrita por Adobe.
