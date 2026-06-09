param(
    [string] $Directory = ".",
    [int] $MaxDepth = 3,
    [switch] $Delete,
    [switch] $Yes,
    [switch] $IncludeDirs
)

if (-not (Test-Path -Path $Directory -PathType Container)) {
    Write-Error "'$Directory' is not a directory."
    exit 2
}

if ($MaxDepth -le 0) {
    Write-Error "MaxDepth must be a positive integer."
    exit 2
}

$root = (Resolve-Path $Directory).Path
$pattern = '( [0-9]+| \([0-9]+\)| copy( [0-9]+)?)(\.[^.]+)?$'
$matches = Get-ChildItem -LiteralPath $root -Recurse -Depth ($MaxDepth - 1) -Force |
    Where-Object { $IncludeDirs -or -not $_.PSIsContainer } |
    Where-Object { $_.Name -match $pattern }

if ($matches.Count -eq 0) {
    Write-Output "No duplicate-looking paths found in $Directory (max depth $MaxDepth)."
    exit 0
}

Write-Output "Found $($matches.Count) duplicate-looking path(s):"
$matches | ForEach-Object { Write-Output "  $($_.FullName)" }

if (-not $Delete) {
    Write-Output ""
    Write-Output "Scan only. Re-run with -Delete to remove these paths."
    exit 0
}

if (-not $Yes) {
    $answer = Read-Host "Remove these $($matches.Count) path(s)? [y/N]"
    if ($answer -notmatch '^[Yy]([Ee][Ss])?$') {
        Write-Output "Aborted."
        exit 0
    }
}

$matches | Remove-Item -Recurse -Force
Write-Output "Done."

