/** Minimal element factories. Everything is built with the DOM API, never HTML strings. */

type Attributes = Record<string, string | number | boolean | null | undefined>;
type Child = Node | string | null | undefined;
type Children = Child | Child[];

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

function applyAttributes(node: Element, attributes: Attributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(name, value === true ? '' : String(value));
  }
}

function appendChildren(node: Element, children: Children): void {
  for (const child of Array.isArray(children) ? children : [children]) {
    if (child === null || child === undefined) continue;
    node.append(typeof child === 'string' ? document.createTextNode(child) : child);
  }
}

/** Creates an HTML element with attributes and children. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: Children = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  applyAttributes(node, attributes);
  appendChildren(node, children);
  return node;
}

/** Creates an SVG element in the correct namespace. */
export function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Attributes = {},
  children: Children = [],
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NAMESPACE, tag);
  applyAttributes(node, attributes);
  appendChildren(node, children);
  return node;
}

/** Replaces a container's contents in one shot. */
export function replaceChildren(node: Element, children: Children): void {
  node.replaceChildren();
  appendChildren(node, children);
}

/** A paragraph used as a shared empty / no-data state. */
export function emptyState(message: string): HTMLParagraphElement {
  return el('p', { class: 'empty', role: 'note' }, [message]);
}
