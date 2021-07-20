#!/bin/bash

# Build a simplified Docker image without webapp content to check for error and
# to use that image for security scanning.


# ----------------------------------------- SETUP -----------------------------------------------

# NOTE: have to use -e for `echo` when using these colors to interpret the backslash escapes
GREEN='\033[0;32m'
NC='\033[0m' # No color


# ----------------------------------------- MAIN ------------------------------------------------

DOCKER_IMAGE_NAME="local/$1" # make this different from the name of the actual image to publish to prevent accidental push

mkdir -p $2 # since we are checking Docker image, we don't need to generate webapp content

if [[ -z "$3" ]]; then
  DOCKER_IMAGE_TAG=latest
else
  DOCKER_IMAGE_TAG=$3
fi
docker build --quiet --tag $DOCKER_IMAGE_NAME:${DOCKER_IMAGE_TAG} .
echo -e "${GREEN}Successfully dry-built image ${DOCKER_IMAGE_NAME}:${DOCKER_IMAGE_TAG}.${NC}"
