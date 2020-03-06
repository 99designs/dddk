#! /usr/bin/env node

import { App, Client } from "./src";
import { LockFile, Syncer } from "./src/syncer";
import * as yargs from "yargs";
import * as fs from "fs";
import * as glob from "glob";
import * as path from "path";
import { register } from "ts-node";
import log from "./src/log";

register();

if (!process.env["DD_API_KEY"] || !process.env["DD_APP_KEY"]) {
  console.error("DD_API_KEY and DD_APP_KEY must be set");
  process.exit(1);
}

yargs
  .command(
    "push",
    "push datadog dashboards up",
    yargs => {
      yargs
        .option("name", {
          type: "string",
          description: "only push the matching app name",
        })
        .positional("source", {
          describe: "glob to locate all apps",
          default: "src/apps/*.ts",
        });
    },
    async (argv: any) => {
      log.info(`Parsing local apps...`);
      console.time("   ...completed in");

      const apps: App[] = [];

      for (const appfile of glob.sync(argv.source)) {
        const app = require(path.join(process.cwd(), appfile)).default;

        if (!(app instanceof App)) {
          console.error(
            `${appfile} does not have a default export extending App`,
          );
          process.exit(1);
        }
        apps.push(app);
      }

      console.timeEnd("   ...completed in");

      const client = new Client(
        process.env["DD_API_KEY"],
        process.env["DD_APP_KEY"],
      );

      const lockFile = process.cwd() + "/lock.json";

      let lock: LockFile = {
        monitors: {},
        dashboards: {},
        synthetics: {},
        slos: {},
      };
      if (fs.existsSync(lockFile)) {
        log.info(`reading lock from ${lockFile}`)
        lock = JSON.parse(fs.readFileSync(lockFile).toString());
      }

      log.info(`Fetching data from DataDog...`);
      console.time("   ...completed in");
      const syncer = await Syncer.create(client, lock);

      console.timeEnd(`   ...completed in`);

      log.info("Pushing local changes to DataDog...");
      console.time("   ...completed in");

      for (const app of apps) {
        if (
          argv.name &&
          argv.name.toLowerCase() !== app.board.title.toLowerCase()
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
            description:
              `Track the uptime of ${app.name} ` + app.team.warningContact,
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

      if (!argv.name) {
        await syncer.deleteUnseen();
      }

      fs.writeFileSync(lockFile, JSON.stringify(syncer.lock, null, 2));

      console.timeEnd("   ...completed in");
      log.info(`stats =`, JSON.stringify(syncer.stats, null, 2));
    },
  )
  .demandCommand(1, "Must specify a command, did you mean dddk push?").argv;
