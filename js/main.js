// ---------------------------------------------------------------------------
// MAIN — wires clicks to game actions, saves after every action, re-renders.
// ---------------------------------------------------------------------------
(() => {
  const game = new WL.Game();
  game.load();                 // resume a saved run if there is one
  WL.UI.init(game);
  WL.UI.render();

  // UI-only actions that don't touch game state.
  const uiActions = {
    skipCombat: () => WL.UI.skip(),
  };

  // Actions that need a confirmation first.
  const confirmFirst = {
    abandon: () => !game.state || ['gameover', 'victory'].includes(game.state.screen.type)
      || confirm('Abandon this run? Your character will be lost.'),
  };

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const { action, arg } = el.dataset;

    if (uiActions[action]) return uiActions[action](arg);
    if (confirmFirst[action] && !confirmFirst[action]()) return;
    if (typeof game[action] !== 'function') { console.warn('Unknown action', action); return; }

    const before = game.state && game.state.screen;
    game[action](arg);
    game.save();
    WL.UI.render();
    if (!game.state || game.state.screen !== before) window.scrollTo({ top: 0 });
  });

  // Handy for debugging in the browser console: WL.game.state, WL.game.stats(), etc.
  WL.game = game;
})();
