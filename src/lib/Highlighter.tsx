import findAndReplaceDOMText from "findandreplacedomtext";
import lcs from "node-lcs";
import { useCallback, useEffect, useState } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { fromRange } from "xpath-range";

import commentIcon from "./icons/comment.icon";
import copyIcon from "./icons/copy.icon";
import highlightIcon from "./icons/highlight.icon";
import "./styles/highlighter.css";
import showHighlightTools, {
  getRangeByText,
  insertOptionNodeUsingRange,
} from "./utils";

type XPathAttributes = {
  startContainer: string;
  endContainer: string;
  endOffset: number;
  startOffset: number;
};

type Annotation = {
  text?: string;
  metadata: {
    xpath?: XPathAttributes;
    text: string;
    color?: string;
  };
};

type XPathNode = {
  singleNodeValue?: {
    innerHTML?: string;
    innerText?: string;
  };
} & XPathResult;

type HighlightResult = {
  error?: string;
  data?: {
    didHighlight: boolean;
    xpath?: XPathAttributes;
    text?: string;
  };
};

type HighlightData = {
  xpath: XPathAttributes;
  text: string;
  selection: Selection;
};

type SelectionResult = {
  data?: HighlightData;
  error?: string;
};

enum AnnotationType {
  Highlight,
  MessageHighlight,
}

type HighlightParams = {
  xpath: XPathAttributes;
  text: string;
  type?: AnnotationType;
  color?: string;
};

export type HighlighterProps = {
  createAnnotation: (params: HighlightParams) => Promise<void>;
  removeAnnotation: (params: HighlightParams) => Promise<void>;
  annotations: Annotation[];
  commentSection: (params: { color: string; text: string }) => Promise<void>;
};

const highlightColor = "yellow";

const getXpathParameters = (xpath: any) => {
  const startOffset = xpath.startOffset;
  const endOffset = xpath.endOffset;
  const startContainer = xpath.start;
  const endContainer = xpath.end;
  return { startOffset, endOffset, startContainer, endContainer };
};

