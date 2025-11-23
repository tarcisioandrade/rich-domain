# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

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
