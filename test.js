import {test} from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import isWayland from './index.js';

function withEnvironment(platform, envVars, testFunction) {
	const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform');
	const originalEnv = {...process.env};

	try {
		if (platform) {
			Object.defineProperty(process, 'platform', {
				value: platform,
				configurable: true,
			});
		}

		if (envVars) {
			process.env = envVars;
		}

		testFunction();
	} finally {
		// Restore
		if (originalPlatform) {
			Object.defineProperty(process, 'platform', originalPlatform);
		}

		process.env = originalEnv;
	}
}

test('returns false on non-Linux platforms', () => {
	withEnvironment('darwin', {WAYLAND_DISPLAY: 'wayland-0'}, () => {
		assert.equal(isWayland(), false);
	});
});

test('detects Wayland via WAYLAND_DISPLAY on Linux', () => {
	withEnvironment('linux', {WAYLAND_DISPLAY: 'wayland-0'}, () => {
		assert.equal(isWayland(), true);
	});
});

test('detects Wayland via XDG_SESSION_TYPE on Linux', () => {
	withEnvironment('linux', {XDG_SESSION_TYPE: 'wayland'}, () => {
		assert.equal(isWayland(), true);
	});
});

test('prioritizes WAYLAND_DISPLAY over XDG_SESSION_TYPE', () => {
	withEnvironment('linux', {WAYLAND_DISPLAY: 'wayland-0', XDG_SESSION_TYPE: 'x11'}, () => {
		assert.equal(isWayland(), true);
	});
});

test('returns false for non-Wayland environments on Linux', () => {
	withEnvironment('linux', {XDG_SESSION_TYPE: 'x11'}, () => {
		assert.equal(isWayland(), false);
	});

	withEnvironment('linux', {}, () => {
		assert.equal(isWayland(), false);
	});
});
