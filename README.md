# Syatem Monitor CLI

A terminal-based system monitor built with [Ink](https://github.com/vadimdemedes/ink) and TypeScript. Inspired by `htop`.

Shows CPU usage per core, memory usage, and top processes. Updates every second.

## Requirements

- Node.js 18+
- npm

## Usage

```bash
npm install
npm run dev
```

Or build it:

```bash
npm run build
node dist/index.js
```

You can also install it globally with `npm link` and run `ink-htop` from anywhere. Press `q` to quit.

## What it does

- Shows CPU usage for each core with load averages
- Memory and swap usage with progress bars
- Top processes by CPU usage (command, user, CPU%, memory%)
- Works on macOS, Linux, and Windows using [`systeminformation`](https://systeminformation.io)

## Known issues

- Load averages show `0` on Windows (not available on that platform)
- Updates every second by default. You can change `REFRESH_INTERVAL` in `src/index.tsx` if needed
