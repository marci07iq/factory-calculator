
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

export type DropdownEntry = {
    key: string;
    name: string;
    elem: HTMLTableRowElement;
}

export class Dropdown {
    elem_root: HTMLElement;

    elem_input: HTMLInputElement;
    elem_dropdown_one: HTMLTableElement;
    elem_dropdown: HTMLTableElement;
    elem_dropdown_container: HTMLElement;
    
    data: Array<DropdownEntry>;
    selected_elem: DropdownEntry;
    value: string;
    dropdown_active: boolean;
    callback: ((key: string) => void) | undefined;
    
    constructor(data: Array<DropdownEntry>, callback?: (key: string) => void) {
        this.elem_root = createElem("div", ["dropdown-main"], undefined, undefined);

        this.elem_input = createElem("input", ["dropdown-search", "dropdown-toprow"], undefined, undefined, undefined) as HTMLInputElement;
        this.elem_dropdown_one = createElem("table", ["dropdown-selected", "dropdown-toprow"], undefined, undefined) as HTMLTableElement;

        this.elem_dropdown = createElem("table", ["dropdown-list"], undefined, undefined) as HTMLTableElement;
        this.elem_dropdown_container = createElem("div", ["dropdown-list-host"], undefined, undefined, [
            createElem("div", ["dropdown-list-host-inner"], undefined, undefined, [
                this.elem_dropdown
            ])
        ]);
        
        this.data = data;
        this.selected_elem = data[0];
        this.value = this.selected_elem.key;
        this.dropdown_active = false;
        this.callback = callback;

        this.data.forEach((elem) => {
            elem.elem.classList.add("dropdown-entry");
            elem.elem.addEventListener("click", () => {this.select(elem)});
        });
        this.elem_input.addEventListener("input", () => {
            this.search_dropdown(this.elem_input.value);
        });

        this.hide_dropdown();
    }

    hide_dropdown () {
        this.elem_root.innerHTML = "";
        this.elem_dropdown_one.appendChild(this.selected_elem.elem);
        this.elem_root.appendChild(this.elem_dropdown_one);
        this.dropdown_active = false;
    };

    select (elem: DropdownEntry) {
        if(this.dropdown_active) {
            this.selected_elem = elem;
            this.value = elem.key;

            this.hide_dropdown();  

            if(this.callback !== undefined) {
                this.callback(elem.key);
            }
        } else {
            this.show_dropdown();
        }
    };

    show_dropdown () {
        this.elem_root.innerHTML = "";
        this.elem_root.appendChild(this.elem_input);
        this.elem_root.appendChild(this.elem_dropdown_container);

        this.search_dropdown(this.elem_input.value);
        this.dropdown_active = true;

        let listener = (e) => {
            if(!this.elem_root.contains(e.target)) {
                this.hide_dropdown();
                document.removeEventListener("click", listener);
            }
        }

        document.addEventListener("click", listener)
    };

    search_dropdown (str: string) {
        str = str.toLocaleLowerCase();
        this.elem_dropdown.innerHTML = "";
        this.data.forEach(entry => {
            if(entry.name.toLocaleLowerCase().indexOf(str) != -1) {
                this.elem_dropdown.appendChild(entry.elem);
            }
        })
    };
}