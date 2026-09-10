// 引导 modal 的挂载点：两处宿主（chat 窗口 / pet 页浏览器模式）都调 openSetupModal(bridge)，
// 返回值是关闭函数（宿主在面板关闭时一并收起）。组件挂在 document.body 上的一次性容器里，
// 关闭即卸载并移走容器，不留残留节点。
import { mount, unmount } from "svelte";
import type { Bridge } from "../../bridge";
import { createSetupState } from "../../shell/kinds/setup-state.svelte";
import SetupModal from "./SetupModal.svelte";

export function openSetupModal(bridge: Bridge): () => void {
  const target = document.createElement("div");
  document.body.append(target);
  const setup = createSetupState(bridge);

  let dismissed = false;
  const dismiss = () => {
    if (dismissed) return;
    dismissed = true;
    void unmount(component);
    target.remove();
  };

  const component = mount(SetupModal, { target, props: { setup, onClose: dismiss } });
  return dismiss;
}
