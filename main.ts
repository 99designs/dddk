import * as api from "./src/api";
import { App, descriptionTag } from "./src/app";
import bastion from "./99designs/apps/bastion";
import spa from "./99designs/apps/spa";

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
      return await client.updateDashboard(existing.id, app.component);
    } else {
      console.log(`Creating new dashboard for ${app.component.title}`);
      return await client.createDashboard(app.component);
    }
  }

  await push(bastion);
  await push(spa);
  console.log("done!");
})();
