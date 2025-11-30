import { Entity } from "../../src/entity";
import { Id } from "../../src/id";

interface Level10Props {
  id: Id;
  value: string;
}

class Level10 extends Entity<Level10Props> {}

interface Level9Props {
  id: Id;
  value: string;
  child?: Level10;
  children: Level10[];
}

class Level9 extends Entity<Level9Props> {}

interface Level8Props {
  id: Id;
  value: string;
  child?: Level9;
  children: Level9[];
}

class Level8 extends Entity<Level8Props> {}

interface Level7Props {
  id: Id;
  value: string;
  child?: Level8;
  children: Level8[];
}

class Level7 extends Entity<Level7Props> {}

interface Level6Props {
  id: Id;
  value: string;
  child?: Level7;
  children: Level7[];
}

class Level6 extends Entity<Level6Props> {}

interface Level5Props {
  id: Id;
  value: string;
  child?: Level6;
  children: Level6[];
}

class Level5 extends Entity<Level5Props> {}

interface Level4Props {
  id: Id;
  value: string;
  child?: Level5;
  children: Level5[];
}

class Level4 extends Entity<Level4Props> {}

interface Level3Props {
  id: Id;
  value: string;
  child?: Level4;
  children: Level4[];
}

class Level3 extends Entity<Level3Props> {}

interface Level2Props {
  id: Id;
  value: string;
  child?: Level3;
  children: Level3[];
}

class Level2 extends Entity<Level2Props> {}

interface Level1Props {
  id: Id;
  value: string;
  child?: Level2;
  children: Level2[];
}

class Level1 extends Entity<Level1Props> {}

interface RootProps {
  id: Id;
  name: string;
  child?: Level1;
  children: Level1[];
}

class Root extends Entity<RootProps> {}

