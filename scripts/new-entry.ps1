# Usage: .\scripts\new-entry.ps1 ["Optional title"]   (or: .\scripts\new-entry.ps1 2026-10-01 "Title")
Set-Location (Join-Path $PSScriptRoot '..')
node scripts/new-entry.mjs @args
