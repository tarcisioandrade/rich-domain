# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.0.0](https://github.com/tarcisioandrade/rich-domain/compare/v0.2.2...v1.0.0) (2025-11-20)


### Features

* enhance DeepProxy with history tracking and array change detection ([721444c](https://github.com/tarcisioandrade/rich-domain/commit/721444cec2a5deb683ea79c044f9ea0dc840d75b))


### Bug Fixes

* date serialization to deepToJson ([be77cc6](https://github.com/tarcisioandrade/rich-domain/commit/be77cc6815c6effba999063bba9f4d73ba59d778))
* rename FilterOperator to FILTER_OPERATORS for consistency and update related references ([5f3c784](https://github.com/tarcisioandrade/rich-domain/commit/5f3c784d0a35a3b24cf37cbc8a727dc68a96579e))


### Chores

* update TypeScript configuration to use CommonJS module and Node resolution ([c3f39cd](https://github.com/tarcisioandrade/rich-domain/commit/c3f39cdd9cc2c76653197a8b7b6e8ec3fd794ecf))


### Tests

* update history tracker tests to include user property changes and post management ([29bdab1](https://github.com/tarcisioandrade/rich-domain/commit/29bdab14b7b43f32576a821851ba97618848ab7b))


### Refactoring

* change isNew property to a public method for improved access ([186defd](https://github.com/tarcisioandrade/rich-domain/commit/186defddad9740fc036acbebbb09fce2feb795db))
* optimize hasChanged method by introducing normalization and stringification ([0162b92](https://github.com/tarcisioandrade/rich-domain/commit/0162b92d6d3613026a02830e992e0d6072258d82))
* simplify repository exports and remove outdated comments ([9b3c3dc](https://github.com/tarcisioandrade/rich-domain/commit/9b3c3dc05ae883ea4559ca59af7f3f666bbfe61b))

### [0.2.2](https://github.com/tarcisioandrade/rich-domain/compare/v0.2.1...v0.2.2) (2025-11-20)


### Features

* introduce Mapper class and refactor repository structure for improved abstraction and clarity ([f88538b](https://github.com/tarcisioandrade/rich-domain/commit/f88538bcde21dcd72714d24acdc7c8c38fb371f3))


### Chores

* change-package-name ([e5aea77](https://github.com/tarcisioandrade/rich-domain/commit/e5aea77a60fd0504d569e9c437aa3d1f99cbe961))

### [0.2.1](https://github.com/tarcisioandrade/rich-domain/compare/v0.2.0...v0.2.1) (2025-11-19)


### Bug Fixes

* update TypeScript configuration for module resolution and add check script ([4c0951f](https://github.com/tarcisioandrade/rich-domain/commit/4c0951fa3ce7551fc9182a7e584578053d0137a7))


### Chores

* add ignoreDeprecations option to TypeScript configuration ([a66e528](https://github.com/tarcisioandrade/rich-domain/commit/a66e5289c33972f0449f9eb6d9e6fb85054888c4))

## [0.2.0](https://github.com/tarcisioandrade/rich-domain/compare/v0.1.0...v0.2.0) (2025-11-19)


### Features

* add repository and unit of work modules with transaction management and clean exports ([83b652c](https://github.com/tarcisioandrade/rich-domain/commit/83b652cf751c2824799cfc961b282413ac7667f7))
* add search functionality to Criteria class with related methods ([1445e09](https://github.com/tarcisioandrade/rich-domain/commit/1445e092141c538766af39ec7de13421bf318393))
* implement abstract base repository and mapper for domain persistence ([f6b06ca](https://github.com/tarcisioandrade/rich-domain/commit/f6b06ca59292d9290e438717acaf2eaf361f63a7))
* implement criteria with filtering, ordering, and pagination ([bb42425](https://github.com/tarcisioandrade/rich-domain/commit/bb42425cc9e763ced350c3e6ee86954a5239cfb6))
* implement InMemoryRepository for testing with CRUD operations and criteria support ([a9d0cf6](https://github.com/tarcisioandrade/rich-domain/commit/a9d0cf63e68ab40d2944b6f26792ebfc456db176))


### Bug Fixes

* disable no-unsafe-function-type rule in ESLint configuration ([f185ed9](https://github.com/tarcisioandrade/rich-domain/commit/f185ed920eda8e1f1c205aed8d7f1091cd03fbee))


### Chores

* add coverage directory to .gitignore ([7a895f0](https://github.com/tarcisioandrade/rich-domain/commit/7a895f0ca777c27056f5bfd5adeed0b44049c60e))
* enhance Jest configuration and add coverage script to package.json ([d3b08d9](https://github.com/tarcisioandrade/rich-domain/commit/d3b08d97a4ecb650825e0b99d307203a5449ee96))
* update .gitignore to exclude example directories ([26c2d41](https://github.com/tarcisioandrade/rich-domain/commit/26c2d4140403877dabbd8a8b2b86250fa459f9b5))
* update version to 0.1.0 and add release scripts ([bb0aafa](https://github.com/tarcisioandrade/rich-domain/commit/bb0aafa85b5527d8ac3a582fcb75c489e7a4aa7a))


### Refactoring

* drop default values ([a7e130a](https://github.com/tarcisioandrade/rich-domain/commit/a7e130af3a7ece31bb7bdf38afd7e05ed724bf3c))
* move pagination logic to a new PaginatedResult class and update criteria tests ([96639e1](https://github.com/tarcisioandrade/rich-domain/commit/96639e15c9e7aa2794f7439741150d1a8b087d39))
* reorganize types and constants, introduce new criteria types ([170e93a](https://github.com/tarcisioandrade/rich-domain/commit/170e93a2b9f68c21e02818f87171df242018a130))
* update access modifiers and default values in BaseEntity and Criteria classes ([75cde9d](https://github.com/tarcisioandrade/rich-domain/commit/75cde9d162adc1ad8d142140186592c155415c2e))


### Documentation

* enhance README with new features ([0a49e63](https://github.com/tarcisioandrade/rich-domain/commit/0a49e6339bd36ae0c3193f8a3389906b139e56b3))

## 0.1.0 (2025-11-16)


### Features

* domain-events implementation ([92384cc](https://github.com/tarcisioandrade/rich-domain/commit/92384cc4cc645ccb2a92ea9348491b05c7e34247))
* entity equality ([eb19399](https://github.com/tarcisioandrade/rich-domain/commit/eb19399375daaafb8aad850ba9cee590e6ddf11f))
* id class ([086d6b6](https://github.com/tarcisioandrade/rich-domain/commit/086d6b622041f03c70519e667c3d7b009c241c60))


### Refactoring

* Change property access in BaseEntity and related classes ([ceacca1](https://github.com/tarcisioandrade/rich-domain/commit/ceacca18b33d70a0d87119436c7b6180ddf61648))
* Remove Result class and related tests ([02fa29f](https://github.com/tarcisioandrade/rich-domain/commit/02fa29ff6bdad377c5c0737e9cec2dd2f36940af))
* Standardize quotes and remove obsolete test files ([2a38df7](https://github.com/tarcisioandrade/rich-domain/commit/2a38df7a88f418b63797dd32241284a52bdae3cf))


### Tests

* validation tests ([eb620a4](https://github.com/tarcisioandrade/rich-domain/commit/eb620a4aec22d2335a466f002f8659bf402ced74))


### Chores

* config ci and eslint ([88fba8f](https://github.com/tarcisioandrade/rich-domain/commit/88fba8fe51b0929cc55a649cfbf1e76d9bfb99b2))
* update CI node version matrix to only include 20.x ([9aecd60](https://github.com/tarcisioandrade/rich-domain/commit/9aecd6043dd391a2795e1209631b57d542c748da))
* update node engine requirement to >=20.0.0 ([213629c](https://github.com/tarcisioandrade/rich-domain/commit/213629cb64b3b85452f0364f802bb58bd4a757f8))
* update node engine requirement to >=22.0.0 ([1bad966](https://github.com/tarcisioandrade/rich-domain/commit/1bad966de395ff2b02dd0d7a4627aa725039b862))
