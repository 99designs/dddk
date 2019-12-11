import * as api from "./src/api";
import { descriptionTag } from "./src/app";
import bastion from "./99designs/apps/bastion";

const client = new api.Client(
  process.env["DD_API_KEY"],
  process.env["DD_APP_KEY"]
);

(async () => {
  const dashboards = (await client.getDashboards()).filter(
    d => d.description && d.description.includes(descriptionTag)
  );

  console.log(dashboards);

  const existing = dashboards.find(d => d.title == bastion.component.title);

  console.log(await client.updateDashboard(existing.id, bastion.component));
})();
