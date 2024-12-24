/* eslint-disable */
// Source: https://github.com/aruminant/tinyq/blob/master/src/tinyquoter.js
// Modified to fit our needs

let t: string | Selection | null = '';
let CONTAINER_ID = 'cabana_page_tool_tip';
let BUBBLE_COLOR = 'rgb(47, 47, 47)';

type Button = {
  svg: string;
  onclick: () => void;
};

type Config = {
  buttons: Button[];
  bubbleColor?: string;
  containerId?: string;
  [key: string]: unknown;
};

type Styles = {
  el: any;
  obj: any;
  val?: any;
  className?: string;
};

const defaultConfig: Config = {
  bubbleColor: BUBBLE_COLOR,
  buttons: [],
  containerId: CONTAINER_ID,
  position: 'TOP',
  enabled: true,
};
const config: Config = defaultConfig;

function encQ(s: string) {
  return encodeURI('"' + s + '"');
}

function setStyle(styleConfig: Styles) {
  const { el, obj, val, className } = styleConfig;
  var styles = (el.getAttribute('style') || '').split(';');
  var orig: any = {};
  var newStyles: any = [];
  styles.forEach(function (s: any) {
    if (s === '') {
      return;
    }
    var parts = s.split(':');
    orig[parts[0].trim()] = parts[1].trim();
  });
  var toSerialize: any = {};

  if (typeof val !== 'undefined') {
    orig[obj] = val;
    toSerialize = orig;
  } else {
    toSerialize = obj;
  }

  Object.keys(toSerialize).forEach(function (k: any) {
    if (toSerialize[k] !== null) {
      newStyles.push(k + ': ' + toSerialize[k]);
    }
  });
  el.setAttribute('style', newStyles.join('; '));
  if (className) {
    el.className = className;
  }
}

function generateButton(svgString: any, onclick: any) {
  var parser = new DOMParser();
  var svg = parser.parseFromString(svgString, 'image/svg+xml').childNodes[0];
  var hButton = document.createElement('div');
  hButton.appendChild(svg!);
  setStyle({
    el: hButton,
    obj: {
      all: 'unset',
      display: 'inline-flex',
      margin: '0',
      cursor: 'pointer',
      padding: '7px',
    },
  });

  hButton.onclick = hButton.ontouchend = onclick;
  hButton.onmouseenter = () => {
    setStyle({
      el: hButton,
      obj: 'opacity',
      val: 0.6,
    });
  };
  hButton.onmouseleave = () => {
    setStyle({
      el: hButton,
      obj: 'opacity',
      val: 1.0,
    });
  };

  return hButton;
}

export function insertOptionNodeUsingRange(params: any) {
  const { range, buttons = [] } = params;
  clear();
  var container = document.createElement('div');
  container.id = CONTAINER_ID;
  setStyle({
    el: container,
    obj: {
      position: 'absolute',
      color: 'white',
      visibility: 'hidden',
      padding: '0 7px',
    },
  });
  container.onmousedown = container.ontouchstart = function (e: any) {
    e.preventDefault();
    e.stopPropagation();
  };
  container.onmouseup = container.ontouchend = function (e: any) {
    e.stopPropagation();
  };

  var bubbleOptions = document.createElement('div');
  setStyle({
    el: bubbleOptions,
    obj: {
      'white-space': 'nowrap',
      'border-radius': '4px',
      display: 'inline-block',
      background: defaultConfig.bubbleColor,
      padding: '0 4px',
    },
  });
  if (config.position === 'BOTTOM') {
    var upCarrot = document.createElement('div');
    setStyle({
      el: upCarrot,
      obj: {
        width: 0,
        height: 0,
        'border-left': '6px solid transparent',
        'border-right': '6px solid transparent',
        'border-bottom': '10px solid ' + defaultConfig.bubbleColor,
        margin: 'auto',
      },
    });
    container.appendChild(upCarrot);
    container.appendChild(bubbleOptions);
  } else {
    var downCarrot = document.createElement('div');
    setStyle({
      el: downCarrot,
      obj: {
        width: 0,
        height: 0,
        'border-left': '6px solid transparent',
        'border-right': '6px solid transparent',
        'border-top': '10px solid ' + defaultConfig.bubbleColor,
        margin: 'auto',
      },
    });
    container.appendChild(bubbleOptions);
    container.appendChild(downCarrot);
  }

  buttons.forEach(function (buttonConfig: any) {
    bubbleOptions.appendChild(
      generateButton(buttonConfig.svg, function (e: any) {
        buttonConfig.onclick(e, range);
        setStyle({ el: container, obj: 'visibility', val: 'hidden' });
      })!,
    );
  });

  // Calculate bounds of range
  var cRects = range.getClientRects();
  var hBounds = [];
  for (var i = 0; i < cRects.length; i++) {
    hBounds.push(cRects[i].left);
    hBounds.push(cRects[i].right);
  }
  var rLeft = Math.min.apply(null, hBounds);
  var rRight = Math.max.apply(null, hBounds);

  var y = cRects[0].top + window.scrollY;
  var x = rLeft + window.scrollX + (rRight - rLeft) / 2;

  container.onmouseleave = clear;
  document.body.appendChild(container);

  var containerHeight = window
    .getComputedStyle(container)
    .getPropertyValue('height');
  var containerWidth = window
    .getComputedStyle(container)
    .getPropertyValue('width');
  var cWidth = parseInt(containerWidth.replace('px', ''));
  var windowWidth = window.innerWidth;

  var left = x - cWidth / 2;
  if (left < 0) {
    setStyle({ el: container, obj: 'left', val: left + 'px' });
  } else if (left + cWidth > windowWidth) {
    setStyle({ el: container, obj: 'right', val: 0 + 'px' });
  } else {
    setStyle({ el: container, obj: 'left', val: left + 'px' });
  }
  setStyle({ el: container, obj: 'z-index', val: 2147483646 });

  if (config.position === 'BOTTOM') {
    var bottom = cRects[0].bottom + window.scrollY;
    if (bottom < 0) {
      bottom = 0;
    }
    setStyle({ el: container, obj: 'top', val: bottom + 'px' });
  } else {
    var top = y - parseInt(containerHeight.replace('px', ''));
    if (top < 0) {
      top = 0;
    }
    setStyle({ el: container, obj: 'top', val: top + 'px' });
  }
  setStyle({ el: container, obj: 'visibility', val: 'visible' });
}

