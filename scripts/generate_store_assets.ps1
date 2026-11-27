Add-Type -AssemblyName System.Drawing

$SourceImagePath = "C:\Users\vishn\.gemini\antigravity\brain\46ea55eb-e3c4-40fa-8c85-25a6e8fe5530\.user_uploaded\media_1795769333616_e2d4ef5b.jpg"
$OutputDir = "D:\Projects\AI_Resume_Tailor\store_assets"

if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$sourceImg = [System.Drawing.Image]::FromFile($SourceImagePath)

# ========================================================
# 1. SCREENSHOT 1280 x 800 (Professional Store Showcase)
# ========================================================
$w = 1280
$h = 800

# 24-bit RGB (no alpha) as required by Chrome Web Store
$bmp1280 = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($bmp1280)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Background Gradient
$rect = New-Object System.Drawing.Rectangle(0, 0, $w, $h)
$c1 = [System.Drawing.Color]::FromArgb(10, 14, 26)     # Dark navy blue
$c2 = [System.Drawing.Color]::FromArgb(22, 28, 48)     # Deep slate
$brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $c1, $c2, 45.0)
$g.FillRectangle($brush, $rect)
$brush.Dispose()

# Ambient glow or subtle background circles
$glowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(35, 99, 102, 241)) # Subtle indigo
$g.FillEllipse($glowBrush, 800, -100, 600, 600)
$g.FillEllipse($glowBrush, -100, 400, 500, 500)
$glowBrush.Dispose()

# Left Column: Marketing & Feature Highlights
$titleFont = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
$subFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$bodyFont = New-Object System.Drawing.Font("Segoe UI", 16, [System.Drawing.FontStyle]::Regular)
$featureFont = New-Object System.Drawing.Font("Segoe UI", 15, [System.Drawing.FontStyle]::Bold)

$whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255))
$cyanBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(99, 179, 237))
$greenBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(72, 187, 120))
$grayBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(160, 174, 192))

# Logo/Header
$g.DrawString("AI Resume Tailor", $titleFont, $whiteBrush, 70, 75)
$g.DrawString("ATS Optimization Engine for Chrome", $subFont, $cyanBrush, 72, 145)

$badgeBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(26, 32, 44))
$badgeBorder = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(74, 85, 104), 1)
$g.FillRectangle($badgeBrush, 72, 205, 520, 40)
$g.DrawRectangle($badgeBorder, 72, 205, 520, 40)
$tagFont = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$g.DrawString("100% FREE AI  •  ZERO BACKEND SERVERS  •  LOCAL STORAGE", $tagFont, $grayBrush, 85, 214)

# Feature list
$features = @(
    "1-Click Active Tab Job Scanning",
    "Tailors Authentic Resume Content without Hallucinations",
    "Uses Free Gemini Flash & Groq Llama 3.3 Models",
    "Automatic High-Demand & Deprecated Model Recovery",
    "Export Single-Page ATS PDF & Clean Markdown",
    "Privacy-First: Data stays in your browser"
)

$startY = 285
foreach ($feat in $features) {
    # Checkmark icon
    $g.DrawString("[v]", $featureFont, $greenBrush, 72, $startY)
    $g.DrawString($feat, $bodyFont, $whiteBrush, 115, $startY)
    $startY += 58
}

$footerFont = New-Object System.Drawing.Font("Segoe UI", 13, [System.Drawing.FontStyle]::Italic)
$g.DrawString("Compatible with LinkedIn, Indeed, Workday, Greenhouse, Lever, and custom portals.", $footerFont, $grayBrush, 72, 690)

# Right Column: Sidepanel Mockup Container with Drop Shadow
# Source image is 450 x 722
# Scale to height 700 -> width approx 436
$targetH = 700
$targetW = [int]($sourceImg.Width * ($targetH / $sourceImg.Height))
$targetX = 760
$targetY = 50

# Drop Shadow
$shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(60, 0, 0, 0))
$g.FillRectangle($shadowBrush, $targetX + 12, $targetY + 12, $targetW, $targetH)
$shadowBrush.Dispose()

# Draw Side Panel Frame
$g.DrawImage($sourceImg, $targetX, $targetY, $targetW, $targetH)

# Subtle border around mockup
$framePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(50, 70, 110), 2)
$g.DrawRectangle($framePen, $targetX, $targetY, $targetW, $targetH)
$framePen.Dispose()

$g.Dispose()

# Save 1280x800 as PNG (24-bit) and JPG (High Quality)
$png1280Path = Join-Path $OutputDir "screenshot_1280x800.png"
$jpg1280Path = Join-Path $OutputDir "screenshot_1280x800.jpg"

$bmp1280.Save($png1280Path, [System.Drawing.Imaging.ImageFormat]::Png)

$encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
$encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 95L)
$jpegCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageDecoders() | Where-Object { $_.FormatID -eq [System.Drawing.Imaging.ImageFormat]::Jpeg.Guid }
$bmp1280.Save($jpg1280Path, $jpegCodec, $encoderParams)

$bmp1280.Dispose()

# ========================================================
# 2. SMALL PROMO TILE 440 x 280 (Canvas for Store Feature)
# ========================================================
$pw = 440
$ph = 280
$bmp440 = New-Object System.Drawing.Bitmap($pw, $ph, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$gp = [System.Drawing.Graphics]::FromImage($bmp440)
$gp.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gp.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gp.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gp.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::ClearTypeGridFit

# Background Gradient
$rectP = New-Object System.Drawing.Rectangle(0, 0, $pw, $ph)
$brushP = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rectP, $c1, $c2, 45.0)
$gp.FillRectangle($brushP, $rectP)
$brushP.Dispose()

# Small tile typography
$pTitleFont = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$pSubFont = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$pDescFont = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Regular)

$gp.DrawString("AI Resume Tailor", $pTitleFont, $whiteBrush, 24, 30)
$gp.DrawString("ATS Optimization Engine", $pSubFont, $cyanBrush, 26, 68)

$pDesc = "Tailor your resume for any job listing`nin seconds with free Gemini & Groq AI.`n100% Privacy-First & Local Storage."
$gp.DrawString($pDesc, $pDescFont, $grayBrush, 26, 110)

# Mini Mockup on Right
$miniH = 220
$miniW = [int]($sourceImg.Width * ($miniH / $sourceImg.Height))
$miniX = 285
$miniY = 30
$gp.DrawImage($sourceImg, $miniX, $miniY, $miniW, $miniH)

$miniFrame = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(60, 80, 120), 1)
$gp.DrawRectangle($miniFrame, $miniX, $miniY, $miniW, $miniH)
$miniFrame.Dispose()

$gp.Dispose()

$png440Path = Join-Path $OutputDir "small_promo_tile_440x280.png"
$jpg440Path = Join-Path $OutputDir "small_promo_tile_440x280.jpg"

$bmp440.Save($png440Path, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp440.Save($jpg440Path, $jpegCodec, $encoderParams)

$bmp440.Dispose()
$sourceImg.Dispose()

Write-Host "Generated store graphics successfully:" -ForegroundColor Green
Write-Host "1. Screenshot (1280x800): $png1280Path / $jpg1280Path" -ForegroundColor Cyan
Write-Host "2. Small Promo Tile (440x280): $png440Path / $jpg440Path" -ForegroundColor Cyan
