import { pageOf } from '../core/BasePage';
import { tabBarLocators } from '../locators/tabBar';

export class TabBarPage extends pageOf(tabBarLocators) {
  async openHome() {
    await this.loc.home.tap();
  }

  async openWebview() {
    await this.loc.webview.tap();
  }

  async openLogin() {
    await this.loc.login.tap();
  }

  async openForms() {
    await this.loc.forms.tap();
  }

  async openSwipe() {
    await this.loc.swipe.tap();
  }

  async openDrag() {
    await this.loc.drag.tap();
  }
}
