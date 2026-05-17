# UI references

Three docs describing the apps Janelle uses today, the ones the inventory app is replacing. Each captures layout, density, interactions, and what's worth borrowing.

- [`google-drive.md`](./google-drive.md) — file/folder browser
- [`google-photos.md`](./google-photos.md) — photo timeline + carousel
- [`google-sheets.md`](./google-sheets.md) — spreadsheet grid + editing

## Why these references

Janelle's current stack is **Drive + Photos + Sheets**. Each of the three apps does *one* thing well. Our inventory app has to do *all three* — file management, photo browse, structured metadata — and the pain we're fixing is that the three apps don't talk to each other.

The point of these docs isn't to copy any single app; it's to understand what each is good at so the inventory app can hit those expectations where it matters:

| Where the user expects… | We should learn from… |
| --- | --- |
| Folders / sub-folders / tree navigation | Drive |
| Dense photo browsing with zero chrome | Photos |
| Editing many rows of metadata fast | Sheets |
| Click a photo → fullscreen carousel | Photos |
| Right-click → context menu | Drive |
| Per-cell inline editing with keyboard nav | Sheets |
| Multi-select via long-press / shift-click | Photos / Drive |

Each doc closes with a "Takeaways for our app" section that's specific, not generic.
