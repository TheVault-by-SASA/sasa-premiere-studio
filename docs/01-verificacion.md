# Verificación inicial

Fecha de investigación: 2026-09-13. Fuentes oficiales consultadas en línea y comprobaciones locales de solo lectura.

## Equipo

| Componente | Evidencia | Resultado |
|---|---|---|
| Premiere | VersionInfo de Adobe Premiere Pro.exe | Producto 26.5.0; archivo 26.5.0.99 |
| Media Encoder | VersionInfo del ejecutable instalado | 26.5.0 |
| After Effects | VersionInfo de AfterFX.exe | 26.5 |
| Creative Cloud | VersionInfo de Creative Cloud.exe | 6.10.0.253 |
| Node.js | Consulta de versión | 24.15.0 |
| npm | Consulta de versión | 11.12.1 |
| Git | Consulta de versión | 2.54.0.windows.1 |
| FFmpeg / FFprobe | Consulta de versión | 8.1.1 |
| UXP Developer Tool | Registro de desinstalación y tres ubicaciones habituales | No detectado; su ausencia no se ha demostrado exhaustivamente |
| Herramientas C++ | Búsqueda de Build Tools en el registro | No detectadas en esa consulta; compilador y SDK pendientes de verificar |
| Modo desarrollador de Premiere | No inspeccionado ni modificado | Pendiente |
| Panel conectado / licencia activa | No se abrió ni operó Premiere | Pendiente |

## Requisitos oficiales

UXP requiere Premiere 25.6 o posterior y UXP Developer Tool 2.2 o posterior. El tutorial pide activar el modo desarrollador y reiniciar Premiere. Es una acción futura, aún no realizada. [Adobe: primer plugin](https://developer.adobe.com/premiere-pro/uxp/plugins/)

Los plugins híbridos requieren Premiere 26.2, UDT 2.2 y Creative Cloud 5.10 como mínimo, además del SDK y compilación nativa. Amplían el procesamiento disponible; no conceden automáticamente acceso a todas las funciones internas de edición. [Adobe: plugins híbridos](https://developer.adobe.com/premiere-pro/uxp/plugins/hybrid-plugins/)

UXP permite conexiones HTTP y WebSocket con dominios declarados. El panel actúa como cliente WebSocket; el servidor debe vivir fuera de Premiere. La conexión local, permisos y transporte elegidos se probarán antes de implementar edición. [Adobe: red](https://developer.adobe.com/premiere-pro/uxp/resources/recipes/network/)

## Límites de esta verificación

Se verificaron versiones y documentación, no comportamiento en el host. No se ejecutó un plugin de muestra ni una edición. Tampoco se midieron GPU, rendimiento, codecs de entrega o compatibilidad de efectos de terceros. No se promete edición total ni una fecha de entrega.

## Referencias adicionales

- [Plataformas oficiales: UXP, CEP y SDK C++](https://developer.adobe.com/premiere-pro/)
- [Project](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/project)
- [SequenceEditor](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/sequenceeditor)
- [VideoClipTrackItem](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/videocliptrackitem)
- [EncoderManager](https://developer.adobe.com/premiere-pro/uxp/ppro-reference/classes/encodermanager)

El MCP comunitario mencionado anteriormente sirve solo como referencia de viabilidad. No se descargó ni reutilizó código de ese proyecto; esta app se plantea como desarrollo propio.
