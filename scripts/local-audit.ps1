New-Item -Force -ItemType Directory reports | Out-Null

Write-Host "▶ TypeScript check..."
npm run typecheck 2>&1 | Tee-Object -FilePath reports\typecheck.txt

Write-Host "▶ ESLint..."
npm run lint 2>&1 | Tee-Object -FilePath reports\lint.txt

Write-Host "▶ Unit tests..."
npm run test:unit 2>&1 | Tee-Object -FilePath reports\tests.txt

Write-Host "▶ Build..."
npm run build 2>&1 | Tee-Object -FilePath reports\build.txt

Write-Host "`n✅ Rapports générés dans 'reports\' :"
Get-ChildItem reports | Select-Object Name,Length,LastWriteTime
