import * as api from "./src/api";
import {
  App,
  descriptionTag,
  createdbyTag,
  generateAlertGraphTag
} from "./src/app";
import * as yargs from "yargs";
import * as path from "path";
import { Monitor, SLO, Synthetic } from "./src/api";

const args = yargs
  .command("push <apps>", "push datadog dashboards up")
  .option("name", {
    type: "string",
    description: "only push the matching app name"
  })
  .demandCommand();

console.log(`Parsing local apps...`);
console.time("   ...completed in");
const appFile = path.resolve(args.argv.apps as string);
const apps = require(appFile);
console.timeEnd("   ...completed in");

if (!process.env["DD_API_KEY"] || !process.env["DD_APP_KEY"]) {
  console.error(
    "MISSING API KEYS - run again using \n" +
      "  aws-vault exec platform -- chamber exec dddk -- npm run sync\n\n"
  );
  process.exit(1);
}

const client = new api.Client(
  process.env["DD_API_KEY"],
  process.env["DD_APP_KEY"]
);

(async () => {
  console.log(`Fetching data from DataDog...`);
  console.time("   ...completed in");

  const dashboards = (await client.getDashboards())
    .filter(d => d.description && d.description.includes(descriptionTag))
    .map(d => ({ ...d, seen: false }));
  const monitors = (await client.getMonitors())
    .filter(d => d.tags && d.tags.find(t => t == createdbyTag))
    .map(d => ({ ...d, seen: false }));
  const slos = (await client.getSLOs())
    .filter(d => d.tags && d.tags.find(t => t == createdbyTag))
    .map(d => ({ ...d, seen: false }));
  const synthetics = (await client.getSynthetics())
    .filter(d => d.tags && d.tags.find(t => t == createdbyTag))
    .map(d => ({ ...d, seen: false }));

  console.timeEnd(`   ...completed in`);

  async function pushDashboard(app: App) {
    const existing = dashboards.find(d => d.title == app.board.title);

    if (existing) {
      existing.seen = true;
      console.log(` - Updating dashboard ${app.board.title}`);
      await client.updateDashboard(existing.id, app.board);
    } else {
      console.log(` - Creating dashboard ${app.board.title}`);
      await client.createDashboard(app.board);
    }
  }

  async function pushMonitor(monitor: Monitor): Promise<number> {
    const existing = monitors.find(d => d.name == monitor.name);

    if (existing) {
      existing.seen = true;
      console.log(` - Updating monitor ${monitor.name}`);
      await client.updateMonitor(existing.id, monitor);
      return existing.id;
    } else {
      console.log(` - Creating monitor ${monitor.name}`);
      const res = await client.createMonitor(monitor);
      return res.id;
    }
  }

  async function pushSynthetic(syn: Synthetic) {
    const existing = synthetics.find(d => d.name == syn.name);

    if (existing) {
      existing.seen = true;
      console.log(` - Updating synthetic ${syn.name}`);
      await client.updateSynthetic(existing.public_id, syn);
      return existing.public_id;
    } else {
      console.log(` - Creating synthetic ${syn.name}`);
      const res = await client.createSynthetic(syn);
      return res.public_id;
    }
  }

  async function pushSLO(slo: SLO) {
    const existing = slos.find(d => d.name == slo.name);

    if (existing) {
      existing.seen = true;
      console.log(` - Updating ${slo.name}`);
      await client.updateSLO(existing.id, slo);
      return existing.id;
    } else {
      console.log(` - Creating ${slo.name}`);
      const res = await client.createSLO(slo);
      return res.id;
    }
  }

  function addAletGraph(app: App, monitorID: number, monitor: Monitor) {
    app.addWidget("Alert: " + monitor.name, {
      type: "alert_graph",
      alert_id: monitorID.toString(),
      viz_type: "timeseries"
    });
  }

  async function pushMonitors(app: App) {
    let outageMonitorIDs: number[] = [];

    for (const syn of app.synthetics) {
      await pushSynthetic(syn);

      // the api filter doesnt work.
      const syntheticMonitor = (await client.getMonitors()).filter(
        d =>
          d.tags &&
          d.tags.find(t => t == createdbyTag) &&
          d.name == "[Synthetics] " + syn.name
      );

      if (syntheticMonitor.length == 1) {
        outageMonitorIDs.push(syntheticMonitor[0].id);
      }
    }

    var pushedMonitorID: number;
    for (const monitor of app.warningMonitors) {
      pushedMonitorID = await pushMonitor(monitor);

      if (monitor.tags.find(d => d == generateAlertGraphTag)) {
        console.log(" - - Generating Alert Graph for this monitor");
        addAletGraph(app, pushedMonitorID, monitor);
      }
    }

    for (const monitor of app.outageMonitors) {
      pushedMonitorID = await pushMonitor(monitor);
      outageMonitorIDs.push(pushedMonitorID);

      if (monitor.tags.find(d => d == generateAlertGraphTag)) {
        console.log(" - - Generating Alert Graph for this monitor");
        addAletGraph(app, pushedMonitorID, monitor);
      }
    }

    var sloID = "";
    if (outageMonitorIDs.length > 0) {
      sloID = await pushSLO({
        type: "monitor",
        name: `${app.name} SLO`,
        description: `Track the uptime of ${app.name} ` + app.team.slackGroup,
        monitor_ids: outageMonitorIDs,
        thresholds: [{ timeframe: "30d", target: 99.9, warning: 99.95 }],
        tags: [`service:${app.name}`, createdbyTag]
      });

      app.board.widgets.unshift({
        definition: {
          viz: "slo",
          type: "slo",
          slo_id: sloID,
          title: `${app.name} SLO`,
          time_windows: ["30d"],
          show_error_budget: true,
          view_type: "detail",
          view_mode: "overall"
        }
      });
    }
  }

  console.log("Pushing local changes to DataDog...");
  console.time("   ...completed in");
  for (const app of apps.default) {
    if (
      args.argv.name &&
      args.argv.name.toLowerCase() !== app.board.title.toLowerCase()
    ) {
      continue;
    }
    await pushMonitors(app);
    await pushDashboard(app);
  }

  if (!args.argv.name) {
    for (const d of dashboards.filter(d => !d.seen)) {
      console.log(` - Deleting dashboard ${d.title}`);
      await client.deleteDashboard(d.id);
    }

    for (const d of monitors.filter(
      d => !d.seen && !d.name.includes("[Synthetics]")
    )) {
      console.log(` - Deleting monitor ${d.name}`);
      await client.deleteMonitor(d.id);
    }

    for (const d of slos.filter(d => !d.seen)) {
      console.log(` - Deleting slo ${d.name}`);
      await client.deleteSLO(d.id);
    }

    for (const d of synthetics.filter(d => !d.seen)) {
      console.log(` - Deleting synthetic ${d.name}`);
      await client.deleteSynthetic(d.public_id);
    }
  }
  console.timeEnd("   ...completed in");

  console.log("done!");
})();
