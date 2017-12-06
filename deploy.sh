#!/bin/bash
./build.sh

host=casili.site
dir=/home/nvlled/code/casili.site/algebra
echo "dir: $dir"

ssh $host mkdir -p $dir
rsync -L --exclude "*.local" -av ./$destDir/ $host:$dir
