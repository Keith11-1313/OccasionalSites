# TextFix

`/textfix/` provides 82 transformations across case, cleanup, lines, indentation, characters, extraction and formatting. Definitions live in `transforms.js`; editor behavior lives in `app.js`.

## Using the editor

Select a passage to transform that selection; with no selection, transformations use the whole document. Select complete lines for predictable line operations. Tools requiring parameters open an options dialog. Recipe mode queues tools in order and applies them as one undoable change, using the current recipe options.

Features include cross-category search, favorites, one locally saved recipe with options, undo/redo, literal or regular-expression find/replace, match-case and whole-word options, clipboard controls, text import/export, comparison, text insights, invisible-character display, dark mode, expanded editing and mobile editor/tool switching. Undo history is capped at 100 states. File imports reject files larger than 5 × 1024 × 1024 bytes. Downloads use `textfix.txt`.

Keyboard shortcuts include Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z and Ctrl/Cmd+F; Escape leaves expanded view. Clipboard permission failures provide keyboard-copy/paste guidance.

## Local data

The app does not send editor text to a backend. Local storage keys use the `textfix:` prefix. Favorites and the saved recipe remain local to this origin and browser profile. Draft saving is opt-in; disabling it removes the saved draft. Delete saved draft also disables saving while keeping current editor text. Clearing browser storage removes these saved values. There is no account sync or cloud backup.

## Limits

Case conversion and smart quotes are mechanical; review proper names and punctuation. Indentation manipulates whitespace rather than parsing source code. Extraction patterns are not complete email or URL validators. JSON formatting uses JavaScript parsing and may lose precision for integers outside its safe range. Complex regular expressions or very large pasted text may require substantial browser processing; the file-import size check is not an editor-wide text limit.

Run `npm test` for transformation checks. Browser interaction and responsive behavior require the manual checks in [verification](verification.md).
