#!/bin/bash
rm -rf ./dist
node --max_old_space_size=4096 ./node_modules/.bin/webpack --mode=production