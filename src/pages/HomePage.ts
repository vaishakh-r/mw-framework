import { pageOf } from '../core/BasePage';
import { homeLocators } from '../locators/home';

export class HomePage extends pageOf(homeLocators) {
  async openProfile() {
    await this.loc.profileTab.tap();
  }
}
