import { Collection, Folder, TRequest } from './types.ts';

function isFolder(c: Folder | TRequest | undefined): c is Folder {
  return Boolean(c) && !Object.hasOwnProperty.call(c, 'url');
}

export class TTree {
  #depth = 0;
  #info: Folder | TRequest | undefined;
  #children: TTree[] = [];
  #lookup: Record<string, TTree> = {};

  constructor(
    col?: Collection,
    lookup?: Record<string, TTree>,
    parent?: TTree,
    child?: Folder | TRequest,
  ) {
    if (lookup) {
      this.#lookup = lookup;
    }
    if (parent) {
      this.#depth = parent.#depth + 1;
    }
    this.#info = child;

    let cid = '';
    if (child) {
      cid = child._id;
      this.#lookup[cid] = this;
    }

    if (col) {
      for (
        const f of col.folders.filter(({ containerId }) => containerId === cid)
      ) {
        this.#children.push(new TTree(col, lookup, this, f));
      }
    }
  }

  add(req: TRequest): void {
    const cid = req.containerId ?? '';
    const container = this.#lookup[cid];
    container.#children.push(
      new TTree(undefined, this.#lookup, container, req),
    );
  }

  sort(): void {
    this.#children.sort((a, b) =>
      (a.#info?.sortNum ?? Infinity) - (b.#info?.sortNum ?? Infinity)
    );
    this.#children.forEach(c => c.sort());
  }

  toString(): string {
    let res = '';
    if (this.#info) {
      res += ''.padEnd((this.#depth - 1) * 2);
      const fold = isFolder(this.#info)
      if (fold) {
        res += '['
      }
      res += this.#info.name;
      if (fold) {
        res += ']'
      }
      if (!fold) {
        res += ': ';
        res += this.#info._id;
      }
      res += '\n';
    }
    for (const child of this.#children) {
      res += child.toString();
    }
    return res;
  }
}
