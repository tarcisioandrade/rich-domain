# Export

Multi-format data export (CSV, JSON) with streaming support.

## Installation

```bash
npm install @woltz/rich-domain-export
```

**Note:** Backend-only package (Node.js).

## Quick Start

### Repository Extension

```typescript
import { ExportableRepository } from "@woltz/rich-domain-export";
import { Criteria } from "@woltz/rich-domain";

class UserRepository extends ExportableRepository<User> {
  // Your repository implementation
}

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

console.log(`Exported ${stats.totalRecords} records in ${stats.durationMs}ms`);
```

### Using ExportService (Recommended)

```typescript
import { ExportService } from "@woltz/rich-domain-export";

const exportService = new ExportService();

const { data, stats } = await exportService.export(userRepository, criteria, {
  format: "csv",
  columns: ["name", "email"],
});
```

## CSV Export

```typescript
const { data } = await repository.export(criteria, {
  format: "csv",

  // Fields to include (default: all)
  columns: ["name", "email", "age", "createdAt"],

  // Custom header labels
  headers: {
    name: "Full Name",
    email: "Email Address",
    age: "Age",
    createdAt: "Registered",
  },

  // Field delimiter (default: ",")
  delimiter: ",",

  // Include header row (default: true)
  includeHeaders: true,

  // Custom formatters (return string)
  formatters: {
    age: (value) => `${value} years old`,
    createdAt: (value) => value.toISOString().split("T")[0],
  },
});
```

## JSON Export

```typescript
// Standard JSON
const { data } = await repository.export(criteria, {
  format: "json",

  // Pretty print (default: false)
  pretty: true,

  // Indentation (default: 2)
  indent: 2,

  // Fields to include (default: all)
  fields: ["name", "email"],

  // Wrap in root key
  rootKey: "users",

  // Custom transformers (return any type)
  transformers: {
    email: (email) => email.toLowerCase(),
    name: (name) => name.trim(),
  },
});

// JSON Lines (streaming-friendly)
const { data } = await repository.export(criteria, {
  format: "json",
  jsonLines: true,
  fields: ["name", "email"],
});
```

## Streaming

For large datasets, use streaming to avoid memory issues:

```typescript
// CSV stream
const stream = await repository.exportStream(criteria, {
  format: "csv",
  batchSize: 1000,
  columns: ["name", "email"],
});

stream.pipe(fs.createWriteStream("users.csv"));

// JSON Lines stream
const stream = await repository.exportStream(criteria, {
  format: "json",
  jsonLines: true,
  batchSize: 500,
});

stream.pipe(fs.createWriteStream("users.jsonl"));
```

## HTTP Streaming

### Fastify

```typescript
app.get("/users/export", async (request, reply) => {
  const criteria = Criteria.fromQueryParams<User>(request.query);

  const stream = await userRepository.exportStream(criteria, {
    format: "csv",
    columns: ["name", "email", "status"],
  });

  return reply
    .header("Content-Type", "text/csv")
    .header("Content-Disposition", 'attachment; filename="users.csv"')
    .send(stream);
});
```

### Express

```typescript
app.get("/users/export", async (req, res) => {
  const criteria = Criteria.fromQueryParams<User>(req.query);

  const stream = await userRepository.exportStream(criteria, {
    format: "json",
    jsonLines: true,
  });

  res.setHeader("Content-Type", "application/x-ndjson");
  res.setHeader("Content-Disposition", 'attachment; filename="users.jsonl"');
  stream.pipe(res);
});
```

## Progress Tracking

```typescript
const { data, stats } = await repository.export(
  criteria,
  { format: "csv", columns: ["name", "email"] },
  (processed, total) => {
    const percentage = (processed / total) * 100;
    console.log(`Progress: ${percentage.toFixed(1)}%`);
  }
);
```

## Common Formatters

