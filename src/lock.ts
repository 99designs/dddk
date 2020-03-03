import equal from "deep-equal";
import { diffWords } from "diff";
import chalk from "chalk";

interface Ref {
  id: string;
  synced: boolean;
}

export interface LockOptions<DataType> {
  onCreate: (item: DataType) => Promise<string>;
  onUpdate: (id: string, item: DataType) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  data: LockData<DataType>;
  name: string;
}

export type LockData<DataType> = { [id: string]: DataType };

// The lock is responsible for determining how and when to call datadog - create, update, delete or skip.
// skips are based on the lock file, CRUD comes from the refs, and requires pre-seeding the cache with
// calls to link.
export class Lock<DataType> {
  private readonly refs = new Map<string, Ref>();
  private readonly options: LockOptions<DataType>;

  stats = {
    skipped: 0,
    updated: 0,
    created: 0,
    deleted: 0,
  };

  constructor(opts: LockOptions<DataType>) {
    this.options = opts;
  }

  // update the local name => id map, so we know what already exists
  link(name: string, id: string) {
    this.refs.set(name, { id, synced: false });
  }

  // determines if we need to create or update, or we can skip this item because
  // its already up to date and calls the appropriate method in options.
  //
  // Returns the datadog id.
  async sync(name: string, item: DataType): Promise<string> {
    const ref = this.refs.get(name);

    if (ref && equal(this.options.data[ref.id], item)) {
      this.stats.skipped++;

      this.refs.set(name, { id: ref.id, synced: true });
      return ref.id;
    }

    if (ref) {
      console.log(`Updating ${this.options.name} ${name}...`);
      if (this.options.data[ref.id]) {
        printColorDiff(this.options.data[ref.id], item);
      }

      await this.options.onUpdate(ref.id, item);
      this.refs.set(name, { id: ref.id, synced: true });
      this.stats.updated++;
      this.options.data[ref.id] = item;
      return ref.id;
    } else {
      const id = await this.options.onCreate(item);
      console.log(`Creating ${this.options.name} ${name}...`);
      this.refs.set(name, { id: id, synced: true });
      this.stats.created++;
      this.options.data[id] = item;
      return id;
    }
  }

  // Walks through all known (added via link) items and deletes any that haven't been synced
  async deleteUnseen() {
    for (const [name, ref] of this.refs) {
      if (ref.synced) continue;

      console.log(`Deleting ${this.options.name} ${name}...`);
      await this.options.onDelete(ref.id);
      this.stats.deleted++;
    }
  }

  get data() {
    return this.options.data;
  }
}

function printColorDiff(a: any, b: any) {
  const changes = diffWords(
    JSON.stringify(a, null, 2) || "",
    JSON.stringify(b, null, 2) || "",
  );

  for (const change of changes) {
    if (change.added) {
      process.stdout.write(chalk.green(change.value));
    } else if (change.removed) {
      process.stdout.write(chalk.red(change.value));
    } else {
      process.stdout.write(chalk.white(change.value));
    }
    process.stdout.write("\n");
  }
}
