Add-Type -AssemblyName System.Drawing

function Generate-Icon([int]$size, [string]$outputPath) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    $s = [float]$size / 128.0

    # 1. Background Squircle
    $pad = [float](3.0 * $s)
    $w = [float]($size - 2.0 * $pad)
    $radius = [float](26.0 * $s)
    $diam = [float]($radius * 2.0)

    $bgPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $bgPath.AddArc($pad, $pad, $diam, $diam, 180, 90)
    $bgPath.AddArc($pad + $w - $diam, $pad, $diam, $diam, 270, 90)
    $bgPath.AddArc($pad + $w - $diam, $pad + $w - $diam, $diam, $diam, 0, 90)
    $bgPath.AddArc($pad, $pad + $w - $diam, $diam, $diam, 90, 90)
    $bgPath.CloseFigure()

    $pStart = [System.Drawing.PointF]::new($pad, $pad)
    $pEnd = [System.Drawing.PointF]::new(($pad + $w), ($pad + $w))
    $cTop = [System.Drawing.Color]::FromArgb(255, 79, 70, 229)    # Indigo #4F46E5
    $cBottom = [System.Drawing.Color]::FromArgb(255, 124, 58, 237) # Violet #7C3AED

    $bgBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new($pStart, $pEnd, $cTop, $cBottom)
    $g.FillPath($bgBrush, $bgPath)

    # Subtle 1px inner border
    $borderPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(70, 255, 255, 255), [float](1.5 * $s))
    $g.DrawPath($borderPen, $bgPath)

    # 2. White Resume Document
    $docX = [float](28.0 * $s)
    $docY = [float](22.0 * $s)
    $docW = [float](50.0 * $s)
    $docH = [float](74.0 * $s)
    $fold = [float](16.0 * $s)

    $docPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $docPath.AddLine($docX, $docY, $docX + $docW - $fold, $docY)
    $docPath.AddLine($docX + $docW - $fold, $docY, $docX + $docW, $docY + $fold)
    $docPath.AddLine($docX + $docW, $docY + $fold, $docX + $docW, $docY + $docH)
    $docPath.AddLine($docX + $docW, $docY + $docH, $docX, $docY + $docH)
    $docPath.CloseFigure()

    $docBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 248, 250, 252))
    $g.FillPath($docBrush, $docPath)

    # Folded flap
    $foldPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $foldPath.AddLine($docX + $docW - $fold, $docY, $docX + $docW - $fold, $docY + $fold)
    $foldPath.AddLine($docX + $docW - $fold, $docY + $fold, $docX + $docW, $docY + $fold)
    $foldPath.CloseFigure()
    $foldBrush = [System.Drawing.SolidBrush]::new([System.Drawing.Color]::FromArgb(255, 203, 213, 225))
    $g.FillPath($foldBrush, $foldPath)

    # Document text lines
    if ($size -ge 32) {
        $linePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(255, 148, 163, 184), [float](3.5 * $s))
        $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
        $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

        $g.DrawLine($linePen, [float]($docX + 8.0 * $s), [float]($docY + 16.0 * $s), [float]($docX + 22.0 * $s), [float]($docY + 16.0 * $s))
        $g.DrawLine($linePen, [float]($docX + 8.0 * $s), [float]($docY + 28.0 * $s), [float]($docX + 38.0 * $s), [float]($docY + 28.0 * $s))
        $g.DrawLine($linePen, [float]($docX + 8.0 * $s), [float]($docY + 40.0 * $s), [float]($docX + 34.0 * $s), [float]($docY + 40.0 * $s))
        $g.DrawLine($linePen, [float]($docX + 8.0 * $s), [float]($docY + 52.0 * $s), [float]($docX + 26.0 * $s), [float]($docY + 52.0 * $s))
        $linePen.Dispose()
    }

    # 3. Radiant Lightning Bolt / Sparkle (Amber-Gold)
    $boltPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
    $bx = [float](62.0 * $s)
    $by = [float](36.0 * $s)
    $bs = [float](0.95 * $s)

    [System.Drawing.PointF[]]$points = @(
        [System.Drawing.PointF]::new(($bx + 26.0 * $bs), ($by + 0.0 * $bs)),
        [System.Drawing.PointF]::new(($bx + 0.0 * $bs), ($by + 34.0 * $bs)),
        [System.Drawing.PointF]::new(($bx + 18.0 * $bs), ($by + 34.0 * $bs)),
        [System.Drawing.PointF]::new(($bx + 6.0 * $bs), ($by + 70.0 * $bs)),
        [System.Drawing.PointF]::new(($bx + 40.0 * $bs), ($by + 26.0 * $bs)),
        [System.Drawing.PointF]::new(($bx + 22.0 * $bs), ($by + 26.0 * $bs))
    )
    $boltPath.AddPolygon($points)

    # Dark contrast outline around the bolt
    $boltShadowPen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(220, 20, 15, 60), [float](4.0 * $s))
    $boltShadowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $g.DrawPath($boltShadowPen, $boltPath)

    # Gold-Amber gradient fill for bolt
    $pB1 = [System.Drawing.PointF]::new($bx, $by)
    $pB2 = [System.Drawing.PointF]::new(($bx + 40.0 * $bs), ($by + 70.0 * $bs))
    $boltBrush = [System.Drawing.Drawing2D.LinearGradientBrush]::new(
        $pB1, $pB2,
        [System.Drawing.Color]::FromArgb(255, 253, 224, 71),  # Bright Yellow #FDE047
        [System.Drawing.Color]::FromArgb(255, 245, 158, 11)   # Warm Amber #F59E0B
    )
    $g.FillPath($boltBrush, $boltPath)

    # Save to disk
    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    # Cleanup
    $boltBrush.Dispose()
    $boltShadowPen.Dispose()
    $boltPath.Dispose()
    $foldBrush.Dispose()
    $foldPath.Dispose()
    $docBrush.Dispose()
    $docPath.Dispose()
    $borderPen.Dispose()
    $bgBrush.Dispose()
    $bgPath.Dispose()
    $g.Dispose()
    $bmp.Dispose()
}

$iconDir = "D:\Projects\AI_Resume_Tailor\icons"
Generate-Icon 128 "$iconDir\icon128.png"
Generate-Icon 48  "$iconDir\icon48.png"
Generate-Icon 16  "$iconDir\icon16.png"

Write-Output "Successfully generated icon128.png, icon48.png, and icon16.png"
