# @woltz/rich-domain-export

Multi-format export utilities for rich-domain repositories. Export your domain entities to CSV, JSON, and more!

## Overview

This package extends rich-domain repositories with powerful multi-format export capabilities, supporting both in-memory and streaming exports for large datasets.

## Features

- ✅ **Multiple formats** - CSV, JSON, and extensible for custom formats
- ✅ **Type-safe exports** - Full TypeScript support with discriminated unions
- ✅ **Streaming support** - Memory-efficient exports for large datasets
- ✅ **Criteria integration** - Uses rich-domain Criteria API for filtering
- ✅ **Custom formatters/transformers** - Transform field values during export
- ✅ **Validation** - Built-in validation for export options
- ✅ **Progress tracking** - Monitor export progress for large datasets
- ✅ **Two approaches** - Repository extension or standalone service
- ✅ **JSON Lines support** - Stream-friendly JSONL format

## Installation

```bash
npm install @woltz/rich-domain-export
```

**Note**: This is a backend-only package (Node.js). For frontend exports, use API endpoints.

## Quick Start

### Approach 1: Repository Extension (Recommended)

```typescript
import { ExportableRepository } from "@woltz/rich-domain-export";
import { Criteria } from "@woltz/rich-domain";

class UserRepository extends ExportableRepository<User> {
  // Your repository implementation
}

const userRepository = new UserRepository();

// Export as CSV
const { data, stats } = await userRepository.export(
  Criteria.create<User>().where("status", "equals", "active"),
  {
    format: "csv",
    columns: ["name", "email", "createdAt"],
    headers: {
      name: "Full Name",
      email: "Email Address",
      createdAt: "Registration Date",
    },
  }
);

// Export as JSON
const { data, stats } = await userRepository.export(criteria, {
  format: "json",
  pretty: true,
  fields: ["name", "email"],
});

console.log(`Exported ${stats.totalRecords} records in ${stats.durationMs}ms`);
```

### Approach 2: Composition with ExportService

```typescript
import { ExportService } from "@woltz/rich-domain-export";

const exportService = new ExportService();

// Export from any repository
const { data, stats } = await exportService.export(userRepository, criteria, {
  format: "csv",
  columns: ["name", "email"],
});
```

## Supported Formats

### CSV Format

```typescript
const { data } = await repository.export(criteria, {
  format: "csv",
  columns: ["name", "email", "age"],
  headers: { name: "Full Name", email: "Email Address", age: "Age" },
  delimiter: ",",
  includeHeaders: true,
  formatters: {
    age: (value) => `${value} years old`,
  },
});
```

**CSV Options:**

- `columns?` - Fields to include (default: all fields)
- `headers?` - Custom header labels
- `delimiter?` - Delimiter character (default: `,`)
- `includeHeaders?` - Include header row (default: `true`)
- `formatters?` - Custom formatters (returns string)

### JSON Format

```typescript
// Standard JSON
const { data } = await repository.export(criteria, {
  format: "json",
  pretty: true,
  indent: 2,
  fields: ["name", "email"],
  rootKey: "users",
  transformers: {
    email: (email) => email.toLowerCase(),
  },
});

// JSON Lines (streaming-friendly)
const { data } = await repository.export(criteria, {
  format: "json",
  jsonLines: true,
  fields: ["name", "email"],
});
```

**JSON Options:**

- `pretty?` - Pretty print with indentation (default: `false`)
- `indent?` - Number of spaces for indentation (default: `2`)
- `jsonLines?` - Use JSON Lines format (default: `false`)
- `fields?` - Fields to include (default: all fields)
- `transformers?` - Custom transformers (returns any type)
- `rootKey?` - Wrap output in root key

## Streaming for Large Datasets

For large datasets, use streaming to avoid loading everything into memory:

```typescript
// CSV stream
const stream = await repository.exportStream(criteria, {
  format: "csv",
  batchSize: 1000,
});

stream.pipe(fs.createWriteStream("users.csv"));

// JSON Lines stream (recommended for large JSON exports)
const stream = await repository.exportStream(criteria, {
  format: "json",
  jsonLines: true,
  batchSize: 500,
});

stream.pipe(fs.createWriteStream("users.jsonl"));
```

### HTTP Streaming (Fastify Example)

```typescript
const stream = await repository.exportStream(criteria, {
  format: "csv",
  columns: ["name", "email"],
});

reply
  .header("Content-Type", "text/csv")
  .header("Content-Disposition", 'attachment; filename="users.csv"')
  .send(stream);
```

## Progress Tracking

