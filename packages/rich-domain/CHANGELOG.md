# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.3.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.4...v1.3.0) (2025-12-05)


### Features

* add docs favicon ([d901f21](https://github.com/tarcisioandrade/rich-domain/commit/d901f21a0affc79ed1e8351807d0cf431815cd37))
* add Tag and Group models, implement tagging functionality in Post service ([58bc9b8](https://github.com/tarcisioandrade/rich-domain/commit/58bc9b8149db9a1e866396843ebd1a797e4bdb90))
* enhance criteria parsing to support filters with quantifiers and improve error handling ([db72d14](https://github.com/tarcisioandrade/rich-domain/commit/db72d14e03c4adfd2dfc83a25ca5168c87bbe16d))
* enhance Criteria.fromQueryParams to support multiple orderBy formats ([94a3b7d](https://github.com/tarcisioandrade/rich-domain/commit/94a3b7d87c9ebdf9409462c497c704cdac3f6cf9))
* include parentId and parentEntity for N:N relation support ([afa5d5f](https://github.com/tarcisioandrade/rich-domain/commit/afa5d5f2346ff371ead349e132235194561ad070))
* integrate Fastify Swagger and rich-domain-criteria-zod ([65b86cf](https://github.com/tarcisioandrade/rich-domain/commit/65b86cfc234d1cf0453ce523617543925c9efaa1))
* introduce error handling for batch operations and enhance Prisma repository with validation ([ba9e9af](https://github.com/tarcisioandrade/rich-domain/commit/ba9e9af3da4bb3e9925dcb16136efebb514145cf))
* onBeforeCreate implementation ([6055817](https://github.com/tarcisioandrade/rich-domain/commit/6055817f3772d822cd5e91c16e38c77cd313bb31))
* refactor criteriaToQueryParams to support quantifiers in filters and improve value handling ([29c6d94](https://github.com/tarcisioandrade/rich-domain/commit/29c6d94d6ccd7fb6f1eef95fd7d6471e9512d637))
* relation field implementation to N:N actions ([4a286f4](https://github.com/tarcisioandrade/rich-domain/commit/4a286f459d0b9a62a290e68fbd6d2557fc82ea10))
* rich domain criteria zod package implementation ([e25b45b](https://github.com/tarcisioandrade/rich-domain/commit/e25b45b0a42a4237d1db043568e682de0a86b030))


### Chores

* update package.json files for rich-domain and rich-domain-prisma ([4857580](https://github.com/tarcisioandrade/rich-domain/commit/4857580accfe8a4ec1cc4d73f57f2ef9bc62fc65))
* update zod dependency to version 4.1.5 and adjust Criteria.fromQueryParams type ([40d0a41](https://github.com/tarcisioandrade/rich-domain/commit/40d0a41acf13adf08d0b3d2998b9a99023ee6749))


### Documentation

* change toJson to toJSON ([df27a2c](https://github.com/tarcisioandrade/rich-domain/commit/df27a2c16874a6ae30554f4c796c46946e739871))


### Refactoring

* enhance search handling in useCriteria hook and related types ([caa7ff6](https://github.com/tarcisioandrade/rich-domain/commit/caa7ff6656369135216b7c8c48f88cb9a52cd8ef))
* improve search parameter handling in criteria persistence utilities ([eca3695](https://github.com/tarcisioandrade/rich-domain/commit/eca36950def882b6565e64846e201f44101f9027))
* remove redundant comments and improve constructor formatting in error classes ([0dab1ea](https://github.com/tarcisioandrade/rich-domain/commit/0dab1ea740c0af229ab3be703b4e2a91b54bc696))
* rename toJson methods to toJSON for consistency across rich-domain classes ([d37eaef](https://github.com/tarcisioandrade/rich-domain/commit/d37eaefce2ba6fc4c4da735000a2fe1b672c89c5))
* simplify search handling in Criteria class and update related types ([bd3e840](https://github.com/tarcisioandrade/rich-domain/commit/bd3e8403e91ed9bc33f0a1ca2feebe555e84ec2d))
* streamline EntitySchemaRegistry configuration for Post and User mappers ([566999f](https://github.com/tarcisioandrade/rich-domain/commit/566999ff0aedb68b130968f7875a957e98245940))
* update filter components and utility functions for improved criteria handling ([baa05f8](https://github.com/tarcisioandrade/rich-domain/commit/baa05f864576049678147c3a596afb054382dc94))

### [1.2.4](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.2...v1.2.4) (2025-11-30)


### Bug Fixes

* critic bug ([474a8d9](https://github.com/tarcisioandrade/rich-domain/commit/474a8d90fc9fb2810dc37018c86dce234d2ac08f))
* improve deep cloning logic in BaseEntity to handle structuredClone fallback ([78f8fbf](https://github.com/tarcisioandrade/rich-domain/commit/78f8fbf5846650a7e3783aa55023d94db65572f6))


### Tests

* add comprehensive deep tracking tests for nested entity structures ([66b0c33](https://github.com/tarcisioandrade/rich-domain/commit/66b0c3399e825b24925a7ae3056e57a18ec6d93c))


### Refactoring

* change visibility of prisma client in PrismaRepository constructor ([1cf83ed](https://github.com/tarcisioandrade/rich-domain/commit/1cf83ed97585fddd6a25125cedc1bcf72b289713))

### [1.2.3](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.2...v1.2.3) (2025-11-30)


### Bug Fixes

* critic bug ([474a8d9](https://github.com/tarcisioandrade/rich-domain/commit/474a8d90fc9fb2810dc37018c86dce234d2ac08f))
* improve deep cloning logic in BaseEntity to handle structuredClone fallback ([78f8fbf](https://github.com/tarcisioandrade/rich-domain/commit/78f8fbf5846650a7e3783aa55023d94db65572f6))


### Tests

* add comprehensive deep tracking tests for nested entity structures ([66b0c33](https://github.com/tarcisioandrade/rich-domain/commit/66b0c3399e825b24925a7ae3056e57a18ec6d93c))

### [1.2.2](https://github.com/tarcisioandrade/rich-domain/compare/v0.3.0...v1.2.2) (2025-11-30)


### Features

* filter component with criteria ([a6e5a66](https://github.com/tarcisioandrade/rich-domain/commit/a6e5a664e7b175f8156832b2d42821f73efec522))


### Bug Fixes

* incorrect verification in criteria operator validation ([8b4da16](https://github.com/tarcisioandrade/rich-domain/commit/8b4da16ded67a55afe64adbe60d52359cd168a17))


### Chores

* update dependencies and refactor mappers to use PrismaToPersistence ([5281716](https://github.com/tarcisioandrade/rich-domain/commit/52817161667ce473ffe2f7991d55c03190d097c0))


### Refactoring

* enhance criteria validation by adding field value sanitization ([9991a6b](https://github.com/tarcisioandrade/rich-domain/commit/9991a6b54dbfa8b5d2505ed17897b76f6b794a33))
* improve filter component logic and UI interactions for adding filters ([3dd8d9f](https://github.com/tarcisioandrade/rich-domain/commit/3dd8d9fb8934ca15357ad62485f74c541c01a680))
* migrate filter types to filter-utils for improved organization and clarity ([eeb2af4](https://github.com/tarcisioandrade/rich-domain/commit/eeb2af4f563ff7f8dc3eb1836b22392bc229f3af))
* update FilterDateValue component to handle string dates and improve date handling logic ([6cb0b42](https://github.com/tarcisioandrade/rich-domain/commit/6cb0b4245ce9394389ee208c16035bc49e4aa912))

### [1.2.1](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.0...v1.2.1) (2025-11-29)


### Features

* implement custom UUID generation in crypto module ([4fc732a](https://github.com/tarcisioandrade/rich-domain/commit/4fc732a00237a9d63e320555acf4a8a14c941f13))
* introduce TypedOrder and enhance Criteria to support nested object field paths ([9857624](https://github.com/tarcisioandrade/rich-domain/commit/9857624608eda1320ec813b165e9183f1e28a0d1))
* new history-tracker structure ([aaea6d4](https://github.com/tarcisioandrade/rich-domain/commit/aaea6d4c8aed575f50917cba41936d1b1560ed3d))
* update Id constructor to handle optional isNew parameter ([0aae58b](https://github.com/tarcisioandrade/rich-domain/commit/0aae58b02da69e0cb7421663335ac305ade5afa7))


### Bug Fixes

* aggregate-changes type inference ([aa62138](https://github.com/tarcisioandrade/rich-domain/commit/aa62138b31cdedb63c0e1be8a19271f4ada2e71c))
* history tracker not tracking when nested created ([2900e20](https://github.com/tarcisioandrade/rich-domain/commit/2900e20c18da7aa0ee960c9e5d0f5e2524e3d6f3))
* uow in persistence fastify example ([fcef611](https://github.com/tarcisioandrade/rich-domain/commit/fcef61103f160c0b1adbee9cbce821ce047189eb))


### Refactoring

* change prisma example to new architecture ([92dc179](https://github.com/tarcisioandrade/rich-domain/commit/92dc1798ee5a64439d6633ab5b0cc77b42265ed6))
* improve deepClone method for better object handling and error management ([52ae893](https://github.com/tarcisioandrade/rich-domain/commit/52ae8930d112ba018f7944f69837edea82d45309))
* prisma example unit of work with async local storage ([ca6fc16](https://github.com/tarcisioandrade/rich-domain/commit/ca6fc1663ca251dac020939080b126f3984b0eae))
* remove unnosed code from ancient architecture ([19a41b1](https://github.com/tarcisioandrade/rich-domain/commit/19a41b121b4adaaea5525da20b068f43cc674db8))
* update repository methods to use 'save' consistently across use cases ([aab323b](https://github.com/tarcisioandrade/rich-domain/commit/aab323be2fff86246dc0c1a14cb7ba56bf11efa7))
* update repository methods to use 'save' instead of 'create' and 'update' ([6766970](https://github.com/tarcisioandrade/rich-domain/commit/6766970019781215019b492963e020ef4babcd89))


### Tests

* add load test ([9bd07fb](https://github.com/tarcisioandrade/rich-domain/commit/9bd07fb019e2cc0eef3f0573af8f4dad1d8b385f))
* new history-tracker structure ([d31ad0b](https://github.com/tarcisioandrade/rich-domain/commit/d31ad0b109bfa5e5ff62743d70dd51bb64107f10))

## [1.2.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.1.0...v1.2.0) (2025-11-23)


### Features

* add getFilterByField and getSortByField methods to useCriteria hook ([8db041a](https://github.com/tarcisioandrade/rich-domain/commit/8db041a8fbe359ec6fe3ff70e22ac87a6c221686))
* add options parameter to addFilter method for enhanced filtering capabilities ([c43c164](https://github.com/tarcisioandrade/rich-domain/commit/c43c164f56831b9f0b06f2e5981ba3f540cf3378))
* add quantifier support to Criteria class for enhanced filtering options ([322adf3](https://github.com/tarcisioandrade/rich-domain/commit/322adf36dfedcdc21ae6fc85c3577e1fb2835019))
* criteria adapter implementation ([f387f0b](https://github.com/tarcisioandrade/rich-domain/commit/f387f0bcd601a69da74d5fff33b9d9872e049179))
* enhance criteria operators with new types and validation functions ([8d30c14](https://github.com/tarcisioandrade/rich-domain/commit/8d30c1448e3d25c790d667b43d17546a441e710d))


### Bug Fixes

* FieldPath infer type to array methods ([844a56e](https://github.com/tarcisioandrade/rich-domain/commit/844a56ef2cdc65fac0cb228c6936808a92ffa440))
* search filter not reset page ([c8c9d8b](https://github.com/tarcisioandrade/rich-domain/commit/c8c9d8b1fecc1ce8c568f43710c8748ad9ad1f1e))
* types in react-with-react-query ([6eeeb74](https://github.com/tarcisioandrade/rich-domain/commit/6eeeb74715bef50d3c5dec8dcc3e37484e0f511b))


### Chores

* add TypeScript check script and enhance ([9f6347c](https://github.com/tarcisioandrade/rich-domain/commit/9f6347c4707adebb9e03bcdc952791a9c3279038))
* enhance useCriteria hook and update TypeScript types for better type safety ([2bbc699](https://github.com/tarcisioandrade/rich-domain/commit/2bbc699aab415a52502ad50e7fbf67bcd52ae222))
* refactor frontend example to integrate useCriteria hook ([48dccc7](https://github.com/tarcisioandrade/rich-domain/commit/48dccc7df870024f280902c22c77dcf531702781))
* update ESLint configurations to include tsconfigRootDir ([b019884](https://github.com/tarcisioandrade/rich-domain/commit/b01988496b91c6c9d3e6d3d89597cf9f23e54729))
* update rich domain version in examples app ([4be8a1b](https://github.com/tarcisioandrade/rich-domain/commit/4be8a1bdd4473d8274c0ec8bec1d4ec1d70109ea))
* update target paths in registry.json and use-criteria.json for improved file structure ([d2f9348](https://github.com/tarcisioandrade/rich-domain/commit/d2f93486158e465d8878d92f1d80e259cc62f701))


### Refactoring

* criteria adapter in fastify-with-prisma example ([8adef1e](https://github.com/tarcisioandrade/rich-domain/commit/8adef1e0c62ab94bd3665f91ca6ea29d568ea24f))

## [1.1.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.0.0...v1.1.0) (2025-11-22)


### Features

* add examples in monorepo ([2cba30e](https://github.com/tarcisioandrade/rich-domain/commit/2cba30e318be2575b007c8b4f9a00e35561eec5e))
* add react-with-react-query example ([439589e](https://github.com/tarcisioandrade/rich-domain/commit/439589e1abbc47b1b03efab3b9dde53fe8d6253c))
* domain execeptions ([e206274](https://github.com/tarcisioandrade/rich-domain/commit/e206274d8a93c09cc91b2c0514be62cb986caaa3))
* implement useCriteria hook ([c00441a](https://github.com/tarcisioandrade/rich-domain/commit/c00441a105391fd06ef39b8c7e3aa0907c3ff508))


### Bug Fixes

* infinite loop when multiples order are add ([2c13dc4](https://github.com/tarcisioandrade/rich-domain/commit/2c13dc472d009bf328ad45222ea1c921f588ff9a))
* search not working in fromArray PaginatedResult method ([b79b2aa](https://github.com/tarcisioandrade/rich-domain/commit/b79b2aa2aa17e8b98bf2c2fcb4823452db99dcc1))


### Refactoring

* clean exports ([3f8e16a](https://github.com/tarcisioandrade/rich-domain/commit/3f8e16a2103514ef7a2a928dff20f674d1e39506))
* migrate eslint configuration to ES module syntax ([3ea4366](https://github.com/tarcisioandrade/rich-domain/commit/3ea43667b0857b7ae2afcbad858c16384035dc50))
* monorepo implementation ([e0b1e68](https://github.com/tarcisioandrade/rich-domain/commit/e0b1e683d5ee95b54b79510d43dd957af49c65e2))
* remove defaultValues from value objects ([0523479](https://github.com/tarcisioandrade/rich-domain/commit/0523479c6f272d7ea5d678638fa666e3fde71c7a))
* streamline domain event imports and consolidate IDomainEvent interface ([573c689](https://github.com/tarcisioandrade/rich-domain/commit/573c689a762baecd9fb8791e66300f663d7a58c1))


### Chores

* add postinstall script to generate Prisma client ([ffbe310](https://github.com/tarcisioandrade/rich-domain/commit/ffbe310db4ff9e6918d4e55096b8939c1f8f4543))
* enhance linting setup for react-rich-domain and update package.json ([ac2803b](https://github.com/tarcisioandrade/rich-domain/commit/ac2803bac0d907c0513d249fc5e14390418c7530))
* modify check script to target specific workspace ([d39d6d8](https://github.com/tarcisioandrade/rich-domain/commit/d39d6d8ef3a04d17207a3a0e795027040b3cf707))
* update clean script to remove node_modules in backend and rich-domain packages ([2a10cab](https://github.com/tarcisioandrade/rich-domain/commit/2a10cab193ba00e504a9a301cc00cda4b68b8573))
* update module entry points in package.json for react-rich-domain ([03be9ac](https://github.com/tarcisioandrade/rich-domain/commit/03be9aced05160c97eb74f771b770283c07e046b))
* update package configuration and add new dependencies ([4135393](https://github.com/tarcisioandrade/rich-domain/commit/4135393ae78b1b8e6b0c9306f0ac0872971ddb3f))
* update package.json scripts to target specific workspace ([8f46868](https://github.com/tarcisioandrade/rich-domain/commit/8f468688017f49cae58dff5d1a9818fe64b38017))
* update package.json with homepage and repository detail ([bfb387c](https://github.com/tarcisioandrade/rich-domain/commit/bfb387cb2076989a808f25be09337a24ed3a8ff6))
* update test script to target specific workspace ([6783208](https://github.com/tarcisioandrade/rich-domain/commit/678320803828a43ef588c366e59bf62c2851c126))
