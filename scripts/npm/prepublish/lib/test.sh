#!/bin/bash
set -e

git commit -am "travis test"
git push "https://${GH_TOKEN}@${GH_REF}" master:master