export function insertHighlightOptionNode(selection: any) {
  let range;
  try {
    range = selection.getRangeAt(0);
  } catch (e) {
    range = null;
  }
  if (!range || range.collapsed || !range.toString().trim()) {
    return;
  }
  const buttons = config.buttons;
  insertOptionNodeUsingRange({ range, buttons });
}

function showHighlightOptions(e: any) {
  t = document.getSelection();

  if (t && config.enabled) {
    insertHighlightOptionNode(t);
  }
}

export function clear() {
  var e = document.getElementById(CONTAINER_ID);
  if (e && e.parentElement) {
    e.parentElement.removeChild(e);
  }
}

export function toolTipEnabled(value = true): void {
  config.enabled = value;
}

export default function init(customConfig: Config): void {
  Object.keys(customConfig).forEach((k) => {
    config[k] = customConfig[k];
  });
  document.onmouseup = document.ontouchend = showHighlightOptions;
  document.onmousedown = document.ontouchstart = clear;
}

export function getTextNodeIndex(node: Node): number {
  if (!node || node.nodeType !== Node.TEXT_NODE) {
    return 0;
  }

  let count = 0;
  let sibling = node.parentNode?.firstChild;

  while (sibling) {
    if (sibling.nodeType === Node.TEXT_NODE) {
      count++;
    }
    if (sibling === node) {
      return count; // Return 1-based index
    }
    sibling = sibling.nextSibling;
  }

  return count;
}

export function getFullXPathToTextNode(node: Node, offset: number): string {
  if (!node) {
    return ''; // Failsafe for null or undefined nodes
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const parentElement = node.parentNode as HTMLElement;
    const xpath = getFullXPath(parentElement); // Get the XPath to the parent element
    const index = getTextNodeIndex(node); // Get the index of the text node within its parent
    return `${xpath}/text()[${index}]`;
  } else {
    console.warn('Node is not a text node:', node);
    return '';
  }
}
export function getFullXPath(node: Node): string {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return '';
  }

  const element = node as HTMLElement;

  // If the element has an ID, return XPath using the ID
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const parts: string[] = [];
  let currentNode: HTMLElement | null = element;

  while (currentNode && currentNode.nodeType === Node.ELEMENT_NODE) {
    let index = 0;
    let sibling = currentNode.previousSibling;

    while (sibling) {
      if (
        sibling.nodeType === Node.ELEMENT_NODE &&
        sibling.nodeName === currentNode.nodeName
      ) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = currentNode.nodeName.toLowerCase();
    const pathIndex = index > 0 ? `[${index + 1}]` : '';
    parts.unshift(`${tagName}${pathIndex}`);
    currentNode = currentNode.parentElement;
  }

  return `/${parts.join('/')}`;
}

export function getRangeByText(text: string) {
  const xpath = `//*[contains(text(), "${text}")]`;
  const result = document.evaluate(
    xpath,
    document,
    null,
    XPathResult.FIRST_ORDERED_NODE_TYPE,
    null,
  );

  const node = result.singleNodeValue;
  if (node) {
    const range = document.createRange();

    const nodeText = node.textContent || '';
    const startIndex = nodeText.indexOf(text);
    if (startIndex !== -1) {
      range.setStart(node.firstChild!, startIndex);
      range.setEnd(node.firstChild!, startIndex + text.length);

      return {
        start: getFullXPathToTextNode(range.startContainer, range.startOffset), // XPath to start text node
        startOffset: range.startOffset,
        end: getFullXPathToTextNode(range.endContainer, range.endOffset), // XPath to end text node
        endOffset: range.endOffset,
      };
    }
  }

  return null; // No matching node or text found
}
