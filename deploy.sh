#!/bin/bash
host=casili.site
dir=/home/nvlled/code/casili.site/algebra
echo "dir: $dir"

webpack
ssh $host mkdir -p $dir
rsync -L --exclude "*.local" -av ./dist/ $host:$dir
