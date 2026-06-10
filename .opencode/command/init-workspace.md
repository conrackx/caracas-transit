# init-workspace

Inicializa/actualiza la herencia del workspace en un sub-proyecto.

## Paso 0: Detectar workspace_root (reutilizable)

Para detectar `workspace_root` desde cualquier directorio, ejecuta este bloque PowerShell:

```powershell
$workRoot = $null
$dir = $PWD.Path
$ErrorActionPreference = 'SilentlyContinue'
while ($dir -and $dir -ne (Split-Path $dir -Qualifier)) {
  $hasGit = Test-Path "$dir\.git" -PathType Container
  $hasWL  = Test-Path "$dir\work_log" -PathType Container
  $hasAgents = $false
  if ($hasGit -and $hasWL -and (Test-Path "$dir\AGENTS.md")) {
    try {
      $txt = Get-Content "$dir\AGENTS.md" -Raw -Encoding UTF8
      $hasAgents = $txt -match 'Est.ndares de Ingenier.a Globales'
    } catch { $hasAgents = $false }
  }
  if ($hasGit -and $hasWL -and $hasAgents) { $workRoot = $dir; break }
  $parent = Split-Path $dir -Parent
  if (-not $parent -or $parent -eq $dir) { break }
  $dir = $parent
}
if (-not $workRoot) { Write-PSFMessage -Level Error "Workspace root no válido. Abortando." -ErrorAction Stop }
```

> **Nota:** Usar siempre `-Encoding UTF8` al leer archivos. El regex `Est.ndares` tolera el carácter especial en el archivo original.

---

## Modo de ejecución

### Desde la raíz con `--all`
Si `workRoot -eq $PWD.Path`:
1. Listar subdirectorios inmediatos y filtrar: excluir `_legacy_*`, `.git`, `work_log`, `.opencode`, `node_modules`, `.vscode`, `opencode` (sin punto).
2. Para cada carpeta: verificar marcador de proyecto (uno de: `AGENTS.md`, `.git/`, `.opencode/`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`).
3. Si tiene marcador: `Set-Location` a esa carpeta, fijar `$cwd = (Get-Location).Path`, y ejecutar los Pasos 1–6.
4. Al final, reportar resumen.

### Desde un sub-proyecto
Si `$PWD.Path` comienza por `$workRoot\`:
- Fijar `$cwd = (Get-Location).Path` y ejecutar los Pasos 1–6 directamente.

### Error sin flags
Si `$PWD.Path -eq $workRoot` y no hay `--all`: abortar con mensaje "Ejecuta desde un sub-proyecto, o usa --all desde la raíz".

---

## Lógica de inicialización (por sub-proyecto)

Aplica cuando se ha fijado `$cwd` y `$workRoot`.

---

### Paso 1: Validaciones previas

Ejecutar en PowerShell:

```powershell
if (-not (Test-Path "$workRoot\work_log" -PathType Container))
  { throw "Falta work_log/ en $workRoot" }

$cmdDir = "$workRoot\.opencode\command"
if (-not (Test-Path $cmdDir -PathType Container))
  { New-Item -ItemType Directory -Path $cmdDir -Force | Out-Null }

if (-not (Test-Path "$workRoot\.gitignore" -PathType Leaf))
  { Write-PSFMessage -Level Warning "Falta .gitignore en $workRoot"
}
```

> `Write-PSFMessage` se usa como alias genérico de `Write-Host`/`Write-Warning`. Si la función no existe, reemplazar por `Write-Host` o `Write-Warning`.

---

### Paso 2: Calcular rutas y nombre

```powershell
$rel = Resolve-Path -Relative $workRoot
$REL_PATH = $rel -replace '^\\\\(.+)', '$1'
# normalizar prefijo "..\.." si aparece escapado (opcional)
$REL_PATH = $REL_PATH -replace '^\\.\\.\\\\', '..'

$basename = Split-Path $cwd -Leaf
$PROJECT_NAME = $basename.ToLower()
$PROJECT_NAME = $PROJECT_NAME -replace '[áàä]','a' -replace '[éèë]','e' -replace '[íìï]','i' -replace '[óòö]','o' -replace '[úùü]','u' -replace '[ñ]','n'
$PROJECT_NAME = $PROJECT_NAME -replace '[^a-z0-9]+','-' -replace '^-|-$',''
if ($PROJECT_NAME.Length -gt 40) { $PROJECT_NAME = $PROJECT_NAME.Substring(0,40) -replace '-$','' }
```

**Destino:**
- `$REL_PATH`: ruta relativa desde `$cwd` a `$workRoot` → ej: `..`, `../..`
- `$PROJECT_NAME`: slug nombre proyecto

---

### Paso 3: Manejo de AGENTS.md existente

```powershell
$agentsPath = "$cwd\AGENTS.md"
$localSections = ""

if (Test-Path $agentsPath) {
  $existing = Get-Content $agentsPath -Raw -Encoding UTF8
  $localSections = ""

  $idx = $existing.IndexOf('## Convenciones Propias')
  if ($idx -ge 0) {
    $localSections = $existing.Substring($idx).TrimEnd("`r","`n")
  }

  $ts = Get-Date -Format 'yyyyMMddHHmmss'
  Copy-Item $agentsPath "$agentsPath.bak.$ts"
  Write-PSFMessage -Level Information "Backup creado: AGENTS.md.bak.$ts"
}
```

Tras este paso, `$localSections` contiene las convenciones previas (o `""` si no había).

---

### Paso 4: Escribir AGENTS.md

Construir el contenido final y escribirlo con `Set-Content -Encoding UTF8 -NoNewline`.

**Template:**

```
# AGENTS.md — {PROJECT_NAME}

> **Herencia:** Este proyecto hereda los [Estándares de Ingeniería Globales]({REL_PATH}/AGENTS.md#estándares-de-ingeniería-globales-heredables) del workspace raíz. Las reglas definidas aquí **sobrescriben o extienden** los estándares globales.

## Workflow `/cerrar-sesion`

Desde este directorio:

\`\`\`bash
cd {REL_PATH} && opencode run cerrar-sesion
\`\`\`

El comando detecta actividad en `cwd` actual y genera log en `work_log/` raíz.

## Convenciones Propias
{LOCAL_SECTIONS}
```

Reglas de composición:
- Si `$localSections` está vacío: después de `## Convenciones Propias` insertar `*Por definir - agregar según necesidad del proyecto*`.
- Si `$localSections` ya tiene contenido (ej: tenía `## Convenciones Propias` en el AGENTS.md anterior), **No** duplicar el placeholder.

**Ejemplo de ejecución en PowerShell:**

```powershell
$body = @"
# AGENTS.md — $PROJECT_NAME

> **Herencia:** Este proyecto hereda los [Estándares de Ingeniería Globales]($REL_PATH/AGENTS.md#est%c3%a1ndares-de-ingenier%c3%ada-globales-heredables) del workspace raíz. Las reglas definidas aqu%iacute; **sobrescriben o extienden** los est%aacute;ndares globales.

## Workflow `/cerrar-sesion`

Desde este directorio:

\`\`\`bash
cd $REL_PATH && opencode run cerrar-sesion
\`\`\`

El comando detecta actividad en \`cwd\` actual y genera log en \`work_log/\` ra%iacute;z.

## Convenciones Propias
"@

if ([string]::IsNullOrWhiteSpace($localSections))
{
  $body += @"
`n`n*Por definir - agregar según necesidad del proyecto*
"@
}
else
{
  $body += "`n`n" + $localSections + "`n"
}

Set-Content -Path $agentsPath -Value $body -Encoding UTF8
Write-PSFMessage -Level Information "AGENTS.md generado en: $agentsPath"
```

> **URL-encode** `estándares-de-` → `est%c3%a1ndares-de-` para garantizar un enlace válido. El fragmento `-heredables` se mantiene sin codificar.

---

### Paso 5: Crear `.opencode/command/` en el sub-proyecto

**Windows:**
```powershell
$target = "$cwd\.opencode\command"
$source = "$workRoot\.opencode\command"

if (Test-Path $target) {
  $item = Get-Item $target -Force -ErrorAction SilentlyContinue
  if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0)
  {
    cmd.exe /c 'rmdir "' + $target + '"'
  }
  else
  {
    $ts = Get-Date -Format 'yyyyMMddHHmmss'
    Rename-Item $target ($target + '.bak.' + $ts)
  }
}

