import { getComponentId } from '../utils/utils';

// Should match
// node_modules/domino/lib/MutationConstants.js
enum MutationType {
  VALUE = 1,  // The value of a Text, Comment or PI node changed
  ATTR = 2,   // A new attribute was added or an attribute value and/or prefix
  // changed
  REMOVE_ATTR = 3,  // An attribute was removed
  REMOVE = 4,       // A node was removed
  MOVE = 5,         // A node was moved
  INSERT = 6        // A node (or a subtree of nodes) was inserted
}

interface DominoMutationEvent {
  type: MutationType;
  target: HTMLElement & { [k: string]: Function | undefined };
  node?: HTMLElement & { [k: string]: Function | undefined };
  attr?: { data: string, name: string };
}

const START_COMMENT = '__start__';

// Create a server renderer that adds hints about embedded templates.
function createServerRenderer(doc: Document, compId?: number) {
  let commentIndex = 0;
  return {
    createComment: (data: string) => {
      // Create two comments and send it to client so that there is a 
      // matching comment block that can be used to identify binding 
      // template sections (Ex. ngIf, ngFor).
      const startComment = doc.createComment('s' + commentIndex.toString(16));
      const endComment = doc.createComment('e' + commentIndex.toString(16));
      (endComment as any)[START_COMMENT] = startComment;
      commentIndex++;
      return endComment;
    },
    createElement: (tag: string) => {
      const el = doc.createElement(tag);
      if (compId != null) {
        el.setAttribute(`_ngcontent-${compId}`, '');
      }
      return el;
    },
    createElementNS: (namespace: string, tag: string) =>
      doc.createElementNS(namespace, tag) as any,
    createTextNode: (data: string) => doc.createTextNode(data),
    querySelector: (selectors: string) => doc.querySelector(selectors) as any,
  }
};

export function getRendererFactory(doc: Document, scoped: boolean) {
  return {
    createRenderer: (hostElement: any, rendererType: any) => {
      (doc as any).__current_element__ = hostElement;
      const compId: number | undefined = (hostElement && scoped) ?
        getComponentId(doc, hostElement.localName) : undefined;
      if (hostElement) {
        // Mark the host element as server-side rendered.
        hostElement.setAttribute('_s', '');
        if (scoped) {
          hostElement.setAttribute(`_nghost-${compId}`, '');
        }
      }
      // Patch the Domino mutation handler to insert the start comment node
      // whenever the end comment node is inserted.
      const oldMutationHandler = (doc as any).mutationHandler;
      (doc as any)._setMutationHandler((event: DominoMutationEvent) => {
        const target = event.target;
        const node = event.node!;
        switch (event.type) {
          case MutationType.INSERT:
            if ((node as any)[START_COMMENT] != null) {
              target.insertBefore((node as any)[START_COMMENT], node);
            }
            break;
        }
        if (oldMutationHandler) {
          oldMutationHandler(event);
        }
      });

      return createServerRenderer(doc, compId);
    }
  };
}