param(
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Require-EnvVar([string]$Name) {
  $value = [Environment]::GetEnvironmentVariable($Name)
  if ([string]::IsNullOrWhiteSpace($value)) {
    throw "Missing required environment variable: $Name"
  }
  return $value
}

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
Push-Location $root
try {
  $token = Require-EnvVar "SUPABASE_ACCESS_TOKEN"
  $projectRef = Require-EnvVar "SUPABASE_PROJECT_REF"
  $dbPassword = Require-EnvVar "SUPABASE_DB_PASSWORD"

  Write-Host "Using project ref: $projectRef"
  if ($DryRun) {
    Write-Host "Dry run mode enabled. No remote changes will be applied."
    cmd /c npx -y supabase login --token "%SUPABASE_ACCESS_TOKEN%"
    cmd /c npx -y supabase link --project-ref "%SUPABASE_PROJECT_REF%" --password "%SUPABASE_DB_PASSWORD%"
    cmd /c npx -y supabase db push --include-all --include-seed --dry-run --password "%SUPABASE_DB_PASSWORD%"
    exit 0
  }

  cmd /c npx -y supabase login --token "%SUPABASE_ACCESS_TOKEN%"
  cmd /c npx -y supabase link --project-ref "%SUPABASE_PROJECT_REF%" --password "%SUPABASE_DB_PASSWORD%"
  cmd /c npx -y supabase db push --include-all --include-seed --password "%SUPABASE_DB_PASSWORD%"
  Write-Host "Supabase migration + seed applied successfully."
}
finally {
  Pop-Location
}
