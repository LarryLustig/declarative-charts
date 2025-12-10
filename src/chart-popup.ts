import { LitElement, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Popup element that displays HTML content when triggered
 *
 * @element dc-popup
 *
 * @attr {string} trigger - Event that triggers the popup: "hover" or "click" (default: "hover")
 *
 * @example
 * <dc-bar value="25" color="red" label="January">
 *   <dc-popup trigger="hover">
 *     <strong>January Sales</strong><br>
 *     Value: 25<br>
 *     Growth: +15%
 *   </dc-popup>
 * </dc-bar>
 */
@customElement('dc-popup')
export class ChartPopup extends LitElement {
  @property({ type: String })
  trigger = 'hover';

  static styles = css`
    :host {
      display: none !important;
    }
  `;

  get content(): string {
    return this.innerHTML;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-popup': ChartPopup;
  }
}
