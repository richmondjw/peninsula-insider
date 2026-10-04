param([switch]$Start,[string]$StateDirectory)
$ErrorActionPreference = 'Stop'
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$receiptRoot = Join-Path $repoRoot 'ops/reports/events/intelligence'
$stateRoot = if ($StateDirectory) { [IO.Path]::GetFullPath($StateDirectory) } else { Join-Path $receiptRoot 'live-runtime' }
$stageRoot = Join-Path $receiptRoot ('runtime-build-' + (Get-Date -Format 'yyyyMMdd-HHmmss'))
New-Item -ItemType Directory -Force $stateRoot,$stageRoot | Out-Null
$paths = @('ops/event-intelligence','next/node_modules/parse5','next/node_modules/entities','next/src/content/events','next/src/content/venues','next/src/lib/event-publication.mjs','next/src/lib/event-map.mjs','next/src/lib/event-occurrence.mjs','next/src/lib/intelligence-series.mjs','next/src/lib/event-schedule.ts')
foreach ($relativePath in $paths) {
 $targetPath = Join-Path $stageRoot $relativePath
 New-Item -ItemType Directory -Force (Split-Path $targetPath) | Out-Null
 Copy-Item -LiteralPath (Join-Path $repoRoot $relativePath) -Destination $targetPath -Recurse
}
$manifestRows = @(Get-ChildItem -LiteralPath $stageRoot -File -Recurse | Sort-Object FullName | ForEach-Object {
 [ordered]@{path=$_.FullName.Substring($stageRoot.Length+1).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLower()}
})
$manifestText = ConvertTo-Json -Depth 4 -InputObject ([ordered]@{createdAt=[DateTime]::UtcNow.ToString('o');files=$manifestRows})
$utf8 = New-Object System.Text.UTF8Encoding($false)
[IO.File]::WriteAllText((Join-Path $stageRoot 'source-manifest.json'),$manifestText,$utf8)
$codeHash = (Get-FileHash -LiteralPath (Join-Path $stageRoot 'source-manifest.json') -Algorithm SHA256).Hash.ToLower()
$imageName = 'pi-event-intelligence:' + $codeHash.Substring(0,12)
& docker --context desktop-linux build --label 'pi.managed=event-intelligence' --label ('pi.codeHash='+$codeHash) --tag $imageName --file (Join-Path $stageRoot 'ops/event-intelligence/runtime/Dockerfile') $stageRoot
if ($LASTEXITCODE -ne 0) { throw 'Runtime image build failed' }
# Seed only when state does not already exist; never overwrite operator review work.
$seedNames = @('details','review-packet.json','discovery-leads.json','shire-boundary.json','boundary-review.json','source-navigation')
$registry = Get-Content -Raw -LiteralPath (Join-Path $repoRoot 'ops/event-intelligence/sources.json') | ConvertFrom-Json
$seedNames += @($registry.sources | ForEach-Object { $_.id+'.json' })
foreach ($name in $seedNames) {
 $sourcePath = Join-Path $receiptRoot $name
 $targetPath = Join-Path $stateRoot $name
 if ((Test-Path -LiteralPath $sourcePath) -and !(Test-Path -LiteralPath $targetPath)) { Copy-Item -LiteralPath $sourcePath -Destination $targetPath -Recurse }
}
$install = [ordered]@{installedAt=[DateTime]::UtcNow.ToString('o');image=$imageName;codeHash=$codeHash;stateDirectory=$stateRoot;contextDirectory=$stageRoot;container='pi-event-intelligence';started=$false}
if ($Start) {
 $existing = & docker --context desktop-linux ps -a --filter 'name=^/pi-event-intelligence$' --format '{{.ID}}'
 if ($existing) { throw 'Existing event service found; inspect it and use the documented controlled update procedure.' }
 & docker --context desktop-linux run --detach --name pi-event-intelligence --label 'pi.managed=event-intelligence' --restart unless-stopped --read-only --cap-drop ALL --security-opt no-new-privileges --cpus 0.75 --memory 768m --tmpfs '/tmp:rw,noexec,nosuid,size=64m' --mount ('type=bind,source='+$stateRoot+',target=/data') $imageName --daemon /data
 if ($LASTEXITCODE -ne 0) { throw 'Event service start failed' }
 $install.started=$true
}
[IO.File]::WriteAllText((Join-Path $receiptRoot 'runtime-install.json'),(ConvertTo-Json -Depth 5 -InputObject $install),$utf8)
$install | ConvertTo-Json -Depth 4
