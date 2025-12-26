import { LitElement } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Bar group element for organizing bars into logical groups
 *
 * This element doesn't render itself - instead it's detected by the parent
 * bar chart which uses it to group bars together and add group labels.
 *
 * @element dc-bar-group
 *
 * @attr {string} label - The label for this group (displayed on the axis)
 *
 * @slot - Contains dc-bar elements that belong to this group
 *
 * @example
 * <dc-chart>
 *   <dc-bar-group label="Group A">
 *     <dc-bar value="10" label="A1" fill="blue"></dc-bar>
 *     <dc-bar value="20" label="A2" fill="blue"></dc-bar>
 *   </dc-bar-group>
 * </dc-chart>
 */
@customElement('dc-bar-group')
export class ChartBarGroup extends LitElement {
  @property({ type: String })
  label = '';

  @property({ type: String, attribute: 'bar-width' })
  barWidth?: string;

  @property({ type: Number })
  gutter?: number;

  protected createRenderRoot() {
    return this;
  }

  render() {
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'dc-bar-group': ChartBarGroup;
  }
}
