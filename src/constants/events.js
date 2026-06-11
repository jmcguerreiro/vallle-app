/**
 * App-wide custom DOM event names, dispatched on `window`.
 */
export const EVENTS = {
  // Fired by Modal right after `dialog.showModal()`. The dialog enters the
  // browser top layer above any open popovers (toasts, confetti), so they
  // listen for this to re-promote themselves back on top.
  MODAL_OPENED: "vallle:modal-opened",
};
