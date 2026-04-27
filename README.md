# Alias Hub

Alias Hub is a modern static website for generating provider-supported email aliases, tracking which ones you have already used, and revisiting saved alias history later.

The app is designed for real mailbox behavior rather than made-up patterns. It only generates alias formats that are supported by the selected provider, and it clearly separates aliases that are ready to receive mail immediately from aliases that still need provider-side setup.

The live website is available at [aliashub.pages.dev](https://aliashub.pages.dev/).

## Features

- Enter an email address and auto-detect the provider from the domain
- Choose one or more supported alias types for that provider
- Generate a specific number of aliases, up to the supported maximum
- Use `Use max` to jump to the largest available batch for the current selection
- Mark aliases as used or unused
- Filter aliases by `All`, `Available`, or `Used`
- Search within generated aliases
- Copy all available aliases in one click
- Automatically adapts its layout for phones and other compact screens
- Save alias history per base email address in the browser
- Generate fresh aliases on repeat runs without losing existing used-state

## Supported Providers

### Ready-to-receive aliases

These aliases are generated from mailbox rules the provider already supports.

- `Gmail`
  - Plus tags: `username+tag@gmail.com`
  - Dot aliases: dotted variations of personal `@gmail.com` and `@googlemail.com` usernames
  - Dot plus tags: dotted username plus a `+tag`
- `Outlook.com / Hotmail`
  - Plus tags: `username+tag@domain`
- `Proton Mail`
  - Plus tags: `username+tag@domain`
- `Microsoft 365 / Exchange Online`
  - Plus tags: `username+tag@domain`

### Setup-required aliases

These are valid provider-supported alias patterns, but they are not automatically active just because they were generated in the app.

- `Yahoo Mail`
  - Disposable address candidates using `nickname-keyword@yahoo.com`
  - The app treats these as setup candidates because Yahoo requires mailbox-side configuration
- `iCloud Mail`
  - Alias candidates for `@icloud.com`
  - The app treats these as setup candidates because iCloud aliases must be created inside iCloud

## Important Notes

- Gmail dotted aliases apply to personal Gmail addresses. They do not behave the same way for Google Workspace custom domains.
- Outlook, Proton, and Exchange plus aliases are treated as receive-only style aliases.
- Yahoo and iCloud entries are still useful for planning and tracking, but the app labels them as `Setup` so the user knows they are not auto-live.
- Alias history is stored in `localStorage`, so it stays in the current browser on the current device.
- There is no backend and no account system.

## How It Works

1. Enter an email address.
2. Confirm or change the detected provider.
3. Select one or more alias types.
4. Enter how many aliases you want.
5. Optionally add tags or keywords to influence generated names.
6. Generate aliases.
7. Mark aliases as used as you consume them.
8. Reopen the saved email later from the history panel.

## Running Locally

This project is a plain static site. No install step or build step is required.

Open [index.html](./index.html) in a browser.

If you prefer a local server, you can also serve the folder with any static file server.

## Project Structure

```text
.
|- index.html   # App layout and UI templates
|- styles.css   # Visual design, layout, and animations
|- app.js       # Alias rules, generation, history, and interactions
```

## Tech

- HTML
- CSS
- Vanilla JavaScript
- Browser `localStorage` for persistence

## Future Ideas

- Export and import alias history
- Provider-specific setup guides for `Setup` aliases
- Extra sorting options
- Bulk delete for selected aliases
- Optional dark mode
