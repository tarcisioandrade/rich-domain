# @woltz/rich-domain-csv

CSV export utilities for rich-domain repositories.

## Overview

This package extends rich-domain repositories with powerful CSV export capabilities, supporting both in-memory and streaming exports for large datasets.

## Features

- ✅ **Type-safe exports** - Full TypeScript support with column selection
- ✅ **Streaming support** - Memory-efficient exports for large datasets
- ✅ **Criteria integration** - Uses rich-domain Criteria API for filtering
- ✅ **Custom formatters** - Transform field values during export
- ✅ **Validation** - Built-in validation for export options
- ✅ **Progress tracking** - Monitor export progress for large datasets
- ✅ **Two approaches** - Repository extension or standalone service

## Installation

```bash
npm install @woltz/rich-domain-csv
```

**Note**: This is a backend-only package (Node.js). For frontend CSV export, use API endpoints or browser-compatible libraries.

## Quick Start

### Approach 1: Repository Extension

```typescript
import { ExportableRepository } from "@woltz/rich-domain-csv";
import { User } from "./domain/user";

class UserRepository extends ExportableRepository<User> {
  // Your repository implementation
}

// Export to CSV
const csv = await userRepository.exportToCSV(criteria, {
  columns: ["name", "email", "status"],
  headers: {
    name: "Full Name",
    email: "Email Address",
  },
});
```

### Approach 2: Standalone Service

```typescript
import { CsvExportService } from "@woltz/rich-domain-csv";

const csvService = new CsvExportService();

const { csv, stats } = await csvService.export(userRepository, criteria, {
  columns: ["name", "email"],
});

console.log(`Exported ${stats.totalRecords} records`);
```

## API Reference

### ExportableRepository

Extended repository class with CSV export methods.

#### `exportToCSV(criteria?, options?, onProgress?)`

Export entities to CSV string.

**Parameters:**

- `criteria` (optional): Criteria for filtering and sorting
- `options` (optional): Export configuration
- `onProgress` (optional): Progress callback `(processed, total) => void`

**Returns:** `Promise<string>` - CSV string

**Example:**

```typescript
const csv = await repository.exportToCSV(
  Criteria.create<User>().where("status", "equals", "active"),
  {
    columns: ["name", "email", "createdAt"],
    headers: {
      name: "Full Name",
      email: "Email Address",
      createdAt: "Registration Date",
    },
    formatters: {
      createdAt: (date) => new Date(date).toLocaleDateString(),
    },
  },
  (processed, total) => console.log(`${processed}/${total}`)
);
```

#### `exportToCSVStream(criteria?, options?)`

Export entities to CSV stream (for large datasets).

**Parameters:**

- `criteria` (optional): Criteria for filtering and sorting
- `options` (optional): Export configuration

**Returns:** `Promise<Readable>` - Node.js Readable stream

**Example:**

```typescript
const stream = await repository.exportToCSVStream(criteria, {
  batchSize: 1000,
});

// Pipe to file
stream.pipe(fs.createWriteStream("users.csv"));

// Or send in HTTP response
reply.header("Content-Type", "text/csv").send(stream);
```

### CsvExportOptions

Configuration for CSV export.

```typescript
interface CsvExportOptions<T> {
  columns?: (keyof T)[]; // Selected columns
  headers?: Record<keyof T, string>; // Custom headers
  delimiter?: string; // Default: ","
  includeHeaders?: boolean; // Default: true
  batchSize?: number; // Default: 1000
  formatters?: Record<keyof T, (value: any) => string>;
}
```

### Common Formatters

Pre-built formatters for common use cases.

```typescript
import { commonFormatters } from "@woltz/rich-domain-csv";

const options = {
  formatters: {
    createdAt: commonFormatters.isoDate,
    price: commonFormatters.currencyUSD,
    isActive: commonFormatters.yesNo,
    tags: commonFormatters.array,
  },
};
```

Available formatters:

