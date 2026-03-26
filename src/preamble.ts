declare global {
  interface Window {
    __vite_plugin_react_preamble_installed__: boolean;
    $RefreshReg$: () => void;
    $RefreshSig$: () => (type: any) => any;
  }
}

window.__vite_plugin_react_preamble_installed__ = true;
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;
export {};
