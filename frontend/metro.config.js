// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
let config = getDefaultConfig(__dirname);

// Apply NativeWind
config = withNativeWind(config, { input: "./app/global.css" });

// FINAL DEFENSIVE PATCH
// This addresses the "Cannot read properties of undefined (reading 'addedFiles')" 
// which is common in Node 20/22+ environments with NativeWind v4.
if (config.watcher) {
    const originalEmit = config.watcher.emit;
    if (typeof originalEmit === 'function') {
        config.watcher.emit = function (event, data) {
            if (event === 'change' && data && typeof data === 'object') {
                // Modern Metro expects a 'changes' object with these arrays
                if (!data.changes) {
                    data.changes = {
                        addedFiles: data.addedFiles || [],
                        modifiedFiles: data.modifiedFiles || data.changedFiles || [],
                        removedFiles: data.removedFiles || []
                    };
                }
                // Also ensure the top-level arrays exist just in case
                data.addedFiles = data.addedFiles || data.changes.addedFiles;
                data.removedFiles = data.removedFiles || data.changes.removedFiles;
                data.changedFiles = data.changedFiles || data.changes.modifiedFiles;
            }
            return originalEmit.apply(this, arguments);
        };
    }
}

module.exports = config;
