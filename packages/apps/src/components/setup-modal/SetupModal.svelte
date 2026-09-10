<!-- 二级业务组件：LLM 首启配置引导 modal（docs/llm-setup.md）。
     从 Chat 打开；内容 = llm.active 行（含「新增 provider」）+ 当前 provider 字段 + key 行 + 连通测试。
     schema 驱动，不手写表单；数据与动作都从 setup 状态来。 -->
<script lang="ts">
  import { onMount } from "svelte";
  import { t } from "../../i18n";
  import type { SetupState } from "../../shell/kinds/setup-state.svelte";
  import Dialog from "../../widgets/dialog/Dialog.svelte";
  import ApiKeyRow from "../config-rows/ApiKeyRow.svelte";
  import ConfigRow from "../config-rows/ConfigRow.svelte";

  let {
    setup,
    onClose = null,
  }: { setup: SetupState; onClose?: (() => void) | null } = $props();

  let open = $state(true);

  /** provider 名义约定：小写字母开头，仅小写字母/数字/_/-（与 core 的 config path 语法一致） */
  const addEnum = {
    label: "新增 provider（小写字母开头，仅小写/数字/_/-）",
    validate: (v: string) =>
      /^[a-z][a-z0-9_-]*$/.test(v) ? null : "名称不合法：小写字母开头，仅小写字母/数字/_/-",
    onConfirm: (name: string) => setup.addProvider(name),
  };

  onMount(() => {
    // 打开即自动检测一次（key 状态 = test_llm 结果）
    void setup.load().then(() => setup.runTest());
  });
</script>

<Dialog bind:open {onClose}>
  {#if setup.offline}
    <div class="err">{t("menu.offline")}</div>
  {:else if !setup.loading}
    {#if setup.activeNode}
      <ConfigRow
        node={setup.activeNode}
        readOnly={setup.readOnly}
        applyValue={setup.apply}
        enumAdd={addEnum}
      />
    {/if}
    {#each setup.providerNodes as node (node.path)}
      <ConfigRow {node} readOnly={setup.readOnly} applyValue={setup.apply} />
    {/each}
    {#if setup.provider && setup.provider !== "unconfigured" && setup.provider !== "debug"}
      <!-- key 行：保存成功后自动重跑连通测试（Q6a 定案） -->
      <ApiKeyRow
        provider={setup.provider}
        envName={setup.envName}
        local={setup.local}
        readOnly={setup.readOnly}
        loadStatus={setup.apiKeyStatus}
        save={setup.apiKeySave}
        onChanged={() => void setup.runTest()}
      />
    {/if}
    <div class="setup-test-status {setup.testClass}">{setup.testText}</div>
    <button
      class="setup-test-btn"
      type="button"
      disabled={setup.testing}
      onclick={() => void setup.runTest()}
    >{t("setup.test")}</button>
  {/if}
</Dialog>

<style>
  .setup-test-status {
    margin-top: 10px;
    font-size: 12px;
  }
  .setup-test-status.ok {
    color: var(--ov-ok);
  }
  .setup-test-status.fail {
    color: var(--ov-error);
  }
  .setup-test-btn {
    margin-top: 8px;
    background: var(--ov-accent-bg);
    border: 1px solid var(--ov-accent-border);
    border-radius: var(--ov-control-radius);
    color: var(--ov-accent);
    cursor: pointer;
    font-size: 12px;
    padding: 3px 12px;
  }
</style>
