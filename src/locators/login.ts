import { screenLocators } from './define';

export const loginLocators = screenLocators({
  anchor:        { testId: 'Login-screen' },
  email:         { testId: 'input-email' },
  password:      { testId: 'input-password' },
  submit:        { testId: 'button-LOGIN' },
  // TODO(gap): needs testID `login-email-error`
  emailError:    { text: 'Please enter a valid email address', exact: true },
  // TODO(gap): needs testID `login-password-error`
  passwordError: { text: 'Please enter at least 8 characters', exact: true },
  // TODO(gap): the app has no generic login error element; mapped to the email error until one exists
  error:         { text: 'Please enter a valid email address', exact: true },
});
