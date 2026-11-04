$ErrorActionPreference = 'Stop'
# Compatibility entry point; the Node launcher owns preparation and startup.
& node (Join-Path $PSScriptRoot 'launch.cjs')
if ($LASTEXITCODE -ne 0) { throw 'No se pudo abrir SASA Premiere Studio.' }
