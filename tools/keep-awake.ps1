param(
    [Parameter(Mandatory = $true)]
    [int] $Minutes,

    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]] $Command
)

if ($Minutes -le 0) {
    Write-Error "Minutes must be a positive integer."
    exit 2
}

if ($Command.Count -eq 0) {
    Write-Error "Missing command to run."
    exit 2
}

$arguments = @()
if ($Command.Count -gt 1) {
    $arguments = $Command[1..($Command.Count - 1)]
}

$process = Start-Process -FilePath $Command[0] -ArgumentList $arguments -NoNewWindow -PassThru
$deadline = (Get-Date).AddMinutes($Minutes)

while (-not $process.HasExited -and (Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 1
}

if (-not $process.HasExited) {
    Stop-Process -Id $process.Id -Force
    exit 124
}

exit $process.ExitCode

