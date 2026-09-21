import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const file = path.join(process.cwd(), "app/account/security/page.tsx");
const source = fs.readFileSync(file, "utf8");
const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

function tagName(node: ts.JsxElement): string {
  return node.openingElement.tagName.getText(tree);
}

describe("account security phone-change markup", () => {
  it("never nests a form inside another form", () => {
    const nestedForms: number[] = [];
    const visit = (node: ts.Node, insideForm = false) => {
      const isForm = ts.isJsxElement(node) && tagName(node) === "form";
      if (isForm && insideForm) nestedForms.push(node.getStart(tree));
      node.forEachChild((child) => visit(child, insideForm || isForm));
    };
    visit(tree);
    expect(nestedForms).toEqual([]);
  });

  it("renders verify, resend, and cancel as sibling forms", () => {
    let actionNames: string[] = [];
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node)) {
        const testId = node.openingElement.attributes.properties.find((property) =>
          ts.isJsxAttribute(property) && property.name.getText(tree) === "data-testid" && property.initializer?.getText(tree).includes("phone-change-verification-actions"),
        );
        if (testId) {
          actionNames = node.children
            .filter(ts.isJsxElement)
            .filter((child) => tagName(child) === "form")
            .map((form) => form.openingElement.attributes.properties
              .find((property) => ts.isJsxAttribute(property) && property.name.getText(tree) === "action")
              ?.getText(tree) ?? "");
        }
      }
      node.forEachChild(visit);
    };
    visit(tree);
    expect(actionNames).toEqual([
      "action={verifyPhoneChange}",
      "action={resendPhoneChange}",
      "action={cancelPhoneChange}",
    ]);
  });

  it("keeps both owner TOTP recovery operations in separate forms", () => {
    expect(source).toContain("action={changeOwnerPhoneWithTotp}");
    expect(source).toContain("action={resetOwnerPasswordWithTotp}");
    expect(source).toContain("مالکیت شماره جدید با این روش تأیید نمی‌شود");
  });
});