$out = cmd.exe /c 'mklink /J "' + $target + '" "' + $source + '"' 2>&1
if ($LASTEXITCODE -ne 0)
{
  if (Test-Path $target) { Remove-Item $target -Recurse -Force }
  $out2 = cmd.exe /c 'mklink /J "' + $target + '" "' + $source + '"' 2>&1
  if ($LASTEXITCODE -ne 0)
  {
    New-Item -ItemType Directory -Path $target -Force | Out-Null
    Copy-Item (Join-Path $source '*') $target -Recurse -Force
    $linkStatus = 'copia'
    Write-PSFMessage -Level Warning "No se pudo crear junction. Se copiaron archivos. Sync manual futura requerida."
  }
  else { $linkStatus = 'junction' }
}
else { $linkStatus = 'junction' }
```

**POSIX (Linux/macOS/WSL):**
```bash
target="$cwd/.opencode/command"
source="$workRoot/.opencode/command"
rm -rf "$target" 2>/dev/null
ln -sfn "$source" "$target"
linkStatus="symlink"
```

Fijar variable `linkStatus` (`junction` | `copia` | `symlink`).

---

### Paso 6: Validación y reporte

Validar:
- `(Get-Content $agentsPath -Raw -Encoding UTF8).Length -gt 0`
- `Test-Path "$cwd\.opencode\command"` (o `$cwd/.opencode/command` en POSIX)

Reportar éxito con formato:

```
[OK] init-workspace completado

  Proyecto : {PROJECT_NAME}
  Ruta rel. : {REL_PATH}
  AGENTS.md : {cwd}\AGENTS.md
  Command   : {cwd}\.opencode\command  [{linkStatus}]
  Backup    : (ninguno o ruta .bak.YYYYMMDDHHMMSS)
```
