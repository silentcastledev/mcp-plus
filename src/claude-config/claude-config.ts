import { path } from "@tauri-apps/api";
import { BaseDirectory, exists, readFile, writeFile } from "@tauri-apps/plugin-fs";
import { type, record, string, array, sparse, optional, decode, type TypeOf } from "codeco";
import { ReadonlySignal, signal, Signal } from "@preact/signals-react";

const TEXT_DECODER = new TextDecoder("utf-8");
const TEXT_ENCODER = new TextEncoder();

function configFilename(): Promise<string> {
  return path.join("Library", "Application Support", "Claude", "claude_desktop_config.json");
}

const McpServerEntryScheme = sparse(
  {
    command: string,
    args: optional(array(string)),
    env: optional(record(string, string)),
  },
  "MCP Server Entry",
);

const ConfigScheme = type(
  {
    mcpServers: record(string, McpServerEntryScheme),
  },
  "Claude Config",
);

export type ConfigContent = TypeOf<typeof ConfigScheme>;
export type McpServerEntry = TypeOf<typeof McpServerEntryScheme>;
export type McpServersConfig = ConfigContent["mcpServers"];

async function configExists(): Promise<boolean> {
  const filename = await configFilename();
  return exists(filename, { baseDir: BaseDirectory.Home });
}

async function configRead(): Promise<ConfigContent> {
  const filename = await configFilename();
  const bytes = await readFile(filename, { baseDir: BaseDirectory.Home });
  const string = TEXT_DECODER.decode(bytes);
  const json = JSON.parse(string) as unknown;
  return decode(ConfigScheme, json);
}

async function configWrite(content: ConfigContent): Promise<void> {
  const filename = await configFilename();
  const string = JSON.stringify(content, null, 2);
  const bytes = TEXT_ENCODER.encode(string);
  await writeFile(filename, bytes, { baseDir: BaseDirectory.Home });
}

type Loading<T> = { k: "empty" } | { k: "loading" } | { k: "error"; reason: Error } | { k: "success"; value: T };
export class Loader<T> {
  readonly #signal: Signal<Loading<T>>;

  constructor(private readonly loadFn: () => Promise<T>) {
    this.#signal = signal({ k: "empty" });
  }

  load(): ReadonlySignal<Loading<T>> {
    this.#signal.value = { k: "loading" };
    this.loadFn()
      .then((data) => {
        this.#signal.value = { k: "success", value: data };
      })
      .catch((error) => {
        this.#signal.value = { k: "error", reason: error };
      });
    return this.#signal;
  }
}

export class ClaudeConfig {
  #content: ConfigContent;
  readonly #change: Signal<number>;

  constructor(content: ConfigContent) {
    this.#content = content;
    this.#change = signal(0);
  }

  get $change(): ReadonlySignal<number> {
    return this.#change;
  }

  private emitChange() {
    const current = this.#change.value;
    this.#change.value = current + 1;
  }

  static async load(): Promise<ClaudeConfig> {
    const filename = await configFilename();
    const isPresent = await configExists();
    if (isPresent) {
      const content = await configRead();
      return new ClaudeConfig(content);
    } else {
      throw new Error(`${filename} is not present: TODO`); // TODO
    }
  }

  addServer(name: string, entry: McpServerEntry): void {
    this.#content.mcpServers[name] = entry;
    this.emitChange();
  }

  updateServer(previousName: string, name: string, entry: McpServerEntry): void {
    if (previousName === name) {
      this.#content.mcpServers[name] = entry;
    } else {
      delete this.#content.mcpServers[previousName];
      this.#content.mcpServers[name] = entry;
    }
    this.emitChange();
  }

  getServerByName(name: string): McpServerEntry {
    const entry = this.#content.mcpServers[name];
    if (!entry) {
      throw new Error(`No server named ${name}`);
    }
    return entry;
  }

  deleteServer(name: string): void {
    delete this.#content.mcpServers[name];
    this.emitChange();
  }

  async save(): Promise<void> {
    await configWrite(this.#content);
  }

  get mcpServers(): Readonly<McpServersConfig> {
    return this.#content.mcpServers;
  }

  get content(): Readonly<ConfigContent> {
    return this.#content;
  }
}
