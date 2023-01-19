/**
 * Create HTML element, setting classes, other attribures, text, and children.
 * @param  {string} type
 * DOM element type
 * @param  {string[]} classes=[]
 * Classes to apply to element
 * @param  {Object.<string, string>} attributes={}
 * Map of attribute name to value
 * @param  {string} iText=""
 * innerText of element (HTML escaped by browser)
 * @param  {HTMLElement[]} children=[]
 * Array of children
 * @returns {HTMLElement}
 * The created element
 */
export function createElem(type: string, classes?: Array<string>, attributes?: Map<string, string>, iText?: string, children?: Array<HTMLElement>): HTMLElement {
    //Create elem
    let elem = document.createElement(type);
    //Add classes
    if (classes !== undefined) {
        elem.classList.add(...classes);
    }
    //Apply attributes
    if (attributes !== undefined) {
        attributes.forEach((value: string, key: string) => {
            elem.setAttribute(key, value);
        });
    }
    //Inner text
    if (iText !== undefined) {
        elem.innerText = iText;
    }
    //Childten
    if (children != undefined) {
        children.forEach((child) => {
            elem.appendChild(child);
        });
    }
    return elem;
}