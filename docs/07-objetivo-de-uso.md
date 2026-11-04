# Objetivo de uso confirmado

El usuario da instrucciones al asistente en la conversación, y el asistente las ejecuta en Adobe Premiere a través del MCP. La interfaz de escritorio existente se conserva como herramienta auxiliar de diagnóstico; no debe ser un paso obligatorio para editar.

Ejemplo de experiencia objetivo: «Recorta esta entrevista, añade los planos de apoyo y exporta una versión vertical». El asistente consulta los medios y la secuencia, aplica las operaciones disponibles y verifica el resultado en Premiere.

Prioridades siguientes:

1. Cargar y validar el panel real de Premiere.
2. Conectar el MCP al asistente.
3. Permitir que el motor local se inicie bajo demanda o en segundo plano, sin exigir abrir la ventana de escritorio.
4. Implementar y probar operaciones de edición en proyectos de prueba.
5. Ampliar capacidades según las necesidades reales del usuario.

Estado actualizado: el MCP está registrado y puede iniciar el servicio sin abrir la app. Se verificaron la conexión real con Premiere, consultas del proyecto y secuencia, recorte de seis a cuatro segundos y guardado de una prueba sintética. Se conservan todos los avances y la interfaz existente. Próxima etapa: ampliar la edición y comprobarla con casos representativos, incluidos audio vinculado, montaje, títulos y exportación.

## Herramientas de Adobe

UXP Developer Tools 2.3.0.5 instalado; usuario activó Developer Mode tanto en UDT como en Premiere. Fue necesario reiniciar Premiere para que UDT lo detectara. Panel SASA cargado y autenticado en Premiere 26.5.

