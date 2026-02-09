# LetsReachout

A Chrome extension that helps you send personalized template messages on LinkedIn. Auto-extracts recipient names and injects messages directly into LinkedIn's message composer based on specified templates.

## Features

- **Auto-extract profile data**: Automatically detects recipient name and company from LinkedIn profiles
- **Pre-built templates**: Reachout message and Referral request templates
- **Auto-inject messages**: Inserts personalized messages directly into LinkedIn's message composer
- **Works with**: Profile pages, messaging, and connection requests

## Installation

### Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:




   ```bash
   npm run build
   ```

3. Load in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

### Development Mode

Run in watch mode for development:
```bash
npm run dev
```

Then reload the extension in Chrome after each change.

## Usage

1. Navigate to a LinkedIn profile or open a messaging thread
2. Click the extension icon in your toolbar
3. The extension will auto-detect the recipient's name and company
4. Select a template (Reachout or Referral Request)
5. Preview the personalized message
6. Click "Insert Message" to inject into the active composer

## Templates

### Reachout Message
Best for networking and introductions when connecting with new professionals.

### Referral Request
Best for requesting job referrals from employees at companies you're interested in.

## Project Structure

```
linkedin-template-extension/
├── src/
│   ├── content/           # Content scripts (runs on LinkedIn)
│   │   ├── index.ts       # Entry point
│   │   ├── nameExtractor.ts
│   │   └── messageInjector.ts
│   ├── popup/             # Extension popup UI
│   │   ├── index.html
│   │   ├── index.ts
│   │   └── styles.css
│   ├── background/        # Service worker
│   ├── templates/         # Template logic & placeholder filling
│   └── types/             # TypeScript types
├── public/
│   ├── manifest.json      # Extension manifest
│   ├── templates.json     # Configuration file for message templates
│   └── icons/             # Extension icons
└── dist/                  # Built extension (load this in Chrome)
```

## Customizing Templates

The extension loads message templates at runtime from a configuration file. You can easily add or modify templates without touching the source code.

### How to update templates:

1. Open `public/templates.json` in your editor.
2. The file contains an array of template objects with the following structure:
   ```json
   {
     "name": "Template Name",
     "description": "Short description shown in the UI",
     "message": "The actual message content with {{firstName}} and {{company}} placeholders"
   }
   ```
3. After modification, rebuild the extension:
   ```bash
   npm run build
   ```
4. Reload the extension in `chrome://extensions/`.

### Available Placeholders:
- `{{firstName}}`: Automatically replaced with the recipient's first name.
- `{{company}}`: Automatically replaced with the recipient's current company.


## Tech Stack

- TypeScript
- Vite
- Tailwind CSS
- Chrome Extension Manifest V3


## Demo
https://github.com/user-attachments/assets/c70f106e-2902-4a53-b810-663e1559093b

## License

MIT

