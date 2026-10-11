import { pageOf } from '../core/BasePage';
import { profileLocators } from '../locators/profile';

export class ProfilePage extends pageOf(profileLocators) {
  async logout() {
    await this.loc.logout.tap();
  }
}
