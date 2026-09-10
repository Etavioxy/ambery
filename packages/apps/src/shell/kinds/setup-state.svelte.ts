// LLM 首启配置引导的数据状态与动作：
// 只取 llm 相关 schema 节点（与设置面板同一 get_config_schema 投影），
// 提供 provider 选择、新增 provider、key 状态与保存、连通测试。
// 组件（components/setup-modal）只读字段、只调动作；宿主（chat 窗口 / pet 页）只负责挂载。
import type { Bridge, ConfigSchemaNode } from "../../bridge";
import { t } from "../../i18n";

export interface SetupState {
  readonly loading: boolean;
  readonly offline: boolean;
  readonly readOnly: boolean;
  /** llm.active 节点（provider 选择行） */
  readonly activeNode: ConfigSchemaNode | null;
  /** 当前 active 的 provider 名（unconfigured / debug 时为空语义） */
  readonly provider: string;
  /** 当前 provider 的字段节点 */
  readonly providerNodes: ConfigSchemaNode[];
  /** key 环境变量名（形态乙：写应用级 env 文件，config.json 不存 key） */
  readonly envName: string;
  /** 本地端点（base_url 指向本机）→ 无需 key */
  readonly local: boolean;
  readonly testText: string;
  readonly testClass: "" | "ok" | "fail";
  readonly testing: boolean;
  load(): Promise<void>;
  apply(path: string, value: unknown): Promise<boolean>;
  addProvider(name: string): Promise<{ ok: boolean; error?: string }>;
  apiKeyStatus(provider: string): Promise<{ set: boolean; source: string | null }>;
  apiKeySave(provider: string, value: string): Promise<{ ok: boolean; error?: string }>;
  runTest(): Promise<void>;
}

export function createSetupState(bridge: Bridge): SetupState {
  let loading = $state(true);
  let offline = $state(false);
  let readOnly = $state(false);
  let activeNode = $state<ConfigSchemaNode | null>(null);
  let provider = $state("");
  let providerNodes = $state<ConfigSchemaNode[]>([]);
  let envName = $state("");
  let local = $state(false);
  let testText = $state("");
  let testClass = $state<"" | "ok" | "fail">("");
  let testing = $state(false);

  const api: SetupState = {
    get loading() {
      return loading;
    },
    get offline() {
      return offline;
    },
    get readOnly() {
      return readOnly;
    },
    get activeNode() {
      return activeNode;
    },
    get provider() {
      return provider;
    },
    get providerNodes() {
      return providerNodes;
    },
    get envName() {
      return envName;
    },
    get local() {
      return local;
    },
    get testText() {
      return testText;
    },
    get testClass() {
      return testClass;
    },
    get testing() {
      return testing;
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

      const llmNodes = resp.nodes.filter((n) => n.path === "llm" || n.path.startsWith("llm."));
      activeNode = llmNodes.find((n) => n.path === "llm.active") ?? null;
      const active = String(activeNode?.value ?? "");
      provider = active;
      // provider 字段只在真实 provider 下渲染（unconfigured / debug 没有 providers.<name>.*）
      if (active && active !== "unconfigured" && active !== "debug") {
        const prefix = `llm.providers.${active}.`;
        providerNodes = llmNodes.filter((n) => n.path.startsWith(prefix));
        envName = String(llmNodes.find((n) => n.path === `${prefix}api_key_env`)?.value ?? "");
        const baseUrl = String(llmNodes.find((n) => n.path === `${prefix}base_url`)?.value ?? "");
        local = /localhost|127\.0\.0\.1|::1/i.test(baseUrl);
      } else {
        providerNodes = [];
        envName = "";
        local = false;
      }
    },

    async apply(path, value) {
      try {
        const r = await bridge.setConfig!(path, value);
        if (r.ok) await api.load(); // 值归一后重绘 llm 区
        return r.ok;
      } catch {
        return false;
      }
    },

    async addProvider(name) {
      const r = await bridge.setConfig!(`llm.providers.${name}`, {
        base_url: "",
        model: "",
        // 统一 key 变量名约定：AMBERY_<PROVIDER>_API_KEY（大写）
        api_key_env: `AMBERY_${name.toUpperCase()}_API_KEY`,
      });
      if (r.ok) await api.load(); // 新 provider 进下拉选项
      return { ok: r.ok, error: r.error };
    },

    async apiKeyStatus(p) {
      const r = await bridge.getApiKeyStatus!(p);
      return { set: r.set, source: r.source };
    },

    async apiKeySave(p, value) {
      const r = await bridge.setApiKey!(p, value);
      return { ok: r.ok, error: r.error };
    },

    async runTest() {
      testing = true;
      testText = "…";
      testClass = "";
      try {
        const r = await bridge.testLlm!();
        if (r.ok) {
          testText = t("setup.ok");
          testClass = "ok";
        } else {
          testText = t("setup.fail", { error: r.error ?? "" });
          testClass = "fail";
        }
      } catch {
        testText = t("setup.fail", { error: "?" });
        testClass = "fail";
      } finally {
        testing = false;
      }
    },
  };

  return api;
}
