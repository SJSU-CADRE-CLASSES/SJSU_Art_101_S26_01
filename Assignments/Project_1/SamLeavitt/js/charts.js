/**
 * Charts entry: init on DOM ready.
 */

import { init } from './chartUI.js';

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
