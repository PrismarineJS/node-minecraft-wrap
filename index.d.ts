import { EventEmitter } from "node:events";

type DoneCallback<T = unknown> = (err: Error | null, result?: T) => void;

export interface WrapServerOptions {
  /** Minimum memory allocated to the minecraft server, in MB. Default: 1024 */
  minMem?: number | string;
  /** Maximum memory allocated to the minecraft server, in MB. Default: 1024 */
  maxMem?: number | string;
  /** Regex to check for the server message announcing the server has started. */
  doneRegex?: RegExp;
  /** Don't override config files. */
  noOverride?: boolean;
  /** Path to a java executable to use. Default: "java" */
  javaPath?: string;
}

export interface ServerProperties {
  [key: string]: string | number | boolean;
}

export class WrapServer extends EventEmitter {
  constructor(mcServerJar: string, mcServerPath: string, options?: WrapServerOptions);

  /** Start the minecraft server. Calls done when the server is started. */
  startServer(propOverrides: ServerProperties, done: DoneCallback): void;
  /** Stop the minecraft server. Calls done when the server is stopped. */
  stopServer(done: DoneCallback): void;
  /** Delete the minecraft server data. */
  deleteServerData(done: DoneCallback): void;
  /** Write a line to the server's stdin. */
  writeServer(line: string): void;

  on(event: "line", listener: (line: string) => void): this;
}

export class WrapClient extends EventEmitter {
  constructor(clientPath: string, version: string, maxMem?: number, doneRegex?: RegExp);

  prepare(): Promise<void>;
  auth(username: string, password: string): Promise<void>;
  start(): void;
  stop(): void;
}

/**
 * Download the vanilla server of version `minecraftVersion` to the file
 * `filename`. Verifies with an md5 hash, and skips the download if the
 * destination file is already correct.
 */
export function download(minecraftVersion: string, filename: string, done: DoneCallback): void;

/** Alias of download(). */
export function downloadServer(minecraftVersion: string, filename: string, done: DoneCallback): void;

/** Download the vanilla client of version `minecraftVersion` to the file `filename`. */
export function downloadClient(minecraftVersion: string, filename: string, done: DoneCallback): void;

/**
 * Download and unzip a bedrock dedicated server.
 * os: 'win' | 'linux'
 * outputPath: name of folder to extract the server to
 * suffixVersion: suffix the version to the end of the output folder name
 */
export function downloadBedrockServer(
  os: "win" | "linux",
  version: string,
  outputPath?: string,
  suffixVersion?: string | boolean
): Promise<string>;

export interface DownloadArtifact {
  url: string;
  size: number;
  sha1: string;
}

/** Entry in Mojang's version manifest (https://launchermeta.mojang.com/mc/game/version_manifest.json). */
export interface VersionManifestEntry {
  id: string;
  type: string;
  url: string;
  time: string;
  releaseTime: string;
}

export interface VersionManifest {
  latest: { release: string; snapshot: string };
  versions: VersionManifestEntry[];
}

/** Parsed contents of a version's JSON (see the manifest entry's url). */
export interface VersionInfo {
  id: string;
  mainClass: string;
  minecraftArguments?: string;
  assetIndex: DownloadArtifact;
  downloads: {
    client: DownloadArtifact;
    server: DownloadArtifact;
  };
  libraries: Array<{
    name?: string;
    extract?: Record<string, unknown>;
    rules?: Array<{ action: "allow" | "disallow"; os?: { name?: string } }>;
    downloads: {
      artifact?: DownloadArtifact & { path: string };
      classifiers?: Record<string, DownloadArtifact & { path: string }>;
    };
  }>;
}

/** A fully downloaded client installation. */
export interface WholeClient {
  /** Path to the downloaded client jar. */
  client: string;
  /** Paths of the downloaded asset files. */
  assets: string[];
  /** Paths of the downloaded library jars. */
  libraries: string[];
  /** Path the natives were extracted to. */
  nativesPath: string;
}

export class LauncherDownload {
  constructor(mcPath: string, os?: "linux" | "osx" | "windows");

  getVersionsList(): Promise<VersionManifest>;
  getVersionInfos(version: string): Promise<VersionInfo>;
  getWholeClient(version: string): Promise<WholeClient>;
  getClient(version: string, path?: string): Promise<string>;
  getServer(version: string, path?: string): Promise<string>;
}
