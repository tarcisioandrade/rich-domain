# Changelog

## 1.9.0

### Minor Changes

- 0805f49: Rename `lockMutationsWhenInvalid` to `persistInvalidMutations` (inverted semantics: `true` = dirty / form mode, default).

  When `throwOnError` is `false` and `persistInvalidMutations` is `true` (default), failed schema or `rules` updates keep mutated values and `validationErrors` reflects the full current props (schema + rules). Set `persistInvalidMutations: false` to freeze the entity while invalid and revert failed updates.

## 1.8.10

### Patch Changes

- Add `addValidationIssue` for accumulating validation errors in `rules` when `throwOnError` is false
- Change `getFormattedErrors()` to return `Array<{ path: string; message: string }>` for UI/API usage
- Add `persistInvalidMutations` validation config option (default: true when collecting errors)
- Refresh `_validationError` on failed updates when `throwOnError` is false
- Fix `deleteProperty` on change proxy rejecting validation without throwing `TypeError`
- Add Changesets release workflow at monorepo root

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [1.8.9](https://github.com/tarcisioandrade/rich-domain/compare/v1.8.8...v1.8.9) (2026-05-25)

### Features

- add getValueAtPath and setValueAtPath utility functions for dynamic property access ([2678a41](https://github.com/tarcisioandrade/rich-domain/commit/2678a41badc9c07f54d571ae119ef4fec7763f15))

### Bug Fixes

- incorrect tracker when deleting entity ([b4fe4f4](https://github.com/tarcisioandrade/rich-domain/commit/b4fe4f429d173af31ea16d84642148ce71b44334))

### Chores

- update @woltz/rich-domain to version 1.8.8 across all package.json files ([be163d2](https://github.com/tarcisioandrade/rich-domain/commit/be163d244bad054dbdf5e890fbfd634bd7a14819))

### [1.8.8](https://github.com/tarcisioandrade/rich-domain/compare/v1.8.7...v1.8.8) (2026-04-12)

### Features

- add drizzle skills ([d1ca1b5](https://github.com/tarcisioandrade/rich-domain/commit/d1ca1b5ce9ba6ffb72b31274d6e0761bc8b406eb))
- enhance fastify-with-typeorm example with new environment variable support ([424e222](https://github.com/tarcisioandrade/rich-domain/commit/424e222b3f888889e29c400cfc990477f40b23d1))
- new templates in cli init command ([ad957d8](https://github.com/tarcisioandrade/rich-domain/commit/ad957d8f86128670b85283eadfe00567ab93c71a))

### Documentation

- change for api reference on documentations ([5af34ac](https://github.com/tarcisioandrade/rich-domain/commit/5af34ac963ef9cfa8e75838eaad9c0efae9a824b))
- update cli docs ([852bc25](https://github.com/tarcisioandrade/rich-domain/commit/852bc25008b4a46f1a067fb9f63fddc27e45798c))
- update documentation to include q-drizzle quickstart page ([05ce408](https://github.com/tarcisioandrade/rich-domain/commit/05ce408173b471c4fb5eaf0e83a1beb602f3966c))
- update drizzle documentation to new generic types ([f213331](https://github.com/tarcisioandrade/rich-domain/commit/f2133312a7c0e3d8d146ed3e1e822bf468d2c79d))

### Refactoring

- change-for-api-to-of ([cfbbb46](https://github.com/tarcisioandrade/rich-domain/commit/cfbbb4679aaf8e161e4e08147ddc7ba7d00f89fa))
- enhance Drizzle repository and persistence mappers with generic database type support ([3aa091a](https://github.com/tarcisioandrade/rich-domain/commit/3aa091a01999b0785b523f83c94840cb3fda00b9))
- enhance fastify-with-prisma example with improved error handling ([2642fda](https://github.com/tarcisioandrade/rich-domain/commit/2642fda47b57e724b3a623513f32555da1880d02))
- remove some incosistencies in drizzle example ([7845667](https://github.com/tarcisioandrade/rich-domain/commit/784566719e0fde97085a7096f4576df1d151ecd7))
- update persistence mappers and repositories to utilize generic database type ([2ba910f](https://github.com/tarcisioandrade/rich-domain/commit/2ba910fccb148dbd60f9dd683f79065cae9b215a))

### [1.8.7](https://github.com/tarcisioandrade/rich-domain/compare/v1.8.6...v1.8.7) (2026-04-04)

### Features

- add @woltz/rich-domain-drizzle adapter with documentation and version update ([3bf2ef5](https://github.com/tarcisioandrade/rich-domain/commit/3bf2ef5216e4f73722a9a9aa2b84aa09cb7caaf8))
- add @woltz/rich-domain-drizzle workspace to build script ([fabf999](https://github.com/tarcisioandrade/rich-domain/commit/fabf999cac54cd7e9a05ec665e96f7a3999896a4))
- add fastify-with-drizzle example ([a8d0f12](https://github.com/tarcisioandrade/rich-domain/commit/a8d0f122230b49bc0fcc0d3ee48ab779341584fc))
- add MissingJunctionConfigError and enforce junction configuration in DrizzleBatchExecutor ([467d8cb](https://github.com/tarcisioandrade/rich-domain/commit/467d8cb893e1c676cc0fc63644d1aba5f9f89615))
- drizzle adapter implementation v1 ([e1d81a9](https://github.com/tarcisioandrade/rich-domain/commit/e1d81a94f74e28413ee10231a546fef0998e834b))
- improve configuration ([40f076f](https://github.com/tarcisioandrade/rich-domain/commit/40f076ffccefe4c8d61987493871a4aae72a0434))

### Bug Fixes

- implement WeakMap for domain event management in BaseAggregate ([11566ab](https://github.com/tarcisioandrade/rich-domain/commit/11566ab71c578c5ed7edca6345914eb42faee8e8))
- splice catching error in validator ([852ed5b](https://github.com/tarcisioandrade/rich-domain/commit/852ed5bba69d1a2c5b5fbeb4ad70e3a6f4aafd24))

### Refactoring

- change private mapper to protected in DrizzleRepository for improved accessibility ([8ecf5ca](https://github.com/tarcisioandrade/rich-domain/commit/8ecf5caf6565d68910f8fce76fca02427d5a0599))
- enhance pagination handling in Criteria class ([865dcd3](https://github.com/tarcisioandrade/rich-domain/commit/865dcd3fe0dc7cf3f17065ee68dcb6e18f5303f5))

### Documentation

- drizzle adapter documentation ([a3ce54f](https://github.com/tarcisioandrade/rich-domain/commit/a3ce54fde5986a91e348c8a00dd5983fed0897ab))

### Chores

- add lint script to fastify-with-drizzle example ([05aacf5](https://github.com/tarcisioandrade/rich-domain/commit/05aacf5e6316ed86833b82f1dc2ce6e4e35cce9e))
- update @woltz/rich-domain and related packages to version 1.8.6 and 0.7.7 ([65a90c2](https://github.com/tarcisioandrade/rich-domain/commit/65a90c24b5abbe5e1626197546a9212e6a8f1d45))

### [1.8.6](https://github.com/tarcisioandrade/rich-domain/compare/v0.1.5...v1.8.6) (2026-03-26)

### Features

- add relation name handling in schema-registry ([b631bd3](https://github.com/tarcisioandrade/rich-domain/commit/b631bd3320058fa8f9694577613a68900cde223b))

### Bug Fixes

- inconsistent relation name database ([774a891](https://github.com/tarcisioandrade/rich-domain/commit/774a891dff3ed43e193798d93ec8b4926b226320))
- resolve potential errors causes ([6555de2](https://github.com/tarcisioandrade/rich-domain/commit/6555de2c2eed737c5ec05619393812090c6d9d8c))

### Chores

- **release:** update package versions for rich-domain packages ([44f891f](https://github.com/tarcisioandrade/rich-domain/commit/44f891ff02d8844e65703090e9bbfcf974f94971))
- **release:** update packages dependencies versions ([f5b79ee](https://github.com/tarcisioandrade/rich-domain/commit/f5b79ee4bce533ca0f97d515054c1d4a438b9bc3))

### Documentation

- enhance Prisma integration documentation with relation name examples ([d80c796](https://github.com/tarcisioandrade/rich-domain/commit/d80c796755378922f8604d019efe91ab681533c9))
- fix contents wrong ([0fa8291](https://github.com/tarcisioandrade/rich-domain/commit/0fa82911a09b3a22894e10bc7fc8c442368ca45b))

### [1.8.5](https://github.com/tarcisioandrade/rich-domain/compare/v1.0.2...v1.8.5) (2026-03-21)

### Features

- add ApplicationError class for general application errors ([4272287](https://github.com/tarcisioandrade/rich-domain/commit/4272287a7e4084999ad28e7be410d8d444284dc0))
- add mock data service and configuration for development environment ([1ed0a2c](https://github.com/tarcisioandrade/rich-domain/commit/1ed0a2c57e7c273d45f105bfe351e1f9bc5a1d93))
- add new error classes for better error handling including ([3b12120](https://github.com/tarcisioandrade/rich-domain/commit/3b121200a040da6d21cb1f44afdf1c4e7508f5f2))
- add overColumnId to track hovered column during drag in Kanban component ([354d4fa](https://github.com/tarcisioandrade/rich-domain/commit/354d4fa225f0ab5b692887d35ce14c545febfa15))

### Bug Fixes

- enhance betweenTuple function to support parsing array-like strings ([5715a4c](https://github.com/tarcisioandrade/rich-domain/commit/5715a4c685e096ffa557bde64bebc3b3170d184f))
- incorrect criteria query value ([7dba841](https://github.com/tarcisioandrade/rich-domain/commit/7dba8411b45519509d6595f3da2be42f8465a4ca))
- lint ([24c7daf](https://github.com/tarcisioandrade/rich-domain/commit/24c7daf69ebab533d5da5663112214ef23c41478))

### Documentation

- add live demo to components documentation ([1fa16b6](https://github.com/tarcisioandrade/rich-domain/commit/1fa16b6e6f1540dd99f6c50eeaa2acada914b8da))
- change prisma adapter docs to new batch executor params order ([5ac9f7c](https://github.com/tarcisioandrade/rich-domain/commit/5ac9f7c574d252f882d75f970ea14f5dd39670ba))
- update navbar label from "Get Started" to "Github" in docs.json ([3a1ed9f](https://github.com/tarcisioandrade/rich-domain/commit/3a1ed9f6272de8925bcd0818630385a35e38867d))

### Tests

- enhance deep tracking tests by adding a new case for detecting changes ([5b23479](https://github.com/tarcisioandrade/rich-domain/commit/5b23479ae6d46936158944ee9e88eb60e72c47c9))

### Refactoring

- abstract many properties into unique criteria prop ([9d400c0](https://github.com/tarcisioandrade/rich-domain/commit/9d400c0128a6d076bd0e6c84bae5675214c33694))
- enhance ChangeTracker to handle circular references and improve object comparison logic ([19c6e70](https://github.com/tarcisioandrade/rich-domain/commit/19c6e7053655d40de4a1f40abfd107fee9a69134))
- enhance data table criteria component with loading states and error handling ([b600bf4](https://github.com/tarcisioandrade/rich-domain/commit/b600bf456ef6b250a91815fe84fd9fe29463797b))
- improve Criteria class to use QueryParamsObject and streamline query handling ([a790fd1](https://github.com/tarcisioandrade/rich-domain/commit/a790fd184942cb8607938845b94088132bcf4ebd))
- remove unused parameters from onUpdate methods in persistence mappers ([219e743](https://github.com/tarcisioandrade/rich-domain/commit/219e743b67c0e1d8394a7655d9f46b5ffb6e972f))
- simplify orderBy type definition and enhance enum transformation in zod criteria builder ([0528dbd](https://github.com/tarcisioandrade/rich-domain/commit/0528dbd90f0001aea9250db8439c05f6928e8ce5))
- streamline localStorage operations in persistence utility functions ([c40e22a](https://github.com/tarcisioandrade/rich-domain/commit/c40e22a5343b3c6bc1f4d3120f8ed485ec3946dc))
- update entity validation and hooks in domain models for consistency ([8abf41d](https://github.com/tarcisioandrade/rich-domain/commit/8abf41df86a4e1610aa65dd3ae3348480bc4d637))
- update onUpdate method signature and improve PrismaRepository ([f280d5e](https://github.com/tarcisioandrade/rich-domain/commit/f280d5e543e4f3d0879d69cf3981a77007ce42dd))
- update pagination handling in criteriaToQueryParams and clean up imports in base-entity ([3378092](https://github.com/tarcisioandrade/rich-domain/commit/33780920b52c4accb25f9d64bf76720d0ba01891))
- use criteria registry rebuild ([c659eca](https://github.com/tarcisioandrade/rich-domain/commit/c659eca194c3ed520610cf15299fc3337d80825d))

### Chores

- add 'lint' to commitlint configuration ([40f37ab](https://github.com/tarcisioandrade/rich-domain/commit/40f37ab267aa727fc29ef1f42cab770f652c8c00))
- update dependencies and improve CI workflow ([e217d90](https://github.com/tarcisioandrade/rich-domain/commit/e217d90cd64a6ba2065e050e746e896c597d6130))
- update package dependencies and improve TypeScript build commands ([74c23b0](https://github.com/tarcisioandrade/rich-domain/commit/74c23b03d9de1b89a5e378e16a6607ced303085c))
- update pre-commit script ([3c3fbf5](https://github.com/tarcisioandrade/rich-domain/commit/3c3fbf5ca5408451c243fc4313fa58c383bdf89f))

### [1.8.4](https://github.com/tarcisioandrade/rich-domain/compare/v1.8.3...v1.8.4) (2026-01-25)

### Features

- add "Archived" and "Cancelled" statuses to task management ([cff53e4](https://github.com/tarcisioandrade/rich-domain/commit/cff53e4a6f84f24e9aefc9d2fde1e82230781b06))
- add Filter and Sorting components with usage examples and documentation ([e9dc323](https://github.com/tarcisioandrade/rich-domain/commit/e9dc323eae25de5db559d354e6f3ddb64e35501c))
- add isCollection field to QueryFilter and update filtering logic for collections ([bb9e819](https://github.com/tarcisioandrade/rich-domain/commit/bb9e81955941c33b57cd7cb228559288827573c3))
- add optional render function for empty column state in Kanban components ([35c4b61](https://github.com/tarcisioandrade/rich-domain/commit/35c4b61d2f8d694fad3ddb3a140f7c5bee588f29))
- add preview script to package.json and enhance Kanban ([ef26dff](https://github.com/tarcisioandrade/rich-domain/commit/ef26dffe857b6d7b9cb67b17f6078e36e4d76846))
- add react-intersection-observer dependency and custom scrollbar styles for Kanban board ([136297d](https://github.com/tarcisioandrade/rich-domain/commit/136297dd4eb50bede609a892b689050e3ba55f7c))
- add skills ([5415a4b](https://github.com/tarcisioandrade/rich-domain/commit/5415a4b5097a9316bc7499dc77f08a5919b3dd30))
- add task model to use in kanban component example ([8a3c4c1](https://github.com/tarcisioandrade/rich-domain/commit/8a3c4c103511d9ef0fb043d1bd3acfbdb2b51222))
- enhance Kanban card interactivity with clickable option and custom drag behavior ([e6a0bee](https://github.com/tarcisioandrade/rich-domain/commit/e6a0bee249b9a6e838d5929ae677a7f8cd557a2d))
- enhance Kanban functionality with new "Archived" and "Cancelled" statuses ([950e40e](https://github.com/tarcisioandrade/rich-domain/commit/950e40e92d36b248f8a797fb8f7e6d555ecd0f53))

### Bug Fixes

- enable incremental builds in TypeScript config and improve error handling ([47d7972](https://github.com/tarcisioandrade/rich-domain/commit/47d797242840efa38f8c66d73cf7c9c4adfd6896))

### Chores

- **release:** 0.7.4 ([0613084](https://github.com/tarcisioandrade/rich-domain/commit/06130848e0148c55ebc2ba23f3d5d48057c6a2de))
- update @woltz/rich-domain and related packages to version 1.8.3 and 0.1.3 ([fd2254b](https://github.com/tarcisioandrade/rich-domain/commit/fd2254b80bd6a11ee244c2d64b9a27f64f64eba8))
- update Node.js engine requirements to >=22.12.0 and remove package-lock.json ([a7e2a63](https://github.com/tarcisioandrade/rich-domain/commit/a7e2a6395c260d606151caae4a731400871d7616))

### Documentation

- add custom empty state rendering option to DataKanbanCriteria ([f45ec23](https://github.com/tarcisioandrade/rich-domain/commit/f45ec23cf3853b43c641260f52a3ac7c1a05ef32))
- add data-kanban-criteria integration to React documentation ([8c0db02](https://github.com/tarcisioandrade/rich-domain/commit/8c0db02e7f11730746946512c453beff5bb76b8b))
- add DataKanbanCriteria documentation ([11b0602](https://github.com/tarcisioandrade/rich-domain/commit/11b060289b2184f767083296deb0eee9582df542))
- add keywords to React integration documentation for improved searchability ([83cbfe6](https://github.com/tarcisioandrade/rich-domain/commit/83cbfe6ff0e8d1146ccece57cdedb74ccb555ea7))
- enhance documentation on Registry Fields and DataMappers with usage examples ([b49ef7a](https://github.com/tarcisioandrade/rich-domain/commit/b49ef7ac632fb411f50aeb91d85108e6edffc8c3))
- update data-kanban-criteria documentation to replace <Info> with <Note> for clarity ([0d16a69](https://github.com/tarcisioandrade/rich-domain/commit/0d16a6922062a2d87640327151d322408d1638e2))
- update DataKanbanCriteria documentation with new features ([8e26397](https://github.com/tarcisioandrade/rich-domain/commit/8e26397f55f2f66014ec8002751b7b6fa897afce))
- update Node.js and TypeScript version requirements in docs ([f8c07d3](https://github.com/tarcisioandrade/rich-domain/commit/f8c07d38f198f91cb823c721f342f13e47b8371c))

### Refactoring

- add buildMany method to Mapper and update TypeORMRepository to utilize it ([bb68dfb](https://github.com/tarcisioandrade/rich-domain/commit/bb68dfb230055dfe9798d9449a4aaaa46e8590c2))
- enhance Mapper class with buildMany method and update documentation ([0f004d9](https://github.com/tarcisioandrade/rich-domain/commit/0f004d9a7d440478e5d4f70ad10b2710d507ad38))
- improve Kanban card styling and enhance item ([fe2b851](https://github.com/tarcisioandrade/rich-domain/commit/fe2b85109ed07fa408454d0337ff48fbd6e8bbfe))
- remove all prisma dataMappers and rootId references ([876c545](https://github.com/tarcisioandrade/rich-domain/commit/876c545c82378750d431d3029ab2f800e8811a38))
- remove dataMappers ([e7d8d3c](https://github.com/tarcisioandrade/rich-domain/commit/e7d8d3c2cb29aabc143f52bacab2a61872ca21e3))
- remove unused generateFractionalIndex import from use-criteria-kanban hook ([81b3a1d](https://github.com/tarcisioandrade/rich-domain/commit/81b3a1d34175e1ed41dcb7878efdafcd8caa02c0))
- simplify task movement logic by implementing "Insert Reference" pattern ([baecd4b](https://github.com/tarcisioandrade/rich-domain/commit/baecd4b158dc2f22b3ca91466277178506401d9d))
- update task model and database schema, removing deprecated migrations ([d89eca1](https://github.com/tarcisioandrade/rich-domain/commit/d89eca135d886945825b0bee23fcdc327e42ac9d))

### [1.8.3](https://github.com/tarcisioandrade/rich-domain/compare/v1.8.2...v1.8.3) (2026-01-18)

### Features

- add dynamic measurement for variable card heights in KanbanColumnContent ([265aab3](https://github.com/tarcisioandrade/rich-domain/commit/265aab3d3d2a6e4443d6089511b0b7cb6217f7d0))
- add findManyByIds method to ReadRepository and WriteAndRead for batch retrieval of aggregates ([15a84a0](https://github.com/tarcisioandrade/rich-domain/commit/15a84a0203561366619f1114219c65a1f7ec78e7))
- data kanban criteria ([4454433](https://github.com/tarcisioandrade/rich-domain/commit/4454433ab937a11d2c454ad00f6854c99adfa2ee))

### Bug Fixes

- incorrect tracking in array de primitives values ([6e86c20](https://github.com/tarcisioandrade/rich-domain/commit/6e86c20fedbd57c0a394e6f5e16c3014dfc06fc3))
- kanban scroll infinite and somes ui bugs ([89de6ad](https://github.com/tarcisioandrade/rich-domain/commit/89de6ad20c831f3e67603a0b03ef48c5196f9534))

### Refactoring

- enhance response structure with hasNext and hasPrevious flags ([bdb82a0](https://github.com/tarcisioandrade/rich-domain/commit/bdb82a02d656fe6202064fb1e4756feceacf76d5))
- App component for improved tab navigation ([68241e3](https://github.com/tarcisioandrade/rich-domain/commit/68241e372eb7d88aa3c14c432b4a31642fa8dfdd))
- improve errors messages and cleanup aggregates ([0509162](https://github.com/tarcisioandrade/rich-domain/commit/0509162ededa582bf5547ab93b5dea9e33690307))
- remove findOne method and add findManyByIds for batch entity retrieval ([494c14e](https://github.com/tarcisioandrade/rich-domain/commit/494c14e76771beac8836330f2528009a9ff62200))
- remove unused findOne method from PrismaRepository to streamline code ([498d470](https://github.com/tarcisioandrade/rich-domain/commit/498d4702371414ec820bae8c18df5747d1017a3c))
- simplify rendering logic in DataKanbanCriteria component ([54c51ab](https://github.com/tarcisioandrade/rich-domain/commit/54c51aba9f3bb26c8a9b46c1868fe057d70c20af))
- streamline Kanban component structure and enhance scroll behavior ([91427d2](https://github.com/tarcisioandrade/rich-domain/commit/91427d23a941a937828f36fe899d66d42ba6fdc0))

### [1.8.2](https://github.com/tarcisioandrade/rich-domain/compare/v1.0.1...v1.8.2) (2026-01-13)

### Features

- add apps workspace and update web app configuration ([c6b5f49](https://github.com/tarcisioandrade/rich-domain/commit/c6b5f49d8f39b7ebf52b9e105e72af46e7a89e6a))
- enhance entity and aggregate classes to support optional input properties ([799303c](https://github.com/tarcisioandrade/rich-domain/commit/799303cd7be56abc14363b4cbcdb6970694d7120))
- implement cycle detection in dependency graph analysis ([a3a9a14](https://github.com/tarcisioandrade/rich-domain/commit/a3a9a14d432988dc175f07c3faebf135c1504cc5))
- integrate framer-motion and motion libraries ([b56d879](https://github.com/tarcisioandrade/rich-domain/commit/b56d879dc831ca7a837fe90775cb4d652398a19b))
- landing-page-init ([a34ce75](https://github.com/tarcisioandrade/rich-domain/commit/a34ce75cf74b6ac2f41590784c923a197fd69bda))

### Chores

- update .gitignore to exclude TypeScript build info and temporary files ([594aa1e](https://github.com/tarcisioandrade/rich-domain/commit/594aa1efc558405c28e679d3d6915b8cc6872428))
- update build and test scripts in package.json and eslint configuration ([b936942](https://github.com/tarcisioandrade/rich-domain/commit/b936942127ff8c84ee0780d89af0be43fdf18cdc))
- update build and test scripts in package.json and eslint configuration ([e91f19a](https://github.com/tarcisioandrade/rich-domain/commit/e91f19a1b5e9b1da4adca890a1f71a8fbd070dda))
- update test scripts in package.json to use 'vitest run' ([861917d](https://github.com/tarcisioandrade/rich-domain/commit/861917dc39d42f40a95ab1c6c1402a96fe2c1574))

### Documentation

- expand lifecycle hooks documentation with examples for generating required values ([b8e6f2a](https://github.com/tarcisioandrade/rich-domain/commit/b8e6f2ab3c256bc2922a0ef2dfd05a3e47800ffc))
- remove banner content from docs.json ([f7bb5a6](https://github.com/tarcisioandrade/rich-domain/commit/f7bb5a677798205b1e58410642465de4ccc54040))
- remove React integration documentation ([afb618a](https://github.com/tarcisioandrade/rich-domain/commit/afb618a089824c7fb3bbce843d92a948d9663d5b))

### [1.8.1](https://github.com/tarcisioandrade/rich-domain/compare/v0.7.2...v1.8.1) (2026-01-09)

### Features

- add markAsPersisted method to BaseEntity and update Id management in repository ([3823b90](https://github.com/tarcisioandrade/rich-domain/commit/3823b9059404854c0c3923fa0e987cbcfbb1f1a0))
- add methods to retrieve and check domain events in BaseEntity ([cb3d003](https://github.com/tarcisioandrade/rich-domain/commit/cb3d003bda9c201cafdd83a01fedc6a88fbba84b))
- add pivo table beetwen post and tag ([582dfd2](https://github.com/tarcisioandrade/rich-domain/commit/582dfd287cdeb046dfc7a785a0f0fce212466750))
- implement junction table handling in PrismaBatchExecutor for N:N relationships ([7dc709c](https://github.com/tarcisioandrade/rich-domain/commit/7dc709c4834ec328180120dd9b88f7cfc189cbb6))

### Bug Fixes

- CollectionConfig type in index file ([1833bcc](https://github.com/tarcisioandrade/rich-domain/commit/1833bcc637c077ea686e4432342d960c72a3ce8f))
- correct string splitting and ensure aggregate is marked as persisted after saving ([4b69db6](https://github.com/tarcisioandrade/rich-domain/commit/4b69db6e74a2db5a34a0d62633fd273e5c6aacef))
- update entity state to mark as persisted after saving in PrismaRepository ([c707cd1](https://github.com/tarcisioandrade/rich-domain/commit/c707cd1a211f8fa708eb6c00c6030df687d3e976))

### Chores

- remove postinstall script from package.json ([5931d9a](https://github.com/tarcisioandrade/rich-domain/commit/5931d9ab4897047f41c4b454292a93c547483292))
- update @woltz/rich-domain and related packages to version 1.8.0 ([5425f61](https://github.com/tarcisioandrade/rich-domain/commit/5425f61cdfb9353e49e96c1447fee8afc53f6440))
- update CI workflow for consistency and clarity in job steps ([c8d9965](https://github.com/tarcisioandrade/rich-domain/commit/c8d9965eed1b44e2918f996d3f1851432ed23299))

## [1.8.0](https://github.com/tarcisioandrade/rich-domain/compare/v0.4.1...v1.8.0) (2026-01-08)

### Features

- add DataTimelineCriteria component and related hooks for timeline view ([ee2c261](https://github.com/tarcisioandrade/rich-domain/commit/ee2c261ccc8d1f4c22c20c3ff3d0d1dc2c320630))
- add DataViewEmpty, DataViewSkeleton, and DataViewToolbar components ([396477d](https://github.com/tarcisioandrade/rich-domain/commit/396477d03aa69340c9ae84d79b06a3bcdd115e6e))
- add react-intersection-observer dependency and adjust badge positioning ([718deb6](https://github.com/tarcisioandrade/rich-domain/commit/718deb6bd0ab6163692ea06fead5a2e3cd7c990a))
- criteria sorting component ([f247aac](https://github.com/tarcisioandrade/rich-domain/commit/f247aac5e95d6c183226cf2fc7213497c4148618))
- data-timeline component ([40be3b5](https://github.com/tarcisioandrade/rich-domain/commit/40be3b5afbf969dddf9d4e52e755092676ea1b72))
- enhance App component with tabbed interface for UserListCriteria and UserTimeline ([2337d6a](https://github.com/tarcisioandrade/rich-domain/commit/2337d6a0a8c962d222c3018693eec650e6d51ae8))
- enhance DataTableCriteria and DataTableFilter with new icons and filter count badge ([642f6c4](https://github.com/tarcisioandrade/rich-domain/commit/642f6c45c6b6d293b23451224f96fc51d5189759))
- implement useCriteriaInfiniteQuery hook for paginated data fetching ([120378c](https://github.com/tarcisioandrade/rich-domain/commit/120378ceee4b1c5fffd5bb4053a350591d5255c6))
- rename UserList to UserListCriteria and add CSV export functionality ([302c34f](https://github.com/tarcisioandrade/rich-domain/commit/302c34fd8e340f8fac1f974cfd3b08d7fd3bd520))

### Bug Fixes

- add PaginatedJsonResult type export and clean up index file ([babbf38](https://github.com/tarcisioandrade/rich-domain/commit/babbf3889b87733da2a2f8eb08097a000625e56f))
- refactor filter operator selection logic ([b0d63cd](https://github.com/tarcisioandrade/rich-domain/commit/b0d63cdabc2802b825e8c898a1ea1e5fa7f43ddc))

### Chores

- update @woltz/rich-domain to version 1.7.1 ([2532c16](https://github.com/tarcisioandrade/rich-domain/commit/2532c162eecf4413678a63869c318f07e4e8ce63))

### Refactoring

- re-build registry components ([ed38f9d](https://github.com/tarcisioandrade/rich-domain/commit/ed38f9d4ebf778efabc198cc8025997874a0fce6))
- rename DataTableFilter to DataViewFilter ([aebcf2e](https://github.com/tarcisioandrade/rich-domain/commit/aebcf2eac5436a91447e8d00fc7ab82b9bfdc760))
- update filter and timeline components for improved UI and functionality ([170432c](https://github.com/tarcisioandrade/rich-domain/commit/170432ce9ab1464df80887a38f439b78ebfc6a8a))
- update getUsers function to return PaginatedJsonResult ([dbacaea](https://github.com/tarcisioandrade/rich-domain/commit/dbacaea8afc13471d0f00716f8f1b733d655bd5f))
- update use-criteria-query and related hooks to utilize PaginatedJsonResult ([7a72160](https://github.com/tarcisioandrade/rich-domain/commit/7a72160d6f40398f7bd4c20d92c623814eea5292))

### Documentation

- add sorting component with drag-and-drop support and update documentation ([0b02a72](https://github.com/tarcisioandrade/rich-domain/commit/0b02a7219dea40d9425637e3ee15427ab27b5bd9))
- update react implementation docs ([5c9b7d0](https://github.com/tarcisioandrade/rich-domain/commit/5c9b7d09a57e571a158f94c626db26a85b5cb29a))

### [1.7.1](https://github.com/tarcisioandrade/rich-domain/compare/v1.7.0...v1.7.1) (2026-01-02)

### Features

- add CSV export documentation and integration to the docs ([a1883b8](https://github.com/tarcisioandrade/rich-domain/commit/a1883b86272f53b9777b4a789d747866c96a99c5))
- rich-domain-csv package implementation ([c22c9e9](https://github.com/tarcisioandrade/rich-domain/commit/c22c9e97aed4843195039a9ad473b2e559b09525))

### Chores

- update @woltz/rich-domain to version 1.7.0 across all package.json files ([d95403e](https://github.com/tarcisioandrade/rich-domain/commit/d95403e7f045a184e2741828074c3db3aef60d12))
- update build and test scripts to include rich-domain-csv ([d580ab0](https://github.com/tarcisioandrade/rich-domain/commit/d580ab051f338e35cc245b21701b27db6a9bfdfa))
- update package-lock.json and add documentation for rich-domain-csv ([5333864](https://github.com/tarcisioandrade/rich-domain/commit/5333864e6bbe565ce344bce217468ab5e09b19af))

### Refactoring

- clean up comments and improve code readability in CSV utility functions ([1a1c5b0](https://github.com/tarcisioandrade/rich-domain/commit/1a1c5b08f8b341fde0bd6725d347e84844934fd8))
- enhance type extraction in criteria.ts for improved type safety ([955da6a](https://github.com/tarcisioandrade/rich-domain/commit/955da6a6ccce4b0f49c381ad569cdabe9baf85b4))
- remove Vitest and related test scripts from FullstackTemplate ([837dc45](https://github.com/tarcisioandrade/rich-domain/commit/837dc457a7ed5046367f83a32022ee8003369791))

### Documentation

- add keywords in pages to SEO ([ac0135e](https://github.com/tarcisioandrade/rich-domain/commit/ac0135e30c39e086d4caa5ad52f375a3c572bdeb))
- add rich-domain-csv package to README with npm badge ([4b5e17d](https://github.com/tarcisioandrade/rich-domain/commit/4b5e17dd109082118818ff37c36dfbb119d92e87))

## [1.7.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.6.0...v1.7.0) (2026-01-01)

### Bug Fixes

- convert PORT and REDIS_PORT environment variables to numbers for consistency ([fd868cf](https://github.com/tarcisioandrade/rich-domain/commit/fd868cfb3793082e0294197bfe457ae8090e7a5e))

### Chores

- update @woltz/rich-domain to version 1.6.0 and add fastify-plugin dependency ([9f7b48d](https://github.com/tarcisioandrade/rich-domain/commit/9f7b48d94fa7fff8be28a6af9eb58363b7dd80dc))

### Refactoring

- add validation for ValueObjects to enforce structure and primitive types ([456e674](https://github.com/tarcisioandrade/rich-domain/commit/456e6740f8e73def960074513af235b92adff07f))
- enhance JSON serialization in PaginatedResult to support deep serialization ([c91abcb](https://github.com/tarcisioandrade/rich-domain/commit/c91abcb63da8594d608acb287d7184ca2371d62a))
- move Tag value object to its own module and update imports ([0232b2c](https://github.com/tarcisioandrade/rich-domain/commit/0232b2ce2aa897d937fc384d3d9f3b8fe537423f))
- simplify value object to receive only primitives value ([e574aba](https://github.com/tarcisioandrade/rich-domain/commit/e574aba8c9d2d5662431c1af9ff6f4fdba5f992b))
- update Value Object docs ([27b911a](https://github.com/tarcisioandrade/rich-domain/commit/27b911a9eb5c388b37fecabd05de3ca7aeb740b2))

## [1.6.0](https://github.com/tarcisioandrade/rich-domain/compare/v0.1.2...v1.6.0) (2025-12-27)

### Features

- add 'add' command to CLI for generating entities, repositories, and mappers ([0bbf235](https://github.com/tarcisioandrade/rich-domain/commit/0bbf235bb542faccfccf2cf9c39f8d781a2a3bce))
- add useCriteriaQuery hook for paginated data fetching with criteria management ([1643b0c](https://github.com/tarcisioandrade/rich-domain/commit/1643b0c95c0a953f2f3594d4220170ca66075c05))
- fastify with typeorm example ([92ad1ee](https://github.com/tarcisioandrade/rich-domain/commit/92ad1eeb1c69debd805cb9d8501025fad4bfe4d1))
- implement dependency injection and event handling with BullMQ integration ([cb676c5](https://github.com/tarcisioandrade/rich-domain/commit/cb676c5219c425951ddde332df6ea4a71e4c19b3))
- implement dependency injection and event handling with BullMQ integration ([1fc9096](https://github.com/tarcisioandrade/rich-domain/commit/1fc90968b185f3c6f28addb39c73b045cb32ad78))
- rich-domain-typeorm-adapter ([0ab89f1](https://github.com/tarcisioandrade/rich-domain/commit/0ab89f1c52a96737d40fd8893f7fff4d3ece3c45))
- update dependencies and enhance event handling with BullMQ integration ([dd97cfa](https://github.com/tarcisioandrade/rich-domain/commit/dd97cfafd072622208e907978795adc2f300f4cb))

### Bug Fixes

- query builder incorrect filters ([b05cb79](https://github.com/tarcisioandrade/rich-domain/commit/b05cb79d2bb338e02e0ad2023e9e3fb268e2df71))
- search query with insensitive case and error in disconect N:N relations ([eca2206](https://github.com/tarcisioandrade/rich-domain/commit/eca2206c10e5f7d0fa173abdb810dfb8a264979d))

### Chores

- **release:** 0.1.1 ([7e3bb71](https://github.com/tarcisioandrade/rich-domain/commit/7e3bb717bacd8c1e21d1e79471e2e0f54518deac))
- **release:** 0.3.0 ([ae937ae](https://github.com/tarcisioandrade/rich-domain/commit/ae937aecc8cbe2f078f3df2213089a84932399fd))
- rename project to 'fastify-with-prisma' in package.json ([437495e](https://github.com/tarcisioandrade/rich-domain/commit/437495ecab1b4024895afa9bea957aac553b0498))
- update dependencies and enhance user service with event dispatching ([33352f0](https://github.com/tarcisioandrade/rich-domain/commit/33352f0468fec75f827d45395e82a7dca068bbe9))
- update package-lock.json ([5d40914](https://github.com/tarcisioandrade/rich-domain/commit/5d40914e29e2c1b8a6e64196de36be17ce8cc7a5))
- update package-lock.json and package.json to include new dependencies ([25278b8](https://github.com/tarcisioandrade/rich-domain/commit/25278b8487daf7446e66ae213b3b969a5f3b28d8))
- update package-lock.json to add fastify-with-typeorm example and new dependencies ([8ab46f5](https://github.com/tarcisioandrade/rich-domain/commit/8ab46f539d7b9e9427f2788c81d75b6548acb1c9))

### Refactoring

- add transactional support and tag management in Post persistence mapping ([ebdb58d](https://github.com/tarcisioandrade/rich-domain/commit/ebdb58d1426087fed7e2edee4f85c1d6bbc691d1))
- remove unnecessary transactional decorator and enhance user persistence mapping ([4c4c3a0](https://github.com/tarcisioandrade/rich-domain/commit/4c4c3a0fc40194ae18fe2dada4a5be8d0c2519bf))
- replace DomainEventBus with IDomainEventBus interface and update related classes ([b1c268b](https://github.com/tarcisioandrade/rich-domain/commit/b1c268b0dc55206d733e7819a577ea69ffea3164))

## [1.5.0](https://github.com/tarcisioandrade/rich-domain/compare/v0.7.0...v1.5.0) (2025-12-09)

## [1.4.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.3.2...v1.4.0) (2025-12-08)

### [1.3.2](https://github.com/tarcisioandrade/rich-domain/compare/v1.3.1...v1.3.2) (2025-12-08)

### Chores

- remove obsolete TypeScript build info file from rich-domain package ([50b44af](https://github.com/tarcisioandrade/rich-domain/commit/50b44afbbf3a5c0d0124e5b722efd3d8779b86d9))
- update rich-domain to version 1.3.1 and adjust package configurations ([d8585bd](https://github.com/tarcisioandrade/rich-domain/commit/d8585bd8fb82d666e01d5c6540247a730d161d2c))
- update TypeScript configuration and refactor import paths in repositories ([1e99e7d](https://github.com/tarcisioandrade/rich-domain/commit/1e99e7d8358e3b6e78a850655be828890a13c815))

### [1.3.1](https://github.com/tarcisioandrade/rich-domain/compare/v0.6.0...v1.3.1) (2025-12-08)

### Features

- add onBeforeCreate hook to ValueObject for pre-creation logic ([5d5d84d](https://github.com/tarcisioandrade/rich-domain/commit/5d5d84d3512693a8fae83963e3eee51fef7276d7))
- new command init and template structure ([c00dec7](https://github.com/tarcisioandrade/rich-domain/commit/c00dec71fe4ddd644c4a94b2468ef839ba8f07cc))

### Bug Fixes

- directory path not found error ([08f4080](https://github.com/tarcisioandrade/rich-domain/commit/08f40803a4558365e70752911f729597fd19b536))

### Refactoring

- cli folders strucuture and other fixes ([3ac73b6](https://github.com/tarcisioandrade/rich-domain/commit/3ac73b60e84cb3071f0dd3dc0817aa3e19c9167c))

### Chores

- update @woltz/rich-domain-prisma to version 0.6.0 and add peer dependencies ([7c85297](https://github.com/tarcisioandrade/rich-domain/commit/7c8529705fa74deab0da5f4fe4dc8b7040359e2f))

## [1.3.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.4...v1.3.0) (2025-12-05)

### Features

- add docs favicon ([d901f21](https://github.com/tarcisioandrade/rich-domain/commit/d901f21a0affc79ed1e8351807d0cf431815cd37))
- add Tag and Group models, implement tagging functionality in Post service ([58bc9b8](https://github.com/tarcisioandrade/rich-domain/commit/58bc9b8149db9a1e866396843ebd1a797e4bdb90))
- enhance criteria parsing to support filters with quantifiers and improve error handling ([db72d14](https://github.com/tarcisioandrade/rich-domain/commit/db72d14e03c4adfd2dfc83a25ca5168c87bbe16d))
- enhance Criteria.fromQueryParams to support multiple orderBy formats ([94a3b7d](https://github.com/tarcisioandrade/rich-domain/commit/94a3b7d87c9ebdf9409462c497c704cdac3f6cf9))
- include parentId and parentEntity for N:N relation support ([afa5d5f](https://github.com/tarcisioandrade/rich-domain/commit/afa5d5f2346ff371ead349e132235194561ad070))
- integrate Fastify Swagger and rich-domain-criteria-zod ([65b86cf](https://github.com/tarcisioandrade/rich-domain/commit/65b86cfc234d1cf0453ce523617543925c9efaa1))
- introduce error handling for batch operations and enhance Prisma repository with validation ([ba9e9af](https://github.com/tarcisioandrade/rich-domain/commit/ba9e9af3da4bb3e9925dcb16136efebb514145cf))
- onBeforeCreate implementation ([6055817](https://github.com/tarcisioandrade/rich-domain/commit/6055817f3772d822cd5e91c16e38c77cd313bb31))
- refactor criteriaToQueryParams to support quantifiers in filters and improve value handling ([29c6d94](https://github.com/tarcisioandrade/rich-domain/commit/29c6d94d6ccd7fb6f1eef95fd7d6471e9512d637))
- relation field implementation to N:N actions ([4a286f4](https://github.com/tarcisioandrade/rich-domain/commit/4a286f459d0b9a62a290e68fbd6d2557fc82ea10))
- rich domain criteria zod package implementation ([e25b45b](https://github.com/tarcisioandrade/rich-domain/commit/e25b45b0a42a4237d1db043568e682de0a86b030))

### Chores

- update package.json files for rich-domain and rich-domain-prisma ([4857580](https://github.com/tarcisioandrade/rich-domain/commit/4857580accfe8a4ec1cc4d73f57f2ef9bc62fc65))
- update zod dependency to version 4.1.5 and adjust Criteria.fromQueryParams type ([40d0a41](https://github.com/tarcisioandrade/rich-domain/commit/40d0a41acf13adf08d0b3d2998b9a99023ee6749))

### Documentation

- change toJson to toJSON ([df27a2c](https://github.com/tarcisioandrade/rich-domain/commit/df27a2c16874a6ae30554f4c796c46946e739871))

### Refactoring

- enhance search handling in useCriteria hook and related types ([caa7ff6](https://github.com/tarcisioandrade/rich-domain/commit/caa7ff6656369135216b7c8c48f88cb9a52cd8ef))
- improve search parameter handling in criteria persistence utilities ([eca3695](https://github.com/tarcisioandrade/rich-domain/commit/eca36950def882b6565e64846e201f44101f9027))
- remove redundant comments and improve constructor formatting in error classes ([0dab1ea](https://github.com/tarcisioandrade/rich-domain/commit/0dab1ea740c0af229ab3be703b4e2a91b54bc696))
- rename toJson methods to toJSON for consistency across rich-domain classes ([d37eaef](https://github.com/tarcisioandrade/rich-domain/commit/d37eaefce2ba6fc4c4da735000a2fe1b672c89c5))
- simplify search handling in Criteria class and update related types ([bd3e840](https://github.com/tarcisioandrade/rich-domain/commit/bd3e8403e91ed9bc33f0a1ca2feebe555e84ec2d))
- streamline EntitySchemaRegistry configuration for Post and User mappers ([566999f](https://github.com/tarcisioandrade/rich-domain/commit/566999ff0aedb68b130968f7875a957e98245940))
- update filter components and utility functions for improved criteria handling ([baa05f8](https://github.com/tarcisioandrade/rich-domain/commit/baa05f864576049678147c3a596afb054382dc94))

### [1.2.4](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.2...v1.2.4) (2025-11-30)

### Bug Fixes

- critic bug ([474a8d9](https://github.com/tarcisioandrade/rich-domain/commit/474a8d90fc9fb2810dc37018c86dce234d2ac08f))
- improve deep cloning logic in BaseEntity to handle structuredClone fallback ([78f8fbf](https://github.com/tarcisioandrade/rich-domain/commit/78f8fbf5846650a7e3783aa55023d94db65572f6))

### Tests

- add comprehensive deep tracking tests for nested entity structures ([66b0c33](https://github.com/tarcisioandrade/rich-domain/commit/66b0c3399e825b24925a7ae3056e57a18ec6d93c))

### Refactoring

- change visibility of prisma client in PrismaRepository constructor ([1cf83ed](https://github.com/tarcisioandrade/rich-domain/commit/1cf83ed97585fddd6a25125cedc1bcf72b289713))

### [1.2.3](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.2...v1.2.3) (2025-11-30)

### Bug Fixes

- critic bug ([474a8d9](https://github.com/tarcisioandrade/rich-domain/commit/474a8d90fc9fb2810dc37018c86dce234d2ac08f))
- improve deep cloning logic in BaseEntity to handle structuredClone fallback ([78f8fbf](https://github.com/tarcisioandrade/rich-domain/commit/78f8fbf5846650a7e3783aa55023d94db65572f6))

### Tests

- add comprehensive deep tracking tests for nested entity structures ([66b0c33](https://github.com/tarcisioandrade/rich-domain/commit/66b0c3399e825b24925a7ae3056e57a18ec6d93c))

### [1.2.2](https://github.com/tarcisioandrade/rich-domain/compare/v0.3.0...v1.2.2) (2025-11-30)

### Features

- filter component with criteria ([a6e5a66](https://github.com/tarcisioandrade/rich-domain/commit/a6e5a664e7b175f8156832b2d42821f73efec522))

### Bug Fixes

- incorrect verification in criteria operator validation ([8b4da16](https://github.com/tarcisioandrade/rich-domain/commit/8b4da16ded67a55afe64adbe60d52359cd168a17))

### Chores

- update dependencies and refactor mappers to use PrismaToPersistence ([5281716](https://github.com/tarcisioandrade/rich-domain/commit/52817161667ce473ffe2f7991d55c03190d097c0))

### Refactoring

- enhance criteria validation by adding field value sanitization ([9991a6b](https://github.com/tarcisioandrade/rich-domain/commit/9991a6b54dbfa8b5d2505ed17897b76f6b794a33))
- improve filter component logic and UI interactions for adding filters ([3dd8d9f](https://github.com/tarcisioandrade/rich-domain/commit/3dd8d9fb8934ca15357ad62485f74c541c01a680))
- migrate filter types to filter-utils for improved organization and clarity ([eeb2af4](https://github.com/tarcisioandrade/rich-domain/commit/eeb2af4f563ff7f8dc3eb1836b22392bc229f3af))
- update FilterDateValue component to handle string dates and improve date handling logic ([6cb0b42](https://github.com/tarcisioandrade/rich-domain/commit/6cb0b4245ce9394389ee208c16035bc49e4aa912))

### [1.2.1](https://github.com/tarcisioandrade/rich-domain/compare/v1.2.0...v1.2.1) (2025-11-29)

### Features

- implement custom UUID generation in crypto module ([4fc732a](https://github.com/tarcisioandrade/rich-domain/commit/4fc732a00237a9d63e320555acf4a8a14c941f13))
- introduce TypedOrder and enhance Criteria to support nested object field paths ([9857624](https://github.com/tarcisioandrade/rich-domain/commit/9857624608eda1320ec813b165e9183f1e28a0d1))
- new history-tracker structure ([aaea6d4](https://github.com/tarcisioandrade/rich-domain/commit/aaea6d4c8aed575f50917cba41936d1b1560ed3d))
- update Id constructor to handle optional isNew parameter ([0aae58b](https://github.com/tarcisioandrade/rich-domain/commit/0aae58b02da69e0cb7421663335ac305ade5afa7))

### Bug Fixes

- aggregate-changes type inference ([aa62138](https://github.com/tarcisioandrade/rich-domain/commit/aa62138b31cdedb63c0e1be8a19271f4ada2e71c))
- history tracker not tracking when nested created ([2900e20](https://github.com/tarcisioandrade/rich-domain/commit/2900e20c18da7aa0ee960c9e5d0f5e2524e3d6f3))
- uow in persistence fastify example ([fcef611](https://github.com/tarcisioandrade/rich-domain/commit/fcef61103f160c0b1adbee9cbce821ce047189eb))

### Refactoring

- change prisma example to new architecture ([92dc179](https://github.com/tarcisioandrade/rich-domain/commit/92dc1798ee5a64439d6633ab5b0cc77b42265ed6))
- improve deepClone method for better object handling and error management ([52ae893](https://github.com/tarcisioandrade/rich-domain/commit/52ae8930d112ba018f7944f69837edea82d45309))
- prisma example unit of work with async local storage ([ca6fc16](https://github.com/tarcisioandrade/rich-domain/commit/ca6fc1663ca251dac020939080b126f3984b0eae))
- remove unnosed code from ancient architecture ([19a41b1](https://github.com/tarcisioandrade/rich-domain/commit/19a41b121b4adaaea5525da20b068f43cc674db8))
- update repository methods to use 'save' consistently across use cases ([aab323b](https://github.com/tarcisioandrade/rich-domain/commit/aab323be2fff86246dc0c1a14cb7ba56bf11efa7))
- update repository methods to use 'save' instead of 'create' and 'update' ([6766970](https://github.com/tarcisioandrade/rich-domain/commit/6766970019781215019b492963e020ef4babcd89))

### Tests

- add load test ([9bd07fb](https://github.com/tarcisioandrade/rich-domain/commit/9bd07fb019e2cc0eef3f0573af8f4dad1d8b385f))
- new history-tracker structure ([d31ad0b](https://github.com/tarcisioandrade/rich-domain/commit/d31ad0b109bfa5e5ff62743d70dd51bb64107f10))

## [1.2.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.1.0...v1.2.0) (2025-11-23)

### Features

- add getFilterByField and getSortByField methods to useCriteria hook ([8db041a](https://github.com/tarcisioandrade/rich-domain/commit/8db041a8fbe359ec6fe3ff70e22ac87a6c221686))
- add options parameter to addFilter method for enhanced filtering capabilities ([c43c164](https://github.com/tarcisioandrade/rich-domain/commit/c43c164f56831b9f0b06f2e5981ba3f540cf3378))
- add quantifier support to Criteria class for enhanced filtering options ([322adf3](https://github.com/tarcisioandrade/rich-domain/commit/322adf36dfedcdc21ae6fc85c3577e1fb2835019))
- criteria adapter implementation ([f387f0b](https://github.com/tarcisioandrade/rich-domain/commit/f387f0bcd601a69da74d5fff33b9d9872e049179))
- enhance criteria operators with new types and validation functions ([8d30c14](https://github.com/tarcisioandrade/rich-domain/commit/8d30c1448e3d25c790d667b43d17546a441e710d))

### Bug Fixes

- FieldPath infer type to array methods ([844a56e](https://github.com/tarcisioandrade/rich-domain/commit/844a56ef2cdc65fac0cb228c6936808a92ffa440))
- search filter not reset page ([c8c9d8b](https://github.com/tarcisioandrade/rich-domain/commit/c8c9d8b1fecc1ce8c568f43710c8748ad9ad1f1e))
- types in react-with-react-query ([6eeeb74](https://github.com/tarcisioandrade/rich-domain/commit/6eeeb74715bef50d3c5dec8dcc3e37484e0f511b))

### Chores

- add TypeScript check script and enhance ([9f6347c](https://github.com/tarcisioandrade/rich-domain/commit/9f6347c4707adebb9e03bcdc952791a9c3279038))
- enhance useCriteria hook and update TypeScript types for better type safety ([2bbc699](https://github.com/tarcisioandrade/rich-domain/commit/2bbc699aab415a52502ad50e7fbf67bcd52ae222))
- refactor frontend example to integrate useCriteria hook ([48dccc7](https://github.com/tarcisioandrade/rich-domain/commit/48dccc7df870024f280902c22c77dcf531702781))
- update ESLint configurations to include tsconfigRootDir ([b019884](https://github.com/tarcisioandrade/rich-domain/commit/b01988496b91c6c9d3e6d3d89597cf9f23e54729))
- update rich domain version in examples app ([4be8a1b](https://github.com/tarcisioandrade/rich-domain/commit/4be8a1bdd4473d8274c0ec8bec1d4ec1d70109ea))
- update target paths in registry.json and use-criteria.json for improved file structure ([d2f9348](https://github.com/tarcisioandrade/rich-domain/commit/d2f93486158e465d8878d92f1d80e259cc62f701))

### Refactoring

- criteria adapter in fastify-with-prisma example ([8adef1e](https://github.com/tarcisioandrade/rich-domain/commit/8adef1e0c62ab94bd3665f91ca6ea29d568ea24f))

## [1.1.0](https://github.com/tarcisioandrade/rich-domain/compare/v1.0.0...v1.1.0) (2025-11-22)

### Features

- add examples in monorepo ([2cba30e](https://github.com/tarcisioandrade/rich-domain/commit/2cba30e318be2575b007c8b4f9a00e35561eec5e))
- add react-with-react-query example ([439589e](https://github.com/tarcisioandrade/rich-domain/commit/439589e1abbc47b1b03efab3b9dde53fe8d6253c))
- domain execeptions ([e206274](https://github.com/tarcisioandrade/rich-domain/commit/e206274d8a93c09cc91b2c0514be62cb986caaa3))
- implement useCriteria hook ([c00441a](https://github.com/tarcisioandrade/rich-domain/commit/c00441a105391fd06ef39b8c7e3aa0907c3ff508))

### Bug Fixes

- infinite loop when multiples order are add ([2c13dc4](https://github.com/tarcisioandrade/rich-domain/commit/2c13dc472d009bf328ad45222ea1c921f588ff9a))
- search not working in fromArray PaginatedResult method ([b79b2aa](https://github.com/tarcisioandrade/rich-domain/commit/b79b2aa2aa17e8b98bf2c2fcb4823452db99dcc1))

### Refactoring

- clean exports ([3f8e16a](https://github.com/tarcisioandrade/rich-domain/commit/3f8e16a2103514ef7a2a928dff20f674d1e39506))
- migrate eslint configuration to ES module syntax ([3ea4366](https://github.com/tarcisioandrade/rich-domain/commit/3ea43667b0857b7ae2afcbad858c16384035dc50))
- monorepo implementation ([e0b1e68](https://github.com/tarcisioandrade/rich-domain/commit/e0b1e683d5ee95b54b79510d43dd957af49c65e2))
- remove defaultValues from value objects ([0523479](https://github.com/tarcisioandrade/rich-domain/commit/0523479c6f272d7ea5d678638fa666e3fde71c7a))
- streamline domain event imports and consolidate IDomainEvent interface ([573c689](https://github.com/tarcisioandrade/rich-domain/commit/573c689a762baecd9fb8791e66300f663d7a58c1))

### Chores

- add postinstall script to generate Prisma client ([ffbe310](https://github.com/tarcisioandrade/rich-domain/commit/ffbe310db4ff9e6918d4e55096b8939c1f8f4543))
- enhance linting setup for react-rich-domain and update package.json ([ac2803b](https://github.com/tarcisioandrade/rich-domain/commit/ac2803bac0d907c0513d249fc5e14390418c7530))
- modify check script to target specific workspace ([d39d6d8](https://github.com/tarcisioandrade/rich-domain/commit/d39d6d8ef3a04d17207a3a0e795027040b3cf707))
- update clean script to remove node_modules in backend and rich-domain packages ([2a10cab](https://github.com/tarcisioandrade/rich-domain/commit/2a10cab193ba00e504a9a301cc00cda4b68b8573))
- update module entry points in package.json for react-rich-domain ([03be9ac](https://github.com/tarcisioandrade/rich-domain/commit/03be9aced05160c97eb74f771b770283c07e046b))
- update package configuration and add new dependencies ([4135393](https://github.com/tarcisioandrade/rich-domain/commit/4135393ae78b1b8e6b0c9306f0ac0872971ddb3f))
- update package.json scripts to target specific workspace ([8f46868](https://github.com/tarcisioandrade/rich-domain/commit/8f468688017f49cae58dff5d1a9818fe64b38017))
- update package.json with homepage and repository detail ([bfb387c](https://github.com/tarcisioandrade/rich-domain/commit/bfb387cb2076989a808f25be09337a24ed3a8ff6))
- update test script to target specific workspace ([6783208](https://github.com/tarcisioandrade/rich-domain/commit/678320803828a43ef588c366e59bf62c2851c126))
