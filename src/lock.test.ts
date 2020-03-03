import { Lock, LockData } from "./lock";

type TestData = string;

test("will update existing if already exists but not in lock", async () => {
  const opts = mockOptions();
  const lock = new Lock<TestData>(opts);

  lock.link("Foo", "1");
  await lock.sync("Foo", "data");
  await lock.deleteUnseen();

  expect(lock.stats).toEqual({
    skipped: 0,
    updated: 1,
    created: 0,
    deleted: 0,
  });

  expect(opts.onCreate.mock.calls.length).toBe(0);
  expect(opts.onUpdate.mock.calls.length).toBe(1);
  expect(opts.onDelete.mock.calls.length).toBe(0);
});

test("will update existing if in lock, but not matching", async () => {
  const opts = mockOptions({
    "1": "data",
  });
  const lock = new Lock<TestData>(opts);

  lock.link("Foo", "1");
  await lock.sync("Foo", "data2");
  await lock.deleteUnseen();

  expect(lock.stats).toEqual({
    skipped: 0,
    updated: 1,
    created: 0,
    deleted: 0,
  });

  expect(opts.onCreate.mock.calls.length).toBe(0);
  expect(opts.onUpdate.mock.calls.length).toBe(1);
  expect(opts.onDelete.mock.calls.length).toBe(0);
});

test("will create new if not existing", async () => {
  const opts = mockOptions();
  const lock = new Lock<TestData>(opts);

  await lock.sync("Foo", "data");
  expect(lock.stats).toEqual({
    skipped: 0,
    updated: 0,
    created: 1,
    deleted: 0,
  });

  expect(opts.onCreate.mock.calls.length).toBe(1);
  expect(opts.onUpdate.mock.calls.length).toBe(0);
  expect(opts.onDelete.mock.calls.length).toBe(0);
});

test("will skip if existing and matches lock", async () => {
  const opts = mockOptions({
    "1": "data",
  });
  const lock = new Lock<TestData>(opts);

  lock.link("Foo", "1");
  await lock.sync("Foo", "data");
  await lock.deleteUnseen();

  expect(lock.stats).toEqual({
    skipped: 1,
    updated: 0,
    created: 0,
    deleted: 0,
  });

  expect(opts.onCreate.mock.calls.length).toBe(0);
  expect(opts.onUpdate.mock.calls.length).toBe(0);
  expect(opts.onDelete.mock.calls.length).toBe(0);
});

test("deletes unsynced items", async () => {
  const fns = mockOptions();
  const lock = new Lock<TestData>(fns);

  lock.link("Foo", "1");
  lock.link("Bar", "2");

  await lock.deleteUnseen();

  expect(lock.stats).toEqual({
    skipped: 0,
    updated: 0,
    created: 0,
    deleted: 2,
  });

  expect(fns.onCreate.mock.calls.length).toBe(0);
  expect(fns.onUpdate.mock.calls.length).toBe(0);
  expect(fns.onDelete.mock.calls.length).toBe(2);
});

function mockOptions(lock: LockData<TestData> = {}) {
  return {
    onCreate: jest.fn(async (item: string) => {
      return "99";
    }),
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    data: lock,
    name: "test",
  };
}
