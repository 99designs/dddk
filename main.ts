import { Client } from "./src";
import { Syncer } from "./src/syncer";
import * as yargs from "yargs";
import * as fs from "fs";

const args = yargs
  .command("push", "push datadog dashboards up")
  .option("name", {
    type: "string",
    description: "only push the matching app name",
  })
  .demandCommand();

if (!process.env["DD_API_KEY"] || !process.env["DD_APP_KEY"]) {
  console.error(
    "MISSING API KEYS - run again using \n" +
      "  aws-vault exec platform -- chamber exec dddk -- npm run sync\n\n",
  );
  process.exit(1);
}

console.log(`Parsing local apps...`);
console.time("   ...completed in");
const apps = require(process.cwd() + "/src/apps.ts");
console.timeEnd("   ...completed in");

(async () => {
  const client = new Client(
    process.env["DD_API_KEY"],
    process.env["DD_APP_KEY"],
  );

  const lock = JSON.parse(
    fs.readFileSync(process.cwd() + "/lock.json").toString(),
  );

  console.log(`Fetching data from DataDog...`);
  console.time("   ...completed in");
  const syncer = await Syncer.create(client, lock);

  console.timeEnd(`   ...completed in`);

  console.log("Pushing local changes to DataDog...");
  console.time("   ...completed in");

  for (const app of apps.default) {
    if (
      args.argv.name &&
      args.argv.name.toLowerCase() !== app.board.title.toLowerCase()
    ) {
      continue;
    }

    let outageMonitorIDs: number[] = [];

    for (const syn of app.synthetics) {
      await syncer.syncSynthetic(syn);

      const syntheticMonitor = await client.getMonitors({
        name: "[Synthetics] " + syn.name,
      });

      if (syntheticMonitor.length == 1) {
        outageMonitorIDs.push(syntheticMonitor[0].id);
      }
    }

    for (const monitor of app.warningMonitors) {
      await syncer.syncMonitor(monitor);
    }

    for (const monitor of app.outageMonitors) {
      outageMonitorIDs.push(await syncer.syncMonitor(monitor));
    }

    let sloID = "";
    if (outageMonitorIDs.length > 0) {
      sloID = await syncer.syncSLO({
        type: "monitor",
        name: `${app.name} SLO`,
        description: `Track the uptime of ${app.name} ` + app.team.slackGroup,
        monitor_ids: outageMonitorIDs,
        thresholds: [{ timeframe: "30d", target: 99.9, warning: 99.95 }],
        tags: [`service:${app.name}`],
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
          view_mode: "overall",
        },
      });
    }

    await syncer.syncDashboard(app.board);
  }

  if (!args.argv.name) {
    await syncer.deleteUnseen();
  }

  fs.writeFileSync(
    process.cwd() + "/lock.json",
    JSON.stringify(syncer.lock, null, 2),
  );

  console.timeEnd("   ...completed in");
  console.log(`Object statstics =`, syncer.stats);
})();
