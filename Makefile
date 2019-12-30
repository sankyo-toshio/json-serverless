SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help
help:  ## help target to show available commands with information
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) |  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: 
	npm i
	npx lerna bootstrap

.PHONY: download
download: 
	npm i -g json-serverless
	jsonsls

.PHONY: publish-test
publish-manually:
	make install
	npx lerna version patch --force-publish --conventional-commits --create-release github --yes

.PHONY: publish
publish:
	make install
	npx lerna version patch --force-publish --conventional-commits --create-release github --yes

.PHONY: start-test
start-test:
	make install
	npx lerna run --scope json-serverless  --stream test:start

.PHONY: deploy-test
deploy-test:
	make install
	npx lerna run --scope json-serverless  --stream test:create-stack

.PHONY: fake-credentials
fake-credentials:
	mkdir -p ~/.aws
	touch ~/.aws/credentials
	echo -e "[default]\naws_access_key_id=xxxx\naws_secret_access_key=xxx" > ~/.aws/credentials
	echo -e "[profile default]\nregion=eu-central-1" > ~/.aws/config