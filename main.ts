import * as api from "./src/api";
import { App, descriptionTag } from "./src/app";
import * as yargs from "yargs";
import * as path from "path";

const args = yargs
  .command("push <apps>", "push datadog dashboards up")
  .option("name", {
    type: "string",
    description: "only push the matching app name"
  })
  .demandCommand();

const appFile = path.resolve(args.argv.apps as string);
const apps = require(appFile);

if (!process.env["DD_API_KEY"] || !process.env["DD_APP_KEY"]) {
  console.error(
    "MISSING API KEYS - run again using \n" +
      "  aws-vault exec platform -- chamber exec ddac -- npm run sync\n\n"
  );
  process.exit(1);
}

const client = new api.Client(
  process.env["DD_API_KEY"],
  process.env["DD_APP_KEY"]
);

(async () => {
  const dashboards = (await client.getDashboards()).filter(
    d => d.description && d.description.includes(descriptionTag)
  );

  async function push(app: App) {
    const existing = dashboards.find(d => d.title == app.component.title);

    if (existing) {
      console.log(`Updating existing dashboard for ${app.component.title}`);
      await client.updateDashboard(existing.id, app.component);
      console.log(" - https://app.datadoghq.com/dashboard/" + existing.id);
    } else {
      console.log(`Creating new dashboard for ${app.component.title}`);
      const board = await client.createDashboard(app.component);
      console.log(" - https://app.datadoghq.com/dashboard/" + board.id);
    }
  }

  for (const app of apps.default) {
    if (
      args.argv.name &&
      args.argv.name.toLowerCase() !== app.component.title.toLowerCase()
    ) {
      continue;
    }
    await push(app);
  }
  console.log("done!");
})();
