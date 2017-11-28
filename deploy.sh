#!/bin/bash
destDir=build/games
cp -rv static $destDir/
cp index.html $destDir

host=casili.site
dir=/home/nvlled/code/casili.site/algebra
echo "dir: $dir"

webpack --config webpack-babel.config.js
ssh $host mkdir -p $dir
rsync -L --exclude "*.local" -av ./$destDir/ $host:$dir