```typescript
import { commonFormatters } from "@woltz/rich-domain-export";

const { data } = await repository.export(criteria, {
  format: "csv",
  columns: ["name", "price", "createdAt", "isActive", "tags"],
  formatters: {
    // Numbers
    price: commonFormatters.currencyUSD, // $1,234.56
    discount: commonFormatters.decimal2, // 12.34

    // Dates
    createdAt: commonFormatters.isoDate, // 2024-01-15
    updatedAt: commonFormatters.localeDate, // 1/15/2024
    timestamp: commonFormatters.localeDateTime, // 1/15/2024, 10:30 AM

    // Booleans
    isActive: commonFormatters.yesNo, // Yes / No
    verified: commonFormatters.trueFalse, // True / False

    // Collections
    tags: commonFormatters.array, // tag1, tag2, tag3
    metadata: commonFormatters.json, // {"key": "value"}

    // Text
    name: commonFormatters.uppercase, // JOHN DOE
    email: commonFormatters.lowercase, // john@example.com
    bio: commonFormatters.trim, // Trimmed text
  },
});
```

## Custom Format Strategy

```typescript
import {
  ExportFormatStrategy,
  FormatRegistry,
} from "@woltz/rich-domain-export";

class ExcelFormatStrategy implements ExportFormatStrategy {
  async export(records, options) {
    // Your Excel generation logic
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet(options.sheetName || "Data");
    // ...
    return workbook.xlsx.writeBuffer();
  }

  async exportStream(recordsIterator, options) {
    // Streaming logic
  }

  validateOptions(options) {
    // Validate options
  }

  getMimeType() {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  getFileExtension() {
    return "xlsx";
  }

  getFormatName() {
    return "excel";
  }
}

// Register
FormatRegistry.register("excel", ExcelFormatStrategy);

// Use
const { data } = await repository.export(criteria, {
  format: "excel",
  sheetName: "Users",
});
```

## Error Handling

```typescript
import {
  ValidationError,
  FormatterError,
  ExportOperationError,
} from "@woltz/rich-domain-export";

try {
  const { data } = await repository.export(criteria, options);
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

## Performance Guide

| Dataset Size | Method           | Memory             |
| ------------ | ---------------- | ------------------ |
| < 10,000     | `export()`       | ~5-50 MB           |
| > 10,000     | `exportStream()` | ~10-20 MB constant |

**Tips:**

- Use `exportStream()` for 10k+ records
- Use JSON Lines for streaming large JSON
- Adjust `batchSize` (default: 1000) for memory/performance
- Use formatters for CSV (return strings)
- Use transformers for JSON (return any type)

## Complete Example

```typescript
// routes/export.route.ts
import { ExportService, commonFormatters } from "@woltz/rich-domain-export";
import { Criteria } from "@woltz/rich-domain";

const exportService = new ExportService();

app.get("/users/export/:format", async (request, reply) => {
  const { format } = request.params;
  const criteria = Criteria.fromQueryParams<User>(request.query);

  if (format === "csv") {
    const stream = await userRepository.exportStream(criteria, {
      format: "csv",
      columns: ["id", "name", "email", "status", "createdAt"],
      headers: {
        id: "ID",
        name: "Full Name",
        email: "Email",
        status: "Status",
        createdAt: "Registration Date",
      },
      formatters: {
        createdAt: commonFormatters.localeDate,
        status: (s) => s.charAt(0).toUpperCase() + s.slice(1),
      },
    });

    return reply
      .header("Content-Type", "text/csv")
      .header("Content-Disposition", 'attachment; filename="users.csv"')
      .send(stream);
  }

  if (format === "json") {
    const stream = await userRepository.exportStream(criteria, {
      format: "json",
      jsonLines: true,
      fields: ["id", "name", "email", "status"],
      transformers: {
        email: (e) => e.toLowerCase(),
      },
    });

    return reply
      .header("Content-Type", "application/x-ndjson")
      .header("Content-Disposition", 'attachment; filename="users.jsonl"')
      .send(stream);
  }

  return reply.status(400).send({ error: "Unsupported format" });
});
```