export const Highlighter: React.FC<HighlighterProps> = ({
  commentSection,
  removeAnnotation,
  createAnnotation,
  annotations,
}) => {
  const STORES_WITH_OWN_TOOLTIP = [
    {
      evaluator: () => {
        const result = document.querySelectorAll(
          'meta[property="og:site_name"]',
        );
        if (result && result.length && result[0] instanceof HTMLMetaElement) {
          return result[0].content === "Medium";
        }
        return false;
      },
    },
    {
      evaluator: () => {
        return ["medium.com", "outlook", "confluence"].some((url) =>
          window.location.host.includes(url),
        );
      },
    },
  ];

  const getHighlightPosition = (): string => {
    const isStoreWithOwnToolTip = STORES_WITH_OWN_TOOLTIP.some(
      (storeWithOwnToolTip) => {
        try {
          return storeWithOwnToolTip.evaluator();
        } catch (ignored) {
          return false;
        }
      },
    );
    return isStoreWithOwnToolTip ? "BOTTOM" : "TOP";
  };

  const [pageHighlighted, setPageHighlighted] = useState<boolean>(false);
  const [highlightPosition] = useState<string>(getHighlightPosition());

  const extractParentContainer = (xpath: XPathAttributes): string => {
    let startContainerWithoutText = xpath.startContainer;
    const startContainerWithoutTextList = xpath.startContainer.split("/");
    if (
      startContainerWithoutTextList[startContainerWithoutTextList.length - 1] &&
      startContainerWithoutTextList[
        startContainerWithoutTextList.length - 1
      ]!.includes("text")
    ) {
      startContainerWithoutTextList.pop();
    }
    startContainerWithoutText = startContainerWithoutTextList.join("/");
    return startContainerWithoutText;
  };

  const getWindowSelection = useCallback((): Selection | null => {
    if (window.getSelection) {
      return window.getSelection();
    }
    return null;
  }, []);

  const getWindowSelectionString = useCallback((): string => {
    if (window.getSelection) {
      const selection = window.getSelection();
      if (!selection) {
        return "";
      }
      return selection.toString().trim();
    }
    return "";
  }, []);

  const HighlightComment = (props: any) => {
    const { text, color } = props;
    const className = `highlighter-circle-sketch-highlight highlight-${color}`;
    return <span className={className}>{text}</span>;
  };

  const highlight = useCallback(
    (params: HighlightParams): HighlightResult => {
      const { xpath, text, type, color } = params;
      const highlightIconParams: Record<string, unknown> = {
        stroke: "#3c82f6",
      };
      const commentIconParams: Record<string, unknown> = { stroke: undefined };
      if (type === AnnotationType.MessageHighlight) {
        commentIconParams.stroke = "#3c82f6";
      }

      let didHighlight = false;
      const startContainerWithoutText = extractParentContainer(xpath);
      const xpathNode = document.evaluate(
        startContainerWithoutText,
        document,
        null,
        XPathResult.FIRST_ORDERED_NODE_TYPE,
        null,
      ) as XPathNode;
      if (
        !xpathNode?.singleNodeValue?.innerHTML ||
        !xpathNode.singleNodeValue.innerText
      ) {
        return {
          data: { didHighlight, text, xpath },
          error: "Missing xpathNode.singleNodeValue",
        };
      }
      const commonSubstrings = lcs(
        text,
        xpathNode.singleNodeValue.innerText.replaceAll("\n", ""),
      );

      if (!commonSubstrings.length) {
        return {
          data: { didHighlight, text, xpath },
          error: `Not found`,
        };
      }

      const commonString: string = commonSubstrings.sequence;
      const numberOccurances = (
        xpathNode.singleNodeValue.innerText.match(
          new RegExp(
            commonString.replace(/(?=[.\\+*?[^\]$(){}|])/g, "\\"),
            "g",
          ),
        ) ?? []
      ).length;

      if (numberOccurances > 1) {
        return {
          data: { didHighlight, text, xpath },
          error: `Multiple Occurances found: ${numberOccurances}`,
        };
      }

      const highlightedElements: { el: HTMLElement; text: string }[] = [];
      findAndReplaceDOMText(xpathNode.singleNodeValue as any, {
        find: commonString,
        replace: (portion) => {
          didHighlight = true;
          let didErase = false;
          const el = document.createElement("highlighter-mark");
          highlightedElements.push({ el, text: portion.text });
          const staticElement = renderToStaticMarkup(
            <HighlightComment text={portion.text} color={color} />,
          );
          el.innerHTML = staticElement;
          el.onmouseenter = () => {
            const range = new Range();
            range.setStart(el.firstChild as Node, 0);
            range.setEnd(el.firstChild as Node, 1);
            insertOptionNodeUsingRange({
              range,
              buttons: [
                {
                  svg: highlightIcon(highlightIconParams),
                  onclick: () => {
                    highlightedElements.forEach((highlightedElement) => {
                      highlightedElement.el.outerHTML = highlightedElement.text;
                    });
                    if (!didErase) {
                      didErase = true;
                      removeAnnotation({ text, xpath });
                    }
                  },
                },
                {
                  svg: commentIcon(commentIconParams),
                  onclick: () => {
                    commentSection({
                      text,
                      color: highlightColor,
                    });
                  },
                },
                {
                  svg: copyIcon(),
                  onclick: () => {
                    navigator.clipboard.writeText(commonString ?? "");
                  },
                },
              ],
            });
          };
          return el;
        },
      });

      return {
        data: { didHighlight, text, xpath },
      };
    },
    [commentSection, removeAnnotation],
  );

  const removeSelection = useCallback((selection: Selection): void => {
    if (selection) {
      selection.removeAllRanges();
    }
  }, []);

  const captureSelection = useCallback((): SelectionResult => {
    const text = getWindowSelectionString();
    if (!text) {
      return {
        error: "Missing Text",
      };
    }

    const selection = getWindowSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const xpathData = fromRange(range, document);
      if (xpathData) {
        try {
          const xpath = getXpathParameters(xpathData);
          return {
            data: { xpath, text, selection },
          };
        } catch (e) {
          // Highlight failed
        }
      }
    }
    return {
      error: "No selection",
    };
  }, [getWindowSelectionString, getWindowSelection]);

  const selectAndHighlight = useCallback(
    (type: AnnotationType) => {
      const { error, data } = captureSelection();
      if (error || !data) {
        return { error, data };
      }
      const highlightResults = highlight({
        ...data,
        type,
        color: highlightColor,
      });

      if (highlightResults.error) {
        return { error };
      }
      removeSelection(data.selection);
      return { data };
    },
    [captureSelection, highlight, removeSelection],
  );

  const performHighlighting = useCallback(async () => {
    const { data } = selectAndHighlight(AnnotationType.Highlight);
    if (!data?.text) {
      return;
    }
    createAnnotation({
      text: data.text,
      xpath: data.xpath,
      color: highlightColor,
    });
  }, [selectAndHighlight, createAnnotation]);

  const performCommenting = useCallback(async () => {
    const { data } = selectAndHighlight(AnnotationType.MessageHighlight);
    setPageHighlighted(true);
    if (!data?.text) {
      return;
    }
    createAnnotation({
      text: data.text,
      xpath: data.xpath,
      color: highlightColor,
    });
  }, [selectAndHighlight, createAnnotation, setPageHighlighted]);

  const performCopy = useCallback(() => {
    const { error, data } = captureSelection();
    if (error) {
      return;
    }
    if (data) {
      const { text } = data;
      navigator.clipboard.writeText(text);
    }
  }, [captureSelection]);

  useEffect(() => {
    const run = async () => {
      if (!pageHighlighted) {
        setPageHighlighted(true);
        for (const annotation of annotations) {
          let currentXpath = annotation?.metadata?.xpath;
          if (!currentXpath && !annotation?.metadata?.text) {
            continue;
          }
          if (!currentXpath && annotation?.metadata?.text) {
            const locatedNode = getRangeByText(annotation.metadata.text);
            if (!locatedNode) {
              continue;
            }
            const newXpath = getXpathParameters(locatedNode);
            currentXpath = newXpath;
          }
          if (!currentXpath) {
            continue;
          }

          let finalAnnotation = annotation;
          const correspondingMessageAnnotation = annotations.find(
            (m: Annotation) => {
              const xpathAttributes: XPathAttributes = currentXpath!;
              return Object.keys(xpathAttributes).every((key: string) => {
                const k = key as keyof XPathAttributes;
                return xpathAttributes[k] === currentXpath![k];
              });
            },
          );

          if (correspondingMessageAnnotation) {
            finalAnnotation = correspondingMessageAnnotation;
          }

          const type = finalAnnotation.text
            ? AnnotationType.MessageHighlight
            : AnnotationType.Highlight;
          highlight({
            xpath: currentXpath,
            text: finalAnnotation.metadata.text,
            type,
            color: finalAnnotation.metadata?.color || highlightColor,
          });
        }
      }
    };
    new Promise((resolve) => setTimeout(resolve, 1000)).then(() => run());
  }, [pageHighlighted, annotations, highlight]);

  useEffect(() => {
    const run = async () => {
      showHighlightTools({
        enabled: true,
        position: highlightPosition,
        buttons: [
          {
            svg: highlightIcon(),
            onclick: performHighlighting,
          },
          {
            svg: commentIcon(),
            onclick: performCommenting,
          },
          {
            svg: copyIcon(),
            onclick: performCopy,
          },
        ],
      });
    };
    run();
  }, [highlightPosition, performHighlighting, performCopy, performCommenting]);

  return <></>;
};
