import * as api from "./src/api";
import { descriptionTag } from "./src/app";
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

  console.log(dashboards);

  const existing = dashboards.find(d => d.title == spa.component.title);

  console.log(await client.updateDashboard(existing.id, spa.component));
})();
