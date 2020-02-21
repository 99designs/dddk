import * as api from "./src/api";
import { App, descriptionTag, createdbyTag } from "./src/app";
import * as yargs from "yargs";
import * as path from "path";
import { Monitor, SLO, Synthetic } from "./src/api";
import * as fs from "fs";

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
      if (await client.updateDashboard(existing.id, app.board)) {
        console.log(` - Updated dashboard ${app.board.title}`);
      }
    } else {
      client.createDashboard(app.board);
      console.log(` - Created dashboard ${app.board.title}`);
    }
  }

  async function pushMonitor(monitor: Monitor): Promise<number> {
    const existing = monitors.find(
      d => d.name == monitor.name && d.tags[0] == monitor.tags[0]
    );

    if (existing) {
      existing.seen = true;
      if (await client.updateMonitor(existing.id, monitor)) {
        console.log(` - Updated monitor ${monitor.name}`);
      }
      return existing.id;
    } else {
      const newID = await client.createMonitor(monitor);
      console.log(` - Created monitor ${monitor.name}`);
      return newID;
    }
  }

  async function pushSynthetic(syn: Synthetic): Promise<string> {
    const existing = synthetics.find(
      d => d.name == syn.name && d.tags[0] == syn.tags[0]
    );
    if (existing) {
      existing.seen = true;
      if (await client.updateSynthetic(existing.public_id, syn)) {
        console.log(` - Updated synthetic ${syn.name}`);
      }
      return existing.public_id;
    } else {
      const newPublicID = await client.createSynthetic(syn);
      console.log(` - Created synthetic ${syn.name}`);
      return newPublicID;
    }
  }

  async function pushSLO(slo: SLO): Promise<string> {
    const existing = slos.find(d => d.name == slo.name);

    if (existing) {
      existing.seen = true;
      if (await client.updateSLO(existing.id, slo)) {
        console.log(` - Updated ${slo.name}`);
      }
      return existing.id;
    } else {
      const newID = await client.createSLO(slo);
      console.log(` - Created ${slo.name}`);
      return newID;
    }
  }

  async function pushMonitors(app: App) {
    let outageMonitorIDs: number[] = [];

    for (const syn of app.synthetics) {
      await pushSynthetic(syn);

      // the api filter doesnt work, searching within the api call
      const syntheticMonitor = (
        await client.getMonitors("[Synthetics] " + syn.name)
      ).filter(
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
      pushMonitor(monitor);
    }

    for (const monitor of app.outageMonitors) {
      pushedMonitorID = await pushMonitor(monitor);
      outageMonitorIDs.push(pushedMonitorID);
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
    for (const d of slos.filter(d => !d.seen)) {
      console.log(` - Deleting slo ${d.name}`);
      await client.deleteSLO(d.id);
    }

    for (const d of dashboards.filter(d => !d.seen)) {
      await client.deleteDashboard(d.id);
      console.log(` - Deleted dashboard ${d.title}`);
    }

    for (const d of monitors.filter(
      d => !d.seen && !d.name.includes("[Synthetics]")
    )) {
      await client.deleteMonitor(d.id);
      console.log(` - Deleted monitor ${d.name}`);
    }

    for (const d of synthetics.filter(d => !d.seen)) {
      await client.deleteSynthetic(d.public_id);
      console.log(` - Deleted synthetic ${d.name}`);
    }
  }
  client.saveLock();
  console.timeEnd("   ...completed in");
  console.log(`Object statstics =`, client.stats);
})();
