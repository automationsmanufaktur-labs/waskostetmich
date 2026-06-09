/**
 * Winziger DOM-Helfer. Bewusst textContent-basiert (kein innerHTML) – die
 * Werte kommen aus fremden Kontoauszügen und könnten HTML enthalten (z.B. DKB
 * packt teils HTML in den Verwendungszweck). So ist XSS ausgeschlossen.
 */

type Attrs = Record<string, string | undefined>
type Child = Node | string | null | undefined | false

export function el(tag: string, attrs: Attrs = {}, ...children: Child[]): HTMLElement {
  const node = document.createElement(tag)
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null) continue
    if (k === 'class') node.className = v
    else node.setAttribute(k, v)
  }
  for (const c of children) {
    if (c == null || c === false) continue
    node.append(typeof c === 'string' ? document.createTextNode(c) : c)
  }
  return node
}

export function clear(node: HTMLElement): void {
  node.replaceChildren()
}
