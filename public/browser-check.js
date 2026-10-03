// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
//
// A word for a browser too old for Klassenplan, instead of a blank page.
//
// The app needs Chrome or Edge 111, Safari 16.4 or Firefox 128 — what
// Tailwind CSS 4 requires, and the bundle is built for current browsers only.
// Interactive whiteboards often run Android 8 to 11 with a built-in browser
// that is rarely updated: there the page stayed empty or unstyled, with no
// explanation. This file loads as a classic script beside the app's module
// (the CSP allows no inline script) and is written in ES5, so it runs in
// exactly the browsers it is meant for. `color-mix()` and
// `CSS.registerProperty` mark the versions above.
//
// The texts cannot come from the app's translations, which load with the
// bundle that may not run here; German unless the address starts with /en,
// as the app decides.
(function () {
  var css = window.CSS;
  var supported =
    !!css &&
    typeof css.supports === 'function' &&
    css.supports('color', 'color-mix(in srgb, red, red)') &&
    typeof css.registerProperty === 'function';
  if (supported) return;

  var english = /^\/en(\/|$)/.test(window.location.pathname);
  var text = english
    ? 'This browser is too old for Klassenplan. Please use a current one: ' +
      'Chrome or Edge from version 111, Safari from 16.4 or Firefox from 128. ' +
      'On an interactive whiteboard, Chrome or Edge on its built-in PC usually helps.'
    : 'Dieser Browser ist zu alt für Klassenplan. Bitte nutze einen aktuellen: ' +
      'Chrome oder Edge ab Version 111, Safari ab 16.4 oder Firefox ab 128. ' +
      'An einer digitalen Tafel hilft meist Chrome oder Edge auf dem eingebauten PC.';
  var closeLabel = english ? 'Close' : 'Schließen';

  function show() {
    var banner = document.createElement('div');
    banner.setAttribute('role', 'alert');
    var style = banner.style;
    style.position = 'fixed';
    style.top = '0';
    style.left = '0';
    style.right = '0';
    style.zIndex = '2147483647';
    style.padding = '16px 56px 16px 20px';
    style.background = '#17181a';
    style.color = '#ffffff';
    style.font = '16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif';

    var message = document.createElement('p');
    message.style.margin = '0';
    message.appendChild(document.createTextNode(text));
    banner.appendChild(message);

    var close = document.createElement('button');
    close.setAttribute('type', 'button');
    close.setAttribute('aria-label', closeLabel);
    close.appendChild(document.createTextNode('×'));
    var closeStyle = close.style;
    closeStyle.position = 'absolute';
    closeStyle.top = '8px';
    closeStyle.right = '8px';
    closeStyle.width = '44px';
    closeStyle.height = '44px';
    closeStyle.border = '0';
    closeStyle.background = 'transparent';
    closeStyle.color = '#ffffff';
    closeStyle.fontSize = '28px';
    closeStyle.cursor = 'pointer';
    close.onclick = function () {
      banner.parentNode.removeChild(banner);
    };
    banner.appendChild(close);

    document.body.appendChild(banner);
  }

  if (document.body) {
    show();
  } else {
    document.addEventListener('DOMContentLoaded', show);
  }
})();
