# CubeTrack csTimer Bridge

A Manifest V3 Chrome extension for importing csTimer session solves into CubeTrack.

## Install in Chrome
1. Download the ZIP for the `copilot/cstimer-autosync-extension` branch and extract it.
2. In Chrome, open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the extracted folder that directly contains `manifest.json` (not a nested folder).
4. Open or reload csTimer, then open CubeTrack in another tab.
5. Click the extension icon and choose **Sync from csTimer**.

The extension stores its website setting in Chrome extension storage and saves imported solves in CubeTrack's existing browser-local data. It does not send solve data to a remote API. Sync is started from the extension popup; it is not background polling.