```typescript
const { data, stats } = await repository.export(
  criteria,
  { format: "csv", columns: ["name", "email"] },
  (processed, total) => {
    const percentage = (processed / total) * 100;
    console.log(`Export progress: ${percentage.toFixed(1)}%`);
  }
);
```

## Custom Formats

Extend the library with custom formats using the Strategy Pattern:

```typescript
import {
  ExportFormatStrategy,
  FormatRegistry
} from "@woltz/rich-domain-export";

class ExcelFormatStrategy implements ExportFormatStrategy<...> {
  async export(records, options) {
    // Your Excel export logic
  }

  async exportStream(recordsIterator, options) {
    // Your streaming logic
  }

  validateOptions(options) { /* ... */ }
  getMimeType() { return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"; }
  getFileExtension() { return "xlsx"; }
  getFormatName() { return "excel"; }
}

// Register custom format
FormatRegistry.register("excel", ExcelFormatStrategy);

// Use it
const { data } = await repository.export(criteria, {
  format: "excel",
  sheetName: "Users"
});
```

## Common Formatters

CSV includes pre-built formatters:

```typescript
import { commonFormatters } from "@woltz/rich-domain-export";

const { data } = await repository.export(criteria, {
  format: "csv",
  columns: ["name", "amount", "createdAt", "active"],
  formatters: {
    amount: commonFormatters.currencyUSD,
    createdAt: commonFormatters.isoDate,
    active: commonFormatters.yesNo,
  },
});
```

**Available formatters:**

- **Dates**: `isoDate`, `localeDate`, `localeDateTime`
- **Numbers**: `decimal2`, `currencyUSD`
- **Booleans**: `yesNo`, `trueFalse`
- **Collections**: `array`, `json`
- **Text**: `uppercase`, `lowercase`, `trim`

## Error Handling

```typescript
import {
  ValidationError,
  FormatterError,
  ExportOperationError,
} from "@woltz/rich-domain-export";

try {
  const { data } = await repository.export(criteria, {
    format: "csv",
    columns: ["name", "email"],
  });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error("Invalid options:", error.validationErrors);
  } else if (error instanceof FormatterError) {
    console.error(`Formatter failed for field: ${error.field}`);
  } else if (error instanceof ExportOperationError) {
    console.error(`Export failed at phase: ${error.phase}`);
  }
}
```

## API Reference

### ExportableRepository

```typescript
abstract class ExportableRepository<TDomain> extends Repository<TDomain> {
  export(
    criteria?: Criteria<TDomain>,
    options: ExportOptions<TDomain>,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult>;

  exportStream(
    criteria?: Criteria<TDomain>,
    options: ExportOptions<TDomain>
  ): Promise<Readable>;
}
```

### ExportService

```typescript
class ExportService {
  export<T>(
    repository: Repository<T>,
    criteria: Criteria<T> | undefined,
    options: ExportOptions<T>,
    onProgress?: ExportProgressCallback
  ): Promise<ExportResult>;

  exportStream<T>(
    repository: Repository<T>,
    criteria: Criteria<T> | undefined,
    options: ExportOptions<T>
  ): Promise<Readable>;

  getMimeType(format: string): string;
  getFileExtension(format: string): string;
}
```

### FormatRegistry

```typescript
class FormatRegistry {
  static register(
    format: string,
    strategyClass: new () => ExportFormatStrategy
  ): void;
  static getStrategy(format: string): ExportFormatStrategy;
  static hasFormat(format: string): boolean;
  static getRegisteredFormats(): string[];
}
```

## Performance Considerations

| Dataset Size     | Recommended Method | Memory Usage         |
| ---------------- | ------------------ | -------------------- |
| < 1,000 records  | `export()`         | ~1-5 MB              |
| 1,000 - 10,000   | `export()`         | ~5-50 MB             |
| 10,000 - 100,000 | `exportStream()`   | ~10-20 MB (constant) |
| > 100,000        | `exportStream()`   | ~10-20 MB (constant) |

**Tips:**

- Use `exportStream()` for datasets > 10,000 records
- Use JSON Lines (`jsonLines: true`) for streaming large JSON exports
- Adjust `batchSize` option to control memory usage (default: 1000)

## TypeScript Support

Full TypeScript support with discriminated unions for type-safe format selection:

```typescript
// TypeScript enforces valid options for each format
const result = await repository.export(criteria, {
  format: "csv",
  columns: ["name"], // ✓ Valid for CSV
  delimiter: ",", // ✓ Valid for CSV
  // pretty: true     // ✗ Error: 'pretty' doesn't exist on CSV options
});
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Author

Tarcisio Andrade
