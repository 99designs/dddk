import * as api from "./api";
import got, { Method } from "got";
import log from "./log";

// Most of the datadog api filters dont work or are broken in weird ways.
// this abstracts over the requirements, and most of the time we end up
// fetching the entire collection and filtering ourselves.
// Hopefully in the future these get fixed and we can reduce the amount of
// api traffic by filtering server side.
interface Filter {
  name?: string;
  hasTag?: string;
}

// This is a dumb client that makes the datadog api a little more consistent.
export class Client {
  private readonly apiKey: string;
  private readonly applicationKey: string;

  constructor(apiKey: string, applicationKey: string) {
    this.apiKey = apiKey;
    this.applicationKey = applicationKey;
  }

  async getDashboards(filter: Filter = {}) {
    let res = (
      await this.do<{ dashboards: api.DashboardSummary[] }>(
        "GET",
        "/v1/dashboard",
      )
    ).dashboards;

    if (filter.hasTag) {
      res = res.filter(
        d => d.description && d.description.includes(filter.hasTag),
      );
    }

    return res;
  }

  async createDashboard(dashboard: api.Dashboard): Promise<api.Dashboard> {
    return await this.do<api.Dashboard>("POST", "/v1/dashboard", dashboard);
  }

  async updateDashboard(
    id: string,
    dashboard: api.Dashboard,
  ): Promise<api.Dashboard> {
    return await this.do<api.Dashboard>(
      "PUT",
      `/v1/dashboard/${id}`,
      dashboard,
    );
  }

  async deleteDashboard(id: string): Promise<void> {
    return this.do<void>("DELETE", `/v1/dashboard/${id}`);
  }

  async getMonitors(filter: Filter = {}): Promise<api.Monitor[]> {
    let res = await this.do<api.Monitor[]>("GET", "/v1/monitor?per_page=1000");

    if (filter.hasTag) {
      res = res.filter(d => d.tags && d.tags.includes(filter.hasTag));
    }

    if (filter.name) {
      res = res.filter(d => d.name == filter.name);
    }

    return res;
  }

  async createMonitor(monitor: api.Monitor): Promise<api.Monitor> {
    return await this.do<api.Monitor>("POST", `/v1/monitor`, monitor);
  }

  async updateMonitor(id: number, monitor: api.Monitor): Promise<api.Monitor> {
    return await this.do<api.Monitor>("PUT", `/v1/monitor/${id}`, monitor);
  }

  async deleteMonitor(id: number): Promise<void> {
    return this.do<void>("DELETE", `/v1/monitor/${id}`);
  }

  async getSynthetics(filter: Filter = {}): Promise<api.Synthetic[]> {
    let res = (
      await this.do<{ tests: api.Synthetic[] }>("GET", `/v1/synthetics/tests`)
    ).tests;

    if (filter.hasTag) {
      res = res.filter(d => d.tags && d.tags.includes(filter.hasTag));
    }

    if (filter.name) {
      res = res.filter(d => d.name == filter.name);
    }

    return res;
  }

  async createSynthetic(syn: api.Synthetic): Promise<api.Synthetic> {
    return await this.do<api.Synthetic>("POST", `/v1/synthetics/tests`, syn);
  }

  async updateSynthetic(
    id: string,
    syn: api.Synthetic,
  ): Promise<api.Synthetic> {
    return this.do<api.HttpSynthetic>("PUT", `/v1/synthetics/tests/${id}`, syn);
  }

  async deleteSynthetic(id: string): Promise<void> {
    return this.do<void>("POST", `/v1/synthetics/tests/delete`, {
      public_ids: [id],
    });
  }

  async getSLOs(filter: Filter = {}): Promise<api.SLO[]> {
    const rawRes = await this.do<{
      data: api.SLO[];
      error?: any;
    }>("GET", "/v1/slo?limit=1000");

    if (rawRes.error) {
      throw rawRes.error;
    }

    let res = rawRes.data;

    if (filter.hasTag) {
      res = res.filter(d => d.tags && d.tags.includes(filter.hasTag));
    }

    if (filter.name) {
      res = res.filter(d => d.name == filter.name);
    }

    return res;
  }

  async createSLO(slo: api.SLO): Promise<api.SLO> {
    const res = await this.do<{ data: api.SLO[] }>("POST", `/v1/slo`, slo);
    return res.data[0];
  }

  async updateSLO(id: string, slo: api.SLO): Promise<api.SLO> {
    const res = await this.do<{ data: api.SLO[] }>("PUT", `/v1/slo/${id}`, slo);
    return res.data[0];
  }

  async deleteSLO(id: string): Promise<void> {
    return await this.do<void>("DELETE", `/v1/slo/${id}`);
  }

  private async do<T>(method: Method, url: string, body?: any): Promise<T> {
    log.debug(method, "https://api.datadoghq.com/api" + url);
    try {
      const resp = await got("https://api.datadoghq.com/api" + url, {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "github.com/99designs/dddk",
          "DD-API-KEY": this.apiKey,
          "DD-APPLICATION-KEY": this.applicationKey,
        },
        method: method,
        timeout: 20000,
        body: body ? JSON.stringify(body, null, " ") : undefined,
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