describe("Deep Change Tracking", () => {
  describe("Depth Level 1 - Direct child entity", () => {
    it("should track changes in child entity itself", () => {
      const level1 = new Level1({ value: "level1", children: [] });
      const root = new Root({
        name: "root",
        child: level1,
        children: [],
      });

      level1.props.value = "level1-changed";

      const level1History = level1.getHistory();
      expect(level1History.length).toBeGreaterThan(0);
      expect(level1History.some((h) => h.path === "value")).toBe(true);
      expect(
        level1History.some((h) => h.currentValue === "level1-changed")
      ).toBe(true);

      const rootHistory = root.getHistory();
      expect(rootHistory.every((h) => !h.path.includes("child.value"))).toBe(
        true
      );
    });

    it("should track child replacement in parent", () => {
      const level1 = new Level1({ value: "level1", children: [] });
      const root = new Root({
        name: "root",
        child: level1,
        children: [],
      });

      root.props.child = new Level1({ value: "new-level1", children: [] });

      const rootHistory = root.getHistory();
      expect(rootHistory.length).toBeGreaterThan(0);
      expect(rootHistory.some((h) => h.path === "child")).toBe(true);
    });
  });

  describe("Depth Level 3 - Triple nesting", () => {
    it("should track changes at each level independently", () => {
      const level3 = new Level3({ value: "level3", children: [] });
      const level2 = new Level2({
        value: "level2",
        child: level3,
        children: [],
      });
      const level1 = new Level1({
        value: "level1",
        child: level2,
        children: [],
      });
      const root = new Root({
        name: "root",
        child: level1,
        children: [],
      });

      // Change at each level
      root.props.name = "root-changed";
      level1.props.value = "level1-changed";
      level2.props.value = "level2-changed";
      level3.props.value = "level3-changed";

      expect(
        root.getHistory().some((h) => h.currentValue === "root-changed")
      ).toBe(true);
      expect(
        level1.getHistory().some((h) => h.currentValue === "level1-changed")
      ).toBe(true);
      expect(
        level2.getHistory().some((h) => h.currentValue === "level2-changed")
      ).toBe(true);
      expect(
        level3.getHistory().some((h) => h.currentValue === "level3-changed")
      ).toBe(true);

      expect(root.getChanges().hasChanges()).toBe(true);
      expect(level1.getChanges().hasChanges()).toBe(true);
      expect(level2.getChanges().hasChanges()).toBe(true);
      expect(level3.getChanges().hasChanges()).toBe(true);
    });
  });

  describe("Depth Level 5 - Five levels deep", () => {
    it("should support 5 levels of nesting with independent tracking", () => {
      const level5 = new Level5({ value: "level5", children: [] });
      const level4 = new Level4({
        value: "level4",
        child: level5,
        children: [],
      });
      const level3 = new Level3({
        value: "level3",
        child: level4,
        children: [],
      });
      const level2 = new Level2({
        value: "level2",
        child: level3,
        children: [],
      });
      const level1 = new Level1({
        value: "level1",
        child: level2,
        children: [],
      });
      const root = new Root({
        name: "root",
        child: level1,
        children: [],
      });

      level5.props.value = "level5-changed";

      const level5History = level5.getHistory();
      expect(level5History.length).toBeGreaterThan(0);
      expect(
        level5History.some((h) => h.currentValue === "level5-changed")
      ).toBe(true);

      const level5Changes = level5.getChanges();
      expect(level5Changes.hasUpdates()).toBe(true);
      expect(level5Changes.updates()[0].changedFields.value).toBe(
        "level5-changed"
      );
    });
  });

  describe("Depth Level 10 - Ten levels deep", () => {
    it("should support 10 levels of nesting", () => {
      const level10 = new Level10({ value: "level10" });
      const level9 = new Level9({
        value: "level9",
        child: level10,
        children: [],
      });
      const level8 = new Level8({
        value: "level8",
        child: level9,
        children: [],
      });
      const level7 = new Level7({
        value: "level7",
        child: level8,
        children: [],
      });
      const level6 = new Level6({
        value: "level6",
        child: level7,
        children: [],
      });
      const level5 = new Level5({
        value: "level5",
        child: level6,
        children: [],
      });
      const level4 = new Level4({
        value: "level4",
        child: level5,
        children: [],
      });
      const level3 = new Level3({
        value: "level3",
        child: level4,
        children: [],
      });
      const level2 = new Level2({
        value: "level2",
        child: level3,
        children: [],
      });
      const level1 = new Level1({
        value: "level1",
        child: level2,
        children: [],
      });
      const root = new Root({
        name: "root",
        child: level1,
        children: [],
      });

      expect(root).toBeDefined();
      expect(root.props.child).toBeDefined();
      expect(root.props.child!.props.child).toBeDefined();
      expect(root.props.child!.props.child!.props.child).toBeDefined();
      expect(
        root.props.child!.props.child!.props.child!.props.child
      ).toBeDefined();
      expect(
        root.props.child!.props.child!.props.child!.props.child!.props.child
      ).toBeDefined();

      level10.props.value = "level10-changed";

      const level10History = level10.getHistory();
      expect(level10History.length).toBeGreaterThan(0);
      expect(
        level10History.some((h) => h.currentValue === "level10-changed")
      ).toBe(true);

      const level10Changes = level10.getChanges();
      expect(level10Changes.hasUpdates()).toBe(true);
    });

    it("should track array changes at deep levels", () => {
      const level10Item1 = new Level10({ value: "level10-item1" });
      const level10Item2 = new Level10({ value: "level10-item2" });

      const level9 = new Level9({
        value: "level9",
        children: [level10Item1, level10Item2],
      });
      const level8 = new Level8({
        value: "level8",
        child: level9,
        children: [],
      });
      const level7 = new Level7({
        value: "level7",
        child: level8,
        children: [],
      });
      const level6 = new Level6({
        value: "level6",
        child: level7,
        children: [],
      });
      const level5 = new Level5({
        value: "level5",
        child: level6,
        children: [],
      });
      const level4 = new Level4({
        value: "level4",
        child: level5,
        children: [],
      });
      const level3 = new Level3({
        value: "level3",
        child: level4,
        children: [],
      });
      const level2 = new Level2({
        value: "level2",
        child: level3,
        children: [],
      });
      const level1 = new Level1({
        value: "level1",
        child: level2,
        children: [],
      });
      const root = new Root({
        name: "root",
        child: level1,
        children: [],
      });

      level10Item1.props.value = "level10-item1-changed";

      const itemHistory = level10Item1.getHistory();
      expect(itemHistory.length).toBeGreaterThan(0);
      expect(
        itemHistory.some((h) => h.currentValue === "level10-item1-changed")
      ).toBe(true);

      const newItem = new Level10({ value: "new-level10" });
      level9.props.children = [...level9.props.children, newItem];

      const level9Changes = level9.getChanges();
      expect(level9Changes.hasChanges()).toBe(true);
      expect(level9Changes.hasCreates()).toBe(true);
    });
  });

  describe("Mixed depth - Arrays at various levels", () => {
    it("should handle complex nested structures with arrays", () => {
      const level3Item = new Level3({
        value: "level3-array-item",
        children: [],
      });
      const level2WithArray = new Level2({
        value: "level2",
        children: [level3Item],
      });
      const level1 = new Level1({
        value: "level1",
        child: level2WithArray,
        children: [],
      });
      const root = new Root({
        name: "root",
        child: level1,
        children: [],
      });

      level3Item.props.value = "level3-array-changed";

      const itemHistory = level3Item.getHistory();
      expect(itemHistory.length).toBeGreaterThan(0);
      expect(
        itemHistory.some((h) => h.currentValue === "level3-array-changed")
      ).toBe(true);
    });
  });

  describe("Depth Capability Report", () => {
    it("should verify tracking works at all depth levels (1-10)", () => {
      const results: { depth: number; works: boolean; entityName: string }[] =
        [];

      {
        const level1 = new Level1({ value: "level1", children: [] });
        level1.props.value = "changed-1";
        const works = level1
          .getHistory()
          .some((h) => h.currentValue === "changed-1");
        results.push({ depth: 1, works, entityName: "Level1" });
      }

      {
        const level2 = new Level2({ value: "level2", children: [] });
        level2.props.value = "changed-2";
        const works = level2
          .getHistory()
          .some((h) => h.currentValue === "changed-2");
        results.push({ depth: 2, works, entityName: "Level2" });
      }

      {
        const level3 = new Level3({ value: "level3", children: [] });
        level3.props.value = "changed-3";
        const works = level3
          .getHistory()
          .some((h) => h.currentValue === "changed-3");
        results.push({ depth: 3, works, entityName: "Level3" });
      }

      {
        const level5 = new Level5({ value: "level5", children: [] });
        level5.props.value = "changed-5";
        const works = level5
          .getHistory()
          .some((h) => h.currentValue === "changed-5");
        results.push({ depth: 5, works, entityName: "Level5" });
      }

      {
        const level10 = new Level10({ value: "level10" });
        level10.props.value = "changed-10";
        const works = level10
          .getHistory()
          .some((h) => h.currentValue === "changed-10");
        results.push({ depth: 10, works, entityName: "Level10" });
      }

      results.forEach((r) => {
        const status = r.works ? "✓" : "✗";
        console.log(
          `  ${r.depth.toString().padStart(2)}  |   ${status}   | ${
            r.entityName
          }`
        );
      });

      expect(results.every((r) => r.works)).toBe(true);
    });

    it("should confirm no depth limit for nested structures", () => {
      const level10 = new Level10({ value: "level10" });
      const level9 = new Level9({
        value: "level9",
        child: level10,
        children: [],
      });
      const level8 = new Level8({
        value: "level8",
        child: level9,
        children: [],
      });
      const level7 = new Level7({
        value: "level7",
        child: level8,
        children: [],
      });
      const level6 = new Level6({
        value: "level6",
        child: level7,
        children: [],
      });
      const level5 = new Level5({
        value: "level5",
        child: level6,
        children: [],
      });
      const level4 = new Level4({
        value: "level4",
        child: level5,
        children: [],
      });
      const level3 = new Level3({
        value: "level3",
        child: level4,
        children: [],
      });
      const level2 = new Level2({
        value: "level2",
        child: level3,
        children: [],
      });
      const level1 = new Level1({
        value: "level1",
        child: level2,
        children: [],
      });
      const root = new Root({ name: "root", child: level1, children: [] });

      // Modify all levels
      const entities = [
        root,
        level1,
        level2,
        level3,
        level4,
        level5,
        level6,
        level7,
        level8,
        level9,
        level10,
      ] as const;

      entities.forEach((entity, index) => {
        const propToChange = index === 0 ? "name" : "value";
        (entity.props as any)[propToChange] = `changed-${index}`;
      });

      const allTracked = entities.every(
        (entity) => entity.getHistory().length > 0
      );
      expect(allTracked).toBe(true);

      const batchOperations = root.getChanges().toBatchOperations();

      expect(batchOperations.updates.length).toBe(11);
      expect(batchOperations.deletes.length).toBe(0);
      expect(batchOperations.creates.length).toBe(0);
    });
  });
});
