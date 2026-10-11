import { screenLocators } from './define';

export const tabBarLocators = screenLocators({
  anchor:  { role: 'button', name: 'Home' },
  home:    { role: 'button', name: 'Home' },
  webview: { role: 'button', name: 'Webview' },
  login:   { role: 'button', name: 'Login' },
  forms:   { role: 'button', name: 'Forms' },
  swipe:   { role: 'button', name: 'Swipe' },
  drag:    { role: 'button', name: 'Drag' },
});
