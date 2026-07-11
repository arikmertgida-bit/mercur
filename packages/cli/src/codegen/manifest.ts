import crypto from "crypto";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const DEFAULT_MANIFEST_URL =
    "https://raw.githubusercontent.com/mercurjs/mercur/canary/packages/cli/routes-manifest.json";

const FETCH_TIMEOUT_MS = 15000;
const FETCH_RETRIES = 2;

export type RouteManifest = Record<string, string>;

function cacheFilePath(url: string): string {
    const hash = crypto.createHash("sha256").update(url).digest("hex").slice(0, 16);
    return path.join(os.tmpdir(), `mercur-routes-manifest-${hash}.json`);
}

/**
 * The package ships its own `routes-manifest.json` next to `dist/` (generated
 * at build time from the local `packages/core` route source and included in
 * the published `files`). Inside this monorepo — or any install that has that
 * file — it's always at least as fresh as the hosted one, so prefer it and
 * skip the network entirely.
 */
function bundledManifestPath(): string {
    const here = path.dirname(fileURLToPath(import.meta.url));
    return path.join(here, "..", "routes-manifest.json");
}

async function readManifestFile(filePath: string): Promise<RouteManifest | null> {
    try {
        return JSON.parse(await fs.readFile(filePath, "utf-8")) as RouteManifest;
    } catch {
        return null;
    }
}

async function fetchManifest(url: string): Promise<RouteManifest> {
    let lastError = new Error(`Failed to fetch manifest from ${url}`);
    for (let attempt = 0; attempt <= FETCH_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);

            if (!res.ok) {
                throw new Error(`Request failed with status ${res.status}`);
            }

            return (await res.json()) as RouteManifest;
        } catch (error) {
            lastError = error instanceof Error ? error : lastError;
            if (attempt < FETCH_RETRIES) {
                await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
            }
        }
    }
    throw lastError;
}

/**
 * Resolve the baseline Medusa + Mercur core route map. Prefers the manifest
 * bundled with this package (always available inside the monorepo and in any
 * npm install); falls back to the hosted manifest — with a couple of retries
 * — for older installs that predate the bundled copy, then to the last
 * successful fetch cached on disk.
 */
export async function loadBaselineRoutes(): Promise<RouteManifest> {
    const bundled = await readManifestFile(bundledManifestPath());
    if (bundled) {
        return bundled;
    }

    const url = process.env.MERCUR_ROUTES_MANIFEST_URL ?? DEFAULT_MANIFEST_URL;
    const cachePath = cacheFilePath(url);

    try {
        const manifest = await fetchManifest(url);
        await fs.writeFile(cachePath, JSON.stringify(manifest), "utf-8").catch(() => {});
        return manifest;
    } catch {
        const cached = await readManifestFile(cachePath);
        if (cached) {
            return cached;
        }
        throw new Error(
            `Failed to fetch the routes manifest from ${url} and no cached copy is available. ` +
                `Connect to the network and re-run codegen.`
        );
    }
}
