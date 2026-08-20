#!/bin/bash
# Assembles parts/<Name>.body.html + parts/<Name>.css + shared helmet -> <Name>.dc.html
set -e
for name in "$@"; do
  {
    echo '<!doctype html>'
    echo '<html>'
    echo '<head>'
    echo '  <meta charset="utf-8">'
    echo '  <script src="./support.js"></script>'
    echo '</head>'
    echo '<body>'
    echo '<x-dc>'
    echo '<helmet>'
    echo '  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&display=swap">'
    echo '  <style>'
    ./mkhead.sh
    cat parts/common.css
    [ -f "parts/${name}.css" ] && cat "parts/${name}.css"
    echo '  </style>'
    echo '</helmet>'
    cat "parts/${name}.body.html"
    echo '</x-dc>'
    echo '<script data-dc-script data-props='"'"'{"$preview":{"width":1440,"height":900}}'"'"'>'
    echo 'class Component extends DCLogic {'
    echo '  renderVals() { return {}; }'
    echo '}'
    echo '</script>'
    echo '</body>'
    echo '</html>'
  } > "${name}.dc.html"
  echo "built ${name}.dc.html ($(wc -c < "${name}.dc.html") bytes)"
done
