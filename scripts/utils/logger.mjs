// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Eike Schäfer
// Lightweight logger for Node-based build scripts.
const LEVELS = {
  DEBUG: { label: 'DEBUG', useStderr: false },
  INFO: { label: 'INFO', useStderr: false },
  WARN: { label: 'WARN', useStderr: true },
  ERROR: { label: 'ERROR', useStderr: true },
};

function formatContext(context) {
  if (!context || typeof context !== 'object') {
    return '';
  }

  try {
    const serialized = JSON.stringify(context);
    return serialized ? ` ${serialized}` : '';
  } catch {
    return '';
  }
}

function formatEntry(level, message, context, source) {
  const timestamp = new Date().toISOString();
  const origin = source ?? 'script';
  return `${timestamp} ${level.label} [${origin}] ${message}${formatContext(context)}`;
}

function writeLog(level, message, context, source) {
  const entry = formatEntry(level, message, context, source);
  const writer = level.useStderr ? console.error : console.log;
  writer(entry);
}

export const LogLevel = Object.freeze({
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
});

export function logDebug(message, context, source) {
  writeLog(LEVELS.DEBUG, message, context, source);
}

export function logInfo(message, context, source) {
  writeLog(LEVELS.INFO, message, context, source);
}

export function logWarn(message, context, source) {
  writeLog(LEVELS.WARN, message, context, source);
}

export function logError(message, context, source) {
  writeLog(LEVELS.ERROR, message, context, source);
}

export const logger = {
  debug: logDebug,
  info: logInfo,
  warn: logWarn,
  error: logError,
};
