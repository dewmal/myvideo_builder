$ErrorActionPreference = 'Stop'

$projectDirectory = Split-Path -Parent $PSScriptRoot
& uv run --project $projectDirectory python (Join-Path $PSScriptRoot 'qwen_tts_server.py')
exit $LASTEXITCODE
