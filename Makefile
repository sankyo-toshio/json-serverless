SHELL := /bin/bash
.DEFAULT_GOAL := help

.PHONY: help
help:  ## help target to show available commands with information
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) |  awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

.PHONY: install
install: 
	npx lerna bootstrap

.PHONY: download
download: 
	npm i -g json-serverless
	jsonsls

.PHONY: publish
publish: ## Build Container
	make install
	npx lerna publish prerelease --skip-git --yes
	make download