$src = "$env:USERPROFILE\AppData\Local\Google\Chrome\User Data\Default\Network\Cookies"
$dst = "d:\SAGE DO ASSETS\Kizen-CRM\cookies.db"

$srcStream = [System.IO.File]::Open($src, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
$dstStream = [System.IO.File]::Create($dst)
$srcStream.CopyTo($dstStream)
$srcStream.Close()
$dstStream.Close()

Write-Host "COPIED COOKIES SUCCESSFULLY! Size: $((Get-Item $dst).Length)"
