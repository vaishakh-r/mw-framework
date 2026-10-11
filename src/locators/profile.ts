import { screenLocators } from './define';

export const profileLocators = screenLocators({
  anchor: { testId: 'profile-screen' },
  email:  { testId: 'profile-email' },
  logout: { testId: 'profile-logout' },
});
