/**
 * These are the raw types expected by the datadog api, and a client for interacting with it.
 */

import got, { Method } from "got";

export class Client {
  private readonly apiKey: string;
  private readonly applicationKey: string;

  constructor(apiKey: string, applicationKey: string) {
    this.apiKey = apiKey;
    this.applicationKey = applicationKey;
  }

  async getDashboards() {
    const res = await this.do<{ dashboards: DashboardSummary[] }>(
      "GET",
      "/v1/dashboard"
    );
    return res.dashboards;
  }

  async createDashboard(dashboard: Dashboard) {
    return this.do<any>("POST", "/v1/dashboard", dashboard);
  }

  async updateDashboard(id: string, dashboard: Dashboard) {
    return this.do<any>("PUT", `/v1/dashboard/${id}`, dashboard);
  }

  private async do<T>(method: Method, url: string, body?: any): Promise<T> {
    try {
      const resp = await got("https://api.datadoghq.com/api" + url, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "github.com/99designs/ddac",
          "DD-API-KEY": this.apiKey,
          "DD-APPLICATION-KEY": this.applicationKey
        },
        method: method,
        body: body ? JSON.stringify(body, null, " ") : undefined
      });
      return JSON.parse(resp.body) as T;
    } catch (error) {
      if (error.response && error.response.body) {
        throw "error calling datadog api: " + error.response.body;
      } else {
        throw error;
      }
    }
  }
}

export interface TimeSeries {
  type: "timeseries";
  requests: (Request | ApmRequest)[];
  yaxis?: Axis;
  events?: Event[];
  markers?: Marker[];
  title?: string;
}

export interface Group {
  type: "group";
  layout_type: "ordered";
  title?: string;
  widgets: Widget[];
}

export type WidgetDefinition = TimeSeries | Group;

export interface Widget {
  definition: WidgetDefinition;
  id?: number;
  layout?: Layout;
}

export interface Layout {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Request {
  q: string;
  style?: Style;
  metadata?: Metadata;
  display_type?: "area" | "bars" | "line";
}

export interface ApmRequest {
  apm_query: ApmQuery;
  style?: Style;
  metadata?: Metadata;
  display_type?: "area" | "bars" | "line";
}

export interface ApmQuery {
  index: string;
  search: {
    query: string;
  };
  group_by: [
    {
      facet: string;
      limit: number;
      sort: {
        order: string;
        aggregation: string;
      };
    }
  ];
  compute: {
    aggregation: string;
  };
}

export interface Event {
  q: string;
}

export interface Style {
  palette?: "purple" | "dog_classic" | "cool" | "warm" | "orange" | "grey";
  line_type?: "dashed" | "dotted" | "solid";
  line_width?: "normal" | "thick" | "thin";
}

export interface Metadata {
  expression: string;
  alias_name?: string;
}

export interface Marker {
  value: string;
  display_type?: string;
  label?: string;
}

export interface Axis {
  scale?: string;
  min?: number;
  max?: number;
  include_zero?: boolean;
}

export interface Dashboard {
  id?: string;
  title: string;
  widgets: Widget[];
  layout_type: "ordered" | "free";
  description?: string;
  is_read_only?: boolean;
  notify_list?: string[];
  template_variables?: TemplateVariable[];
}

export interface TemplateVariable {
  name: string;
  default?: string;
  prefix?: string;
}

export interface DashboardSummary {
  created_at: string;
  is_read_only: boolean;
  description: string;
  title: string;
  url: string;
  layout_type: string;
  modified_at: string;
  author_handle: string;
  id: string;
}
