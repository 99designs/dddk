import { Syncer } from "./syncer";
import { Client } from "./client";
import nock from "nock";
import { Dashboard, Monitor, SLO, Synthetic } from "./api";

const api = nock("https://api.datadoghq.com");
let syncer: Syncer;

beforeEach(async () => {
  api.get("/api/v1/dashboard").reply(200, {
    dashboards: [
      {
        id: 111,
        title: "Dashboard Name",
        description: "managed by [dddk](github.com/99designs/dddk)",
      },
    ],
  });

  api.get("/api/v1/monitor?per_page=1000").reply(200, [
    {
      id: 222,
      name: "Monitor Name",
      tags: ["created_by:dddk"],
    },
    // This is a little weird, datadog creates a monitor for each synthetic and they are linked behind the scenes.
    // DDDK needs to know about them to link them into SLOs but largely tries to ignore them and interacts with them
    // as synthetics wherever possible.
    {
      id: 555,
      name: "[Synthetics] Synthetics Name",
      tags: ["created_by:dddk"],
    },
  ]);

  api.get("/api/v1/slo?limit=1000").reply(200, {
    data: [
      {
        id: 333,
        name: "SLO Name",
        tags: ["created_by:dddk"],
      },
    ],
  });

  api.get("/api/v1/synthetics/tests").reply(200, {
    tests: [
      {
        public_id: 444,
        name: "Synthetic Name",
        tags: ["created_by:dddk"],
      },
    ],
  });

  const client = new Client("TEST", "TEST");
  syncer = await Syncer.create(client, {
    dashboards: {},
    monitors: {},
    slos: {},
    synthetics: {},
  });
});

test("updating dashboards", async () => {
  const dashboardNeedsUpdate: Dashboard = {
    title: "Dashboard Name",
    widgets: [
      {
        definition: {
          type: "timeseries",
          requests: [{ q: "different" }],
        },
      },
    ],
    layout_type: "ordered",
  };

  api.put("/api/v1/dashboard/111").reply(200, {
    id: 1234,
    title: "Dashboard Name",
  });

  await syncer.syncDashboard(dashboardNeedsUpdate);
  await syncer.syncDashboard(dashboardNeedsUpdate);
});

test("updating monitors", async () => {
  const monitorNeedsUpdate: Monitor = {
    name: "Monitor Name",
    message: "asdf",
    query: "asdf",
    type: "query alert",
    options: {},
  };

  api.put("/api/v1/monitor/222").reply(200, {
    id: 1234,
    name: "Monitor Name",
  });

  await syncer.syncMonitor(monitorNeedsUpdate);
  await syncer.syncMonitor(monitorNeedsUpdate);
});

test("updating slos", async () => {
  const sloNeedsUpdate: SLO = {
    name: "Slo Name",
    description: "asdf",
    monitor_ids: [],
    thresholds: [],
    type: "monitor",
  };

  api.post("/api/v1/slo").reply(200, {
    data: [
      {
        id: 1234,
        name: "Slo Name",
      },
    ],
  });

  await syncer.syncSLO(sloNeedsUpdate);
  await syncer.syncSLO(sloNeedsUpdate);
});

test("updating synthetics", async () => {
  const syntheticNeedsUpdate: Synthetic = {
    name: "Synthetic Name",
    locations: [],
    config: {
      assertions: [],
      request: {
        method: "GET",
        url: "asdf",
      },
    },
    message: "Updated message",
    options: {
      tick_every: 1,
    },
    type: "api",
  };

  api.put("/api/v1/synthetics/tests/444").reply(200, {
    id: 1234,
    name: "Synthetic Name",
  });

  await syncer.syncSynthetic(syntheticNeedsUpdate);
  await syncer.syncSynthetic(syntheticNeedsUpdate);
});

test("deletes unseen", async () => {
  api.delete("/api/v1/dashboard/111").reply(200, null);
  api.delete("/api/v1/monitor/222").reply(200, null);
  api.delete("/api/v1/slo/333").reply(200, null);
  api.post("/api/v1/synthetics/tests/delete").reply(200, null);
  await syncer.deleteUnseen();
});
