---
"@woltz/rich-domain": patch
---

Fix native ESM runtime compatibility by emitting resolvable `.js` relative specifiers and avoiding an ESM initialization cycle in change tracking.

Also correct nested delete metadata so batch adapters receive `parentId` and `parentEntity` in the expected order.
