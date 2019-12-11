import * as api from "./api";
import { Container, WidgetDefinition, WidgetWrapper } from "./types";

export class Group implements Container, WidgetWrapper {
  type: "wrapper" = "wrapper";
  component: api.Group;

  constructor() {
    this.component = {
      title: "",
      layout_type: "ordered",
      type: "group",
      widgets: []
    };
  }

  addWidget(title: string, widget: WidgetDefinition) {
    if (widget.type === "wrapper") {
      this.component.widgets.push({
        definition: {
          ...widget.component,
          title: title
        }
      });
    } else {
      this.component.widgets.push({
        definition: {
          ...widget,
          title: title
        }
      });
    }
  }
}
