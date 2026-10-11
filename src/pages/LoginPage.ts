import { pageOf } from '../core/BasePage';
import { loginLocators } from '../locators/login';

export class LoginPage extends pageOf(loginLocators) {
  async enterEmail(email: string) {
    await this.loc.email.fill(email);
  }

  async enterPassword(password: string) {
    await this.loc.password.fill(password);
  }

  async submit() {
    await this.loc.submit.tap();
  }

  async login(user: string, pass: string) {
    await this.enterEmail(user);
    await this.enterPassword(pass);
    await this.submit();
  }
}
