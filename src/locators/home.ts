import { screenLocators } from './define';

export const homeLocators = screenLocators({
  anchor:     { testId: 'home-screen' },
  welcome:    { testId: 'home-welcome' },
  profileTab: { label: 'Profile', ios: { role: 'tab', name: 'Profile' } }, // iOS tab bar
});
