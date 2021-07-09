import { Dashboard, Monitor, SLO, Synthetic } from "./api";
import { Client } from "./client";
import { Lock, LockData } from "./lock";

export const descriptionTag = "managed by [dddk](github.com/99designs/dddk)";
export const createdbyTag = "created_by:dddk";

interface State {
  monitors: Lock<Monitor>;
  dashboards: Lock<Dashboard>;
  synthetics: Lock<Synthetic>;
  slos: Lock<SLO>;
}

export interface LockFile {
  monitors: LockData<Monitor>;
  dashboards: LockData<Dashboard>;
  synthetics: LockData<Synthetic>;
  slos: LockData<SLO>;
}

// The Syncer caches the datadog state in lock.json, so it can quickly diff
// changes and make the minimal number of CRUD calls.
export class Syncer {
  private state: State;

  // Creating a new Syncer requires calling datadog, and is therefore async.
  // Call Syncer.create() instead.
  constructor(state: State) {
    this.state = state;
  }

  // create a new Client instance based on the local lock file and and fetching
  // refs from datadog.
  static async create(client: Client, lockFile: LockFile) {
    let lock: State = {
      dashboards: new Lock<Dashboard>({
        async onCreate(data: Dashboard) {
          return (await client.createDashboard(data)).id;
        },
        async onUpdate(id: string, data: Dashboard) {
          await client.updateDashboard(id, data);
        },
        async onDelete(id: string) {
          await client.deleteDashboard(id);
        },
        data: lockFile.dashboards,
        name: "Dashboard",
      }),
      monitors: new Lock<Monitor>({
        async onCreate(data: Monitor) {
          return (await client.createMonitor(data)).id.toString();
        },
        async onUpdate(id: string, data: Monitor) {
          await client.updateMonitor(parseInt(id), data);
        },
        async onDelete(id: string) {
          await client.deleteMonitor(parseInt(id));
        },
        data: lockFile.monitors,
        name: "Monitor",
      }),
      synthetics: new Lock<Synthetic>({
        async onCreate(data: Synthetic) {
          return (await client.createSynthetic(data)).public_id;
        },
        async onUpdate(id: string, data: Synthetic) {
          await client.updateSynthetic(id, data);
        },
        async onDelete(id: string) {
          await client.deleteSynthetic(id);
        },
        data: lockFile.synthetics,
        name: "Synthetic",
      }),
      slos: new Lock<SLO>({
        async onCreate(data: SLO) {
          return (await client.createSLO(data)).id;
        },
        async onUpdate(id: string, data: SLO) {
          await client.updateSLO(id, data);
        },
        async onDelete(id: string) {
          await client.deleteSLO(id);
        },
        data: lockFile.slos,
        name: "SLO",
      }),
    };

    const initializers = [
      async () => {
        for (let i of await client.getDashboards({ hasTag: descriptionTag })) {
          lock.dashboards.link(i.title, i.id);
        }
      },
      async () => {
        for (let i of await client.getMonitors({ hasTag: createdbyTag })) {
          if (i.name.startsWith("[Synthetics] ")) continue;
          lock.monitors.link(i.name, i.id.toString());
        }
      },
      async () => {
        for (let i of await client.getSLOs({ hasTag: createdbyTag })) {
          lock.slos.link(i.name, i.id);
        }
      },
      async () => {
        for (let i of await client.getSynthetics({ hasTag: createdbyTag })) {
          lock.synthetics.link(i.name, i.public_id);
        }
      },
    ].map(f => f());

    await Promise.all(initializers);
    return new Syncer(lock);
  }

  async syncDashboard(board: Dashboard): Promise<string> {
    board.description = descriptionTag;
    return await this.state.dashboards.sync(board.title, board);
  }

  async syncMonitor(monitor: Monitor): Promise<number> {
    if (!monitor.tags) monitor.tags = [];
    monitor.tags.push(createdbyTag);
    return parseInt(await this.state.monitors.sync(monitor.name, monitor), 10);
  }

  async syncSynthetic(syn: Synthetic): Promise<string> {
    if (!syn.tags) syn.tags = [];
    syn.tags.push(createdbyTag);
    return await this.state.synthetics.sync(syn.name, syn);
  }

  async syncSLO(slo: SLO): Promise<string> {
    if (!slo.tags) slo.tags = [];
    slo.tags.push(createdbyTag);
    return await this.state.slos.sync(slo.name, slo);
  }

  async deleteUnseen() {
    await this.state.dashboards.deleteUnseen();
    await this.state.slos.deleteUnseen();
    await this.state.synthetics.deleteUnseen();
    await this.state.monitors.deleteUnseen();
  }

  get lock(): LockFile {
    return {
      dashboards: this.state.dashboards.data,
      monitors: this.state.monitors.data,
      synthetics: this.state.synthetics.data,
      slos: this.state.slos.data,
    };
  }

  get stats() {
    return {
      dashboards: this.state.dashboards.stats,
      monitors: this.state.monitors.stats,
      synthetics: this.state.synthetics.stats,
      slos: this.state.slos.stats,
    };
  }
}
