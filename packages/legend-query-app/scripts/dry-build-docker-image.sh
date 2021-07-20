#!/bin/bash

# Build a simplified Docker image without webapp content to check for error and
# to use that image for security scanning.


# ----------------------------------------- SETUP -----------------------------------------------

# NOTE: have to use -e for `echo` when using these colors to interpret the backslash escapes
GREEN='\033[0;32m'
NC='\033[0m' # No color

PWD="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"


# ----------------------------------------- MAIN ------------------------------------------------

DOCKER_IMAGE_NAME="local/legend-query" # make this different from the name of the actual image to publish to prevent accidental push

mkdir -p ./dist/query # since we are checking Docker image, we don't need to generate webapp content

if [[ -z "$1" ]]; then
  DOCKER_IMAGE_TAG=latest
else
  DOCKER_IMAGE_TAG=$1
fi
docker build --quiet --tag $DOCKER_IMAGE_NAME:${DOCKER_IMAGE_TAG} $PWD/../
echo -e "${GREEN}Successfully dry-built image ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}.${NC}"
