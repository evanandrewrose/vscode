import * as vscode from "vscode";
import { discoverTestFromFileContent } from "./discover";
import { getContentFromFilesystem } from "./vscode_utils";

export const WEAKMAP_TEST_DATA = new WeakMap<vscode.TestItem, TestData>();
export const testItemIdMap = new WeakMap<
  vscode.TestController,
  Map<string, vscode.TestItem>
>();

export type TestData = TestFile | TestDescribe | TestCase;

export function getTestCaseId(
  childItem: vscode.TestItem,
  name: string
): string | undefined {
  const data = WEAKMAP_TEST_DATA.get(childItem);
  if (data instanceof TestDescribe || data instanceof TestCase) {
    return `${data.fileItem.uri}/${name}`;
  } else {
    return `${childItem.uri}/${name}`;
  }
}

export function getAllTestCases(
  item: vscode.TestItem,
  agg: vscode.TestItem[] = []
) {
  if (item.children.size) {
    item.children.forEach((child) => {
      getAllTestCases(child, agg);
    });
  } else {
    agg.push(item);
  }
  return agg;
}

export class TestDescribe {
  constructor(
    public pattern: string,
    public fileItem: vscode.TestItem,
    public parent: TestDescribe | TestFile
  ) {}

  getFullPattern(): string {
    return getFullPattern(this);
  }
}

export class TestCase {
  constructor(
    public pattern: string,
    public fileItem: vscode.TestItem,
    public parent: TestDescribe | TestFile,
    public index: number
  ) {}

  getFullPattern(): string {
    return getFullPattern(this);
  }
}

export class TestFile {
  resolved = false;
  pattern = "";
  public async updateFromDisk(
    controller: vscode.TestController,
    item: vscode.TestItem
  ) {
    try {
      const content = await getContentFromFilesystem(item.uri!);
      item.error = undefined;
      discoverTestFromFileContent(controller, content, item, this);
      this.resolved = true;
    } catch (e) {
      item.error = (e as Error).stack;
    }
  }

  getFullPattern(): string {
    return this.pattern;
  }
}

function getFullPattern(start: TestDescribe | TestCase): string {
  const parents: TestDescribe[] = [];
  let iter = start.parent;
  while (iter && iter instanceof TestDescribe) {
    parents.push(iter);
    iter = iter.parent;
  }

  parents.reverse();
  if (parents.length) {
    return parents.reduce((a, b) => a + b.pattern + " ", "") + start.pattern;
  } else {
    return start.pattern;
  }
}
