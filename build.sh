#!/bin/bash
tsc
webpack --config webpack-babel.config.js

destDir=build/games
mkdir -p $destDir
cp -rv static $destDir/
cp index.html $destDir
