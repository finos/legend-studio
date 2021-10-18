#!/bin/bash

# Build the full Docker image without webapp content to publish to Docker Hub
# NOTE: if the image with the specified version tag already been published
# we will skip, instead of overriding


# ----------------------------------------- SETUP -----------------------------------------------

# NOTE: have to use -e for `echo` when using these colors to interpret the backslash escapes
LIGHT_BLUE='\033[1;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No color

# ----------------------------------------- MAIN ------------------------------------------------

DOCKER_IMAGE_NAME="$1"
ALREADY_PUBLISHED=true

if [[ -z "$2" ]]; then
  DOCKER_IMAGE_VERSION=$(cat ./package.json | jq .version | jq -r)
  docker pull $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION >/dev/null 2>&1 || {
    ALREADY_PUBLISHED=false
  }
else
  DOCKER_IMAGE_VERSION="$2"
  ALREADY_PUBLISHED=false
fi

if [[ $ALREADY_PUBLISHED = true ]]; then
  echo -e "${YELLOW}Image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION already existed. Aborting...${NC}"
  exit 0
fi

# Login to Docker Hub
#
# NOTE: Apparently, we cannot call `docker login ...` from `github-actions` pipeline
# as we will get the error: Cannot perform an interactive login from a non TTY device.
# so we will use `docker/login-action`, if we run this script manually, make sure we
# login beforehand.

# Build Docker image
echo -e "${LIGHT_BLUE}Building image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION ...${NC}"
docker build --quiet --tag $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION .

# Push Docker image
echo -e "${LIGHT_BLUE}Pushing image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION to Docker Hub...${NC}"
docker push --quiet $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION || {
  exit 1
}

echo -e "\n"
echo -e "${GREEN}Successfully published image $DOCKER_IMAGE_NAME:$DOCKER_IMAGE_VERSION to Docker Hub! ${NC}"
echo -e "\n"
