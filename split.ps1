$content = Get-Content -Path 'game.html' -Raw -Encoding UTF8

$cssRegex = '(?s)<style>(.*?)</style>'
$cssMatches = [regex]::Matches($content, $cssRegex)
if ($cssMatches.Count -gt 0) {
    # The first style tag contains the custom CSS
    $customCss = $cssMatches[0].Groups[1].Value.Trim()
    Set-Content -Path 'css\style.css' -Value $customCss -Encoding UTF8
}

$scriptRegex = '(?s)<script>(.*?)</script>'
$scriptMatches = [regex]::Matches($content, $scriptRegex)
if ($scriptMatches.Count -gt 0) {
    $jsContent = $scriptMatches[0].Groups[1].Value.Trim()
    
    # We will split JS content into config.js and game.js
    # Let's write the whole thing to a temp file first so we can analyze it
    Set-Content -Path 'js\all_script.js' -Value $jsContent -Encoding UTF8
}

$bodyRegex = '(?s)(<body.*?>.*?</body>)'
$bodyMatches = [regex]::Matches($content, $bodyRegex)
if ($bodyMatches.Count -gt 0) {
    $bodyContent = $bodyMatches[0].Groups[1].Value.Trim()
    
    # Create the new index.html
    $newHtml = @"
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pokemon Card Clash - Multi-Mode Edition</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="css/style.css">
</head>
$bodyContent
</html>
"@
    # We need to replace the inline script tag from the body with our external ones, or insert them before </body>
    $newHtml = $newHtml -replace '(?s)<script>.*?</script>', '<script src="js/config.js"></script>`r`n    <script src="js/game.js"></script>'
    
    Set-Content -Path 'index.html' -Value $newHtml -Encoding UTF8
}
