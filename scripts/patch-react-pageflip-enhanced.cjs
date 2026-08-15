const fs = require("node:fs");
const path = require("node:path");

const packageRoot = path.join(__dirname, "..", "node_modules", "react-pageflip-enhanced");

function patchFile(relativePath, patches) {
  const filePath = path.join(packageRoot, relativePath);
  let source = fs.readFileSync(filePath, "utf8");
  let next = source;

  for (const { marker, search, replace } of patches) {
    if (next.includes(marker)) continue;
    if (!search.test(next)) {
      throw new Error(`Patch target not found in ${relativePath}: ${marker}`);
    }
    next = next.replace(search, replace);
  }

  if (next !== source) {
    fs.writeFileSync(filePath, next);
    console.log(`patched ${relativePath}`);
  }
}

const settingsDefaultPatch = {
  marker: "cornerHitSize: 0",
  search: /            disableFlipByClick: false,\r?\n            singlePage: false,/,
  replace:
    "            disableFlipByClick: false,\n            cornerHitSize: 0,\n            singlePage: false,",
};

const cornerDistancePatch = {
  marker: "configuredCornerHitSize",
  search:
    /        const operatingDistance = Math\.sqrt\(Math\.pow\(pageWidth, 2\) \+ Math\.pow\(rect\.height, 2\)\) \/ 5;/,
  replace:
    "        const configuredCornerHitSize = this.app.getSettings().cornerHitSize;\n        const operatingDistance = configuredCornerHitSize > 0 ? configuredCornerHitSize : Math.sqrt(Math.pow(pageWidth, 2) + Math.pow(rect.height, 2)) / 5;",
};

const cornerOnlyUserTouchPatch = {
  marker: "startUserTouch(pos) {\n        this.mousePosition = pos; // Save touch position",
  search:
    /    startUserTouch\(pos\) \{\r?\n        if \(this\.app\.getSettings\(\)\.disableFlipByClick && !this\.flipController\.isPointOnCorners\(pos\)\)\r?\n            return;\r?\n        this\.mousePosition = pos; \/\/ Save touch position\r?\n        this\.isUserTouch = true;\r?\n        this\.isUserMove = false;\r?\n    \}/,
  replace:
    "    startUserTouch(pos) {\n        this.mousePosition = pos; // Save touch position\n        this.isUserTouch = true;\n        this.isUserMove = false;\n    }",
};

