#requires -Version 7
<#
  pre-commit guard – Billeterie Maïdo
  Bloque le commit si :
    - Artefacts sprint manquants: PLAN/BOARD/DEMO/REVIEW/RETRO/PREFLIGHT
    - PREFLIGHT.md incomplet (Code audit / DB audit / schema.sql RefreshedAt|unchanged)
    - PO_NOTES.md sans INTERACTION pour le sprint courant
    - BACKLOG.md: US origin:auto en Done sans links.api, <2 AC, ou sans note sécurité/RLS
    - Migrations modifiées sans mise à jour de schema.sql ni justification 'unchanged'
#>

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Fail($msg) {
  Write-Host "❌ $msg" -ForegroundColor Red
  exit 1
}

# 0) Récup fichiers modifiés (staged)
$staged = git diff --cached --name-only | Out-String
if (-not $staged) { Write-Host "ℹ️ Aucun fichier staged, rien à valider."; exit 0 }

# 1) Détection du sprint courant (plus grand S<N> avec PLAN.md)
$sprintDirs = Get-ChildItem -Recurse -Path "docs/sprints" -Directory -ErrorAction SilentlyContinue `
  | Where-Object { Test-Path (Join-Path $_.FullName "PLAN.md") } `
  | Sort-Object { [int]($_.Name -replace '^S','') }

if (-not $sprintDirs) { Fail "Aucun dossier sprint trouvé (docs/sprints/S<N>/PLAN.md)." }

$sprintDir = $sprintDirs[-1].FullName
$sprintName = Split-Path $sprintDir -Leaf
if ($sprintName -notmatch '^S(\d+)$') { Fail "Dossier sprint invalide: $sprintName" }
$sprintNum = [int]$Matches[1]

Write-Host "🧭 Sprint courant: $sprintName"

# 2) Artefacts requis
$required = @("PLAN.md","BOARD.md","DEMO.md","REVIEW.md","RETRO.md","PREFLIGHT.md")
foreach ($f in $required) {
  $p = Join-Path $sprintDir $f
  if (-not (Test-Path $p)) { Fail "Fichier manquant: $p" }
}

# 3) PREFLIGHT checks
$preflight = Get-Content (Join-Path $sprintDir "PREFLIGHT.md") -Raw
if ($preflight -notmatch '(?i)Code audit') { Fail "PREFLIGHT.md: section 'Code audit' manquante." }
if ($preflight -notmatch '(?i)DB audit')   { Fail "PREFLIGHT.md: section 'DB audit' manquante." }
if (($preflight -notmatch 'RefreshedAt') -and ($preflight -notmatch '(?i)unchanged')) {
  Fail "PREFLIGHT.md: préciser schema.sql RefreshedAt (ISO) ou 'unchanged' justifié."
}

# 4) PO_NOTES – interaction du sprint
if (-not (Test-Path "PO_NOTES.md")) { Fail "PO_NOTES.md manquant." }
$po = Get-Content "PO_NOTES.md" -Raw
$topicPattern = "topic:\s*Sprint\s+$sprintName"
if ($po -notmatch $topicPattern) {
  Fail "PO_NOTES.md: aucune INTERACTION pour $sprintName (ex: 'topic: Sprint $sprintName — validation prod')."
}

# 5) BACKLOG – valider US auto-generated en Done
if (-not (Test-Path "BACKLOG.md")) { Fail "BACKLOG.md manquant." }
$backlog = Get-Content "BACKLOG.md" -Raw

# extraire blocs yaml (```yaml ... ```)
$yamlBlocks = [regex]::Matches($backlog, '```yaml([\s\S]*?)```') | ForEach-Object { $_.Groups[1].Value }

foreach ($b in $yamlBlocks) {
  $status = ([regex]::Match($b, "\nstatus:\s*(.+)")).Groups[1].Value.Trim()
  $origin = ([regex]::Match($b, "\norigin:\s*(.+)")).Groups[1].Value.Trim()

  if ($status -eq "Done" -and $origin -eq "auto") {
    $hasApi = [regex]::IsMatch($b, "\nlinks:[\s\S]*?\n\s*-\s*api:\s*.+")
    # compter items après 'ac:'
    $acIdx = $b.IndexOf("`nac:"); if ($acIdx -lt 0) { $acIdx = $b.IndexOf("`rac:") } # robustesse
    $acCount = 0
    if ($acIdx -ge 0) {
      $after = $b.Substring($acIdx)
      $acCount = ([regex]::Matches($after, "\n\s*-\s+")).Count
    }
    $hasSec = [regex]::IsMatch($b, "(?i)\nnotes:[\s\S]*?(sécurité|securite|RLS|rls)")

    if (-not $hasApi -or $acCount -lt 2 -or -not $hasSec) {
      Fail "BACKLOG: US auto en Done invalide (links.api requis, ≥2 AC, note sécurité/RLS). Bloc:\n$b"
    }
  }
}

# 6) Migrations modifiées → exiger schema.sql ou justification 'unchanged'
function StagedFilesLike($pattern) {
  return (git diff --cached --name-only | Select-String -Pattern $pattern | ForEach-Object { $_.ToString() })
}

$migrationsChanged = @()
$migrationsChanged += StagedFilesLike '^supabase/migrations/'
$migrationsChanged += StagedFilesLike '^Infrastructure/.*/Migrations/'
$migrationsChanged += StagedFilesLike '^migrations/'

if ($migrationsChanged.Count -gt 0) {
  Write-Host "🗂️  Migrations modifiées:`n$($migrationsChanged -join "`n")"
  $schemaStaged = (git diff --cached --name-only | Select-String -Pattern '^schema.sql$')
  if (-not $schemaStaged) {
    if ($preflight -notmatch '(?i)unchanged') {
      Fail "Migrations modifiées mais `schema.sql` non mis à jour & PREFLIGHT sans justification 'unchanged'."
    }
  }
}

Write-Host "✅ pre-commit checks OK."
exit 0