- `isoDate` - ISO 8601 date string
- `localeDate` - Locale date string
- `localeDateTime` - Locale datetime string
- `decimal2` - Number with 2 decimals
- `currencyUSD` - USD currency format
- `yesNo` - Boolean as Yes/No
- `trueFalse` - Boolean as True/False
- `array` - Array as comma-separated
- `json` - Object as JSON string
- `uppercase/lowercase` - Case conversion
- `trim` - Trim whitespace

### Validation

Validate export options before export.

```typescript
import { validateCsvExportOptions } from "@woltz/rich-domain-csv";

const validation = validateCsvExportOptions(options, sampleData);

if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
}

if (validation.warnings) {
  console.warn("Warnings:", validation.warnings);
}
```

### Error Handling

```typescript
import {
  CsvExportError,
  CsvValidationError,
  CsvFormatterError,
} from "@woltz/rich-domain-csv";

try {
  const csv = await repository.exportToCSV(criteria, options);
} catch (error) {
  if (error instanceof CsvValidationError) {
    console.error("Invalid options:", error.validationErrors);
  } else if (error instanceof CsvFormatterError) {
    console.error("Formatter failed for field:", error.field);
  } else {
    console.error("Export failed:", error);
  }
}
```

## Usage Examples

### Fastify Endpoint

```typescript
app.get("/users/export", async (request, reply) => {
  const criteria = Criteria.fromQueryParams<User>(request.query);

  const stream = await userRepository.exportToCSVStream(criteria);

  reply
    .header("Content-Type", "text/csv")
    .header("Content-Disposition", 'attachment; filename="users.csv"')
    .send(stream);
});
```

### Export with Progress

```typescript
const csv = await repository.exportToCSV(
  criteria,
  options,
  (processed, total) => {
    const percent = Math.round((processed / total) * 100);
    console.log(`Export progress: ${percent}%`);
  }
);
```

### Custom Export Methods

```typescript
class UserRepository extends ExportableRepository<User> {
  async exportActiveUsers(): Promise<string> {
    const criteria = Criteria.create<User>().where(
      "status",
      "equals",
      "active"
    );

    return this.exportToCSV(criteria, {
      columns: ["name", "email", "department"],
      headers: {
        name: "Full Name",
        email: "Email",
        department: "Department",
      },
    });
  }
}
```

### Export Templates

```typescript
const templates = {
  basic: {
    columns: ["name", "email"],
    headers: { name: "Name", email: "Email" },
  },
  detailed: {
    columns: ["name", "email", "department", "createdAt"],
    headers: {
      name: "Full Name",
      email: "Email Address",
      department: "Department",
      createdAt: "Registration Date",
    },
    formatters: {
      createdAt: commonFormatters.localeDate,
    },
  },
};

const csv = await repository.exportToCSV(criteria, templates.detailed);
```

## Performance Considerations

### When to Use Each Method

| Dataset Size   | Method                | Reason                     |
| -------------- | --------------------- | -------------------------- |
| < 1,000        | `exportToCSV()`       | Fast, simple               |
| 1,000 - 10,000 | `exportToCSV()`       | Still manageable in memory |
| > 10,000       | `exportToCSVStream()` | Memory efficient           |

### Batch Size Guidelines

```typescript
// Small datasets (< 5,000)
{
  batchSize: 1000;
}

// Medium datasets (5,000 - 50,000)
{
  batchSize: 500;
}

// Large datasets (> 50,000)
{
  batchSize: 250;
}
```

## Testing

```typescript
import { describe, it, expect } from "vitest";
import { UserRepository } from "./user.repository";

describe("UserRepository CSV Export", () => {
  it("should export users to CSV", async () => {
    const csv = await repository.exportToCSV();

    expect(csv).toContain("name,email");
    expect(csv).toContain("John Doe");
  });
});
```

## License

MIT

## Contributing

Contributions welcome! Please read the contributing guidelines first.
