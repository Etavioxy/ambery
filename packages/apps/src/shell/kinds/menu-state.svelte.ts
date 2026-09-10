// Menu（托盘设置面板）的数据状态与动作：schema 拉取与分组、写值、provider key、主题分享。
// 宿主接线（隐藏窗口、脚部动作、config effect 监听）在 ./menu.ts；面板组件只读这里的字段、
// 只调这里的动作。
import type { Bridge, ConfigSchemaNode } from "../../bridge";
import * as actions from "../../tauri_runtime_actions";
import { t } from "../../i18n";

export type MenuStatusClass = "ok" | "err" | "warn" | "";

export interface MenuGroup {
  /** 顶层标量组用 "__top"（不渲染组标题） */
  name: string;
  nodes: ConfigSchemaNode[];
}

/** provider key 行：插在 llm 组末尾（与 llm.providers.<name>.api_key_env 节点对应） */
export interface MenuApiKeyRow {
  /** 该行所属的分组名（"llm"） */
  group: string;
  provider: string;
  envName: string;
  /** 本地端点（base_url 指向本机）→ 不需要 key */
  local: boolean;
}

export interface MenuState {
  readonly loading: boolean;
  /** schema 拉取失败：core 不可达 */
  readonly offline: boolean;
  readonly readOnly: boolean;
  readonly loadError: string | null;
  readonly restartRequired: string[];
  readonly groups: MenuGroup[];
  readonly pools: { system: Record<string, unknown>; user: Record<string, unknown> };
  readonly apiKeyRows: MenuApiKeyRow[];
  readonly status: { text: string; cls: MenuStatusClass };
  /** 当前主题名（导出用） */
  readonly theme: string;
  load(): Promise<void>;
  setStatus(text: string, cls: MenuStatusClass): void;
  /** 写值：settle 后返回是否被 core 接受（行组件据此显错误态） */
  apply(path: string, value: unknown): Promise<boolean>;
  apiKeyStatus(provider: string): Promise<{ set: boolean; source: string | null }>;
  apiKeySave(provider: string, value: string): Promise<{ ok: boolean; error?: string }>;
  exportTheme(): Promise<{ ok: boolean; path?: string; error?: string }>;
  importTheme(file: string): Promise<{ ok: boolean; name?: string; error?: string }>;
}

export function createMenuState(bridge: Bridge): MenuState {
  let loading = $state(true);
  let offline = $state(false);
  let readOnly = $state(false);
  let loadError = $state<string | null>(null);
  let restartRequired = $state<string[]>([]);
  let groups = $state<MenuGroup[]>([]);
  let pools = $state<{ system: Record<string, unknown>; user: Record<string, unknown> }>({
    system: {},
    user: {},
  });
  let apiKeyRows = $state<MenuApiKeyRow[]>([]);
  let status = $state<{ text: string; cls: MenuStatusClass }>({ text: "", cls: "" });
  let theme = $state("dark");

  const api: MenuState = {
    get loading() {
      return loading;
    },
    get offline() {
      return offline;
    },
    get readOnly() {
      return readOnly;
    },
    get loadError() {
      return loadError;
    },
    get restartRequired() {
      return restartRequired;
    },
    get groups() {
      return groups;
    },
    get pools() {
      return pools;
    },
    get apiKeyRows() {
      return apiKeyRows;
    },
    get status() {
      return status;
    },
    get theme() {
      return theme;
    },

    setStatus(text, cls) {
      status = { text, cls };
    },

    async load() {
      let resp;
      try {
        resp = await bridge.getConfigSchema!();
      } catch {
        offline = true;
        loading = false;
        return;
      }
      offline = false;
      loading = false;
      readOnly = resp.readOnly;
      loadError = resp.loadError ?? null;
      restartRequired = resp.restartRequired ?? [];

      // 按 path 前缀分组：顶层标量一组（__top），llm.* / kaomoji.* 各一组
      const map = new Map<string, ConfigSchemaNode[]>();
      for (const n of resp.nodes) {
        const g = n.path.includes(".") ? n.path.split(".")[0] : "__top";
        if (!map.has(g)) map.set(g, []);
        map.get(g)!.push(n);
      }
      groups = [...map.entries()]
        .sort(([a], [b]) => (a === "__top" ? -1 : b === "__top" ? 1 : a.localeCompare(b)))
        .map(([name, nodes]) => ({ name, nodes }));

      // 表情两池当前值（map 节点携带完整 map）：池间原子移动要构造整节点写入
      const nodeValue = (path: string): Record<string, unknown> =>
        ({ ...((resp.nodes.find((n) => n.path === path)?.value ?? {}) as Record<string, unknown>) });
      pools = { system: nodeValue("kaomoji.system"), user: nodeValue("kaomoji.user") };

      // provider key 行：只对 llm.providers.<name>.api_key_env 存在者生成；
      // 本地端点判定用 base_url（远程 provider 清除 key 后 api_key_env 也是 null，不能用它判）
      const envNodes = resp.nodes.filter((n) => /^llm\.providers\.[^.]+\.api_key_env$/.test(n.path));
      apiKeyRows = envNodes.map((n) => {
        const provider = n.path.split(".")[2];
        const baseUrl = String(
          resp.nodes.find((m) => m.path === `llm.providers.${provider}.base_url`)?.value ?? "",
        );
        return {
          group: "llm",
          provider,
          envName: String(n.value ?? ""),
          local: /localhost|127\.0\.0\.1|::1/i.test(baseUrl),
        };
      });

      theme = String(resp.nodes.find((n) => n.path === "theme")?.value ?? "dark");
    },

    async apply(path, value) {
      api.setStatus("…", "");
      try {
        const resp = await bridge.setConfig!(path, value);
        if (!resp.ok) {
          api.setStatus(`✗ ${resp.error}`, "err");
          return false;
        }
        const rr = resp.restartRequired as string[] | undefined;
        if (rr?.length) {
          api.setStatus(t("menu.need-restart", { paths: rr.join(",") }), "warn");
        } else {
          api.setStatus("✓", "ok");
        }
        // 热刷新（值归一后重读 schema）
        setTimeout(() => void api.load(), 300);
        return true;
      } catch (e) {
        api.setStatus(`✗ ${e}`, "err");
        return false;
      }
    },

    async apiKeyStatus(provider) {
      const r = await bridge.getApiKeyStatus!(provider);
      return { set: r.set, source: r.source };
    },

    async apiKeySave(provider, value) {
      const r = await bridge.setApiKey!(provider, value);
      return { ok: r.ok, error: r.error };
    },

    async exportTheme() {
      return await actions.exportTheme(api.theme);
    },

    async importTheme(file) {
      const r = await actions.importTheme(file);
      if (r.ok) setTimeout(() => void api.load(), 300);
      return r;
    },
  };

  return api;
}