const resetFoldOnUserTouchPatch = {
  marker: "if (this.getState() === \"fold_corner\")",
  search:
    /    startUserTouch\(pos\) \{\r?\n        this\.mousePosition = pos; \/\/ Save touch position/,
  replace:
    "    startUserTouch(pos) {\n        if (this.getState() === \"fold_corner\") {\n            this.render.finishAnimation();\n            this.flipController.reset();\n        }\n        this.mousePosition = pos; // Save touch position",
};

const cornerOnlyFoldPatch = {
  marker:
    "if (this.app.getSettings().disableFlipByClick && !this.isPointOnCorners(this.app.mousePosition || globalPos))",
  search:
    /        if \(this\.calc === null\)\r?\n            this\.start\(globalPos\);/,
  replace:
    "        if (this.calc === null) {\n            if (this.app.getSettings().disableFlipByClick && !this.isPointOnCorners(this.app.mousePosition || globalPos))\n                return;\n            this.start(globalPos);\n        }",
};

const uiCornerHelperPatch = {
  marker: "isPointOnConfiguredCorners(pos)",
  search: /    checkTarget\(targer\) \{/,
  replace:
    "    isPointOnConfiguredCorners(pos) {\n        const flipController = this.app.getFlipController();\n        return !flipController || flipController.isPointOnCorners(pos);\n    }\n    checkTarget(targer) {",
};

const interactiveTargetPatch = {
  marker: "const interactiveSelector = 'a, button, input, select, textarea, label, [contenteditable=\"true\"], [role=\"button\"], [role=\"tab\"], [role=\"combobox\"]';",
  search:
    /        if \(\['a', 'button'\]\.includes\(targer\.tagName\.toLowerCase\(\)\)\) \{\r?\n            return false;\r?\n        \}/,
  replace:
    "        const interactiveSelector = 'a, button, input, select, textarea, label, [contenteditable=\"true\"], [role=\"button\"], [role=\"tab\"], [role=\"combobox\"]';\n        if (typeof targer.closest === 'function' && targer.closest(interactiveSelector)) {\n            return false;\n        }",
};

const touchStartCornerGatePatch = {
  marker: "if (this.app.getSettings().disableFlipByClick && !this.isPointOnConfiguredCorners(pos))\n                        return;",
  search:
    /                    const pos = this\.getMousePos\(t\.clientX, t\.clientY\);\r?\n                    this\.touchPoint = \{/,
  replace:
    "                    const pos = this.getMousePos(t.clientX, t.clientY);\n                    if (this.app.getSettings().disableFlipByClick && !this.isPointOnConfiguredCorners(pos))\n                        return;\n                    this.touchPoint = {",
};

const touchMoveSwipeCornerGatePatch = {
  marker:
    "if (this.touchPoint !== null && !this.swipeDetected && this.isPointOnConfiguredCorners(this.touchPoint.point))",
  search: /                if \(this\.touchPoint !== null && !this\.swipeDetected\) \{/,
  replace:
    "                if (this.touchPoint !== null && !this.swipeDetected && this.isPointOnConfiguredCorners(this.touchPoint.point)) {",
};

const touchEndSwipeCornerGatePatch = {
  marker:
    "if (this.isPointOnConfiguredCorners(this.touchPoint.point) &&\n                        absDx > this.swipeDistance",
  search:
    /                    if \(absDx > this\.swipeDistance &&\r?\n                        distY < this\.swipeDistance \* 2 &&\r?\n                        dt < this\.swipeTimeout\) \{/,
  replace:
    "                    if (this.isPointOnConfiguredCorners(this.touchPoint.point) &&\n                        absDx > this.swipeDistance &&\n                        distY < this.swipeDistance * 2 &&\n                        dt < this.swipeTimeout) {",
};

const singlePageClickCornerPatch = {
  marker: "this.isPointOnConfiguredCorners(this.touchPoint.point)) {\n                        const rect = this.app.getRender().getRect();",
  search:
    /                    if \(!isSwipe && this\.app\.getSettings\(\)\.singlePage && absDx < 15 && distY < 15 && dt < 400\) \{\r?\n                        const rect = this\.app\.getRender\(\)\.getRect\(\);\r?\n                        const pageWidth = rect\.pageWidth;\r?\n                        if \(pos\.x < pageWidth \* 0\.25\) \{\r?\n                            this\.app\.flipPrev\("bottom" \/\* FlipCorner\.BOTTOM \*\/\);\r?\n                            isSwipe = true;\r?\n                        \}\r?\n                        else if \(pos\.x > pageWidth \* 0\.75\) \{\r?\n                            this\.app\.flipNext\("bottom" \/\* FlipCorner\.BOTTOM \*\/\);\r?\n                            isSwipe = true;\r?\n                        \}\r?\n                        \/\/ .*?\r?\n                    \}/,
  replace:
    "                    if (!isSwipe && this.app.getSettings().singlePage && absDx < 15 && distY < 15 && dt < 400 &&\n                        this.isPointOnConfiguredCorners(this.touchPoint.point)) {\n                        const rect = this.app.getRender().getRect();\n                        const pageWidth = rect.pageWidth;\n                        const corner = this.touchPoint.point.y < rect.height / 2\n                            ? \"top\" /* FlipCorner.TOP */\n                            : \"bottom\" /* FlipCorner.BOTTOM */;\n                        if (pos.x < pageWidth) {\n                            this.app.flipPrev(corner);\n                            isSwipe = true;\n                        }\n                        else {\n                            this.app.flipNext(corner);\n                            isSwipe = true;\n                        }\n                    }",
};

const flipSettingTypePatch = {
  marker: "cornerHitSize: number;",
  search:
    /    \/\*\* if this value is true, flipping by clicking on the whole book will be locked\. Only on corners \*\/\r?\n    disableFlipByClick: boolean;\r?\n    \/\*\* If true, only one page is shown at a time with flip animation \*\//,
  replace:
    "    /** if this value is true, flipping by clicking on the whole book will be locked. Only on corners */\n    disableFlipByClick: boolean;\n    /** Corner hit area size in px. Falls back to the default diagonal-based range when 0. */\n    cornerHitSize: number;\n    /** If true, only one page is shown at a time with flip animation */",
};

const runtimePatches = [
  settingsDefaultPatch,
  cornerDistancePatch,
  resetFoldOnUserTouchPatch,
  cornerOnlyFoldPatch,
  uiCornerHelperPatch,
  interactiveTargetPatch,
  touchStartCornerGatePatch,
  touchMoveSwipeCornerGatePatch,
  touchEndSwipeCornerGatePatch,
  singlePageClickCornerPatch,
];

patchFile("build/index.es.js", runtimePatches);
patchFile("build/index.js", runtimePatches);
patchFile("build/page-flip/Settings.d.ts", [flipSettingTypePatch]);
patchFile("build/html-flip-book/settings.d.ts", [flipSettingTypePatch]);
