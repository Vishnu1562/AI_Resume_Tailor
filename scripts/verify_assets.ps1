Add-Type -AssemblyName System.Drawing
$files = @('screenshot_1280x800.png', 'screenshot_1280x800.jpg', 'small_promo_tile_440x280.png', 'small_promo_tile_440x280.jpg')
foreach ($f in $files) {
    $p = "D:\Projects\AI_Resume_Tailor\store_assets\$f"
    $img = [System.Drawing.Image]::FromFile($p)
    Write-Host "$f => $($img.Width)x$($img.Height), Format: $($img.PixelFormat)"
    $img.Dispose()
}
