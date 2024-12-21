import { Card, DataList, IconButton, TextArea, TextField } from "@radix-ui/themes";
import { useSignals } from "@preact/signals-react/runtime";
import { signal, Signal } from "@preact/signals-react";
import { McpServerEntry } from "../../claude-config/claude-config.ts";
import { useState } from "react";
import { Cross2Icon, PlusCircledIcon } from "@radix-ui/react-icons";

export class ConfigInterim {
  readonly $name: Signal<string>;
  readonly $command: Signal<string>;
  readonly $envs: Signal<Array<[string, string]>>;

  constructor(name: string, command: string, envs: Array<[string, string]>) {
    this.$name = signal(name);
    this.$command = signal(command);
    this.$envs = signal(envs);
  }

  static empty(): ConfigInterim {
    return new ConfigInterim("", "", []);
  }

  static fromEntry(name: string, entry: McpServerEntry): ConfigInterim {
    const command = [entry.command, ...(entry.args || [])].join(" ");
    const envs = entry.env ? Object.entries(entry.env) : [];
    return new ConfigInterim(name, command, envs);
  }

  get name() {
    return this.$name.value;
  }

  get entry(): McpServerEntry {
    const commandParts = this.$command.value.split(" ");
    const command = commandParts[0];
    const args = commandParts.slice(1);
    const envs = this.$envs.value.filter(([k, v]) => Boolean(k) && Boolean(v));
    const base: McpServerEntry = {
      command: command,
    };
    if (args.length > 0) {
      base.args = args;
    }
    if (envs.length > 0) {
      base.env = Object.fromEntries(envs);
    }
    return base;
  }
}

function EnvList(props: { $envs: Signal<Array<[string, string]>> }) {
  useSignals();

  const envs = props.$envs;

  const handleClickAdd = () => {
    envs.value = envs.value.concat([["", ""]]);
  };

  const renderAddButton = () => {
    return (
      <IconButton variant={"ghost"} onClick={handleClickAdd} className={"cursor-pointer"}>
        <PlusCircledIcon />
      </IconButton>
    );
  };

  function EnvRow(props: {
    item: [string, string];
    index: number;
    onChange: (item: [string, string]) => void;
    onDelete: () => void;
  }) {
    const [key, setKey] = useState(props.item[0]);
    const [value, setValue] = useState(props.item[1]);

    const handleChangeKey = (value: string) => {
      setKey(value);
      props.onChange([key, value]);
    };

    const handleChangeValue = (value: string) => {
      setValue(value);
      props.onChange([key, value]);
    };

    const handleClickDelete = () => {
      props.onDelete();
    };

    return (
      <div className={"flex gap-1 items-center"}>
        <div className={"w-1/2"}>
          <TextField.Root
            className={"font-mono"}
            value={key}
            onChange={(e) => handleChangeKey(e.currentTarget.value)}
          ></TextField.Root>
        </div>
        <div className={"w-1/2"}>
          <TextField.Root
            className={"font-mono"}
            value={value}
            onChange={(e) => handleChangeValue(e.currentTarget.value)}
          ></TextField.Root>
        </div>
        <div className={"flex flex-col justify-center"}>
          <IconButton
            variant={"ghost"}
            color={"gray"}
            size={"1"}
            className={"cursor-pointer"}
            onClick={handleClickDelete}
          >
            <Cross2Icon />
          </IconButton>
        </div>
      </div>
    );
  }

  const renderItems = () => {
    return envs.value.map((item, i) => {
      const handleChange = (item: [string, string]) => {
        envs.value[i] = item;
      };
      const handleDelete = () => {
        envs.value = envs.value.filter((_, index) => index !== i);
      };
      return <EnvRow item={item} index={i} key={String(i)} onDelete={handleDelete} onChange={handleChange} />;
    });
  };

  if (envs.value.length > 0) {
    return (
      <div className={"w-full md:max-w-xl"}>
        <div className={"w-full flex flex-col gap-1"}>{renderItems()}</div>
        <div className={"mt-2"}>{renderAddButton()}</div>
      </div>
    );
  } else {
    return <div className={"flex flex-col justify-center"}>{renderAddButton()}</div>;
  }
}

export function ServerForm(props: { interim: ConfigInterim }) {
  const data = props.interim;

  function FieldName() {
    useSignals();
    return (
      <TextField.Root
        className={"w-full font-mono"}
        placeholder="Name of the server"
        value={data.$name.value}
        onChange={(e) => (data.$name.value = e.currentTarget.value)}
      ></TextField.Root>
    );
  }

  function CommandField() {
    useSignals();
    return (
      <TextArea
        className={"w-full font-mono"}
        placeholder="Command to run"
        value={data.$command.value}
        onChange={(e) => (data.$command.value = e.currentTarget.value)}
      ></TextArea>
    );
  }

  return (
    <div className={"flex justify-center"}>
      <Card className={"flex-1 container"}>
        <DataList.Root>
          <DataList.Item>
            <DataList.Label>
              <span className={"mt-1"}>Name</span>
            </DataList.Label>
            <DataList.Value>
              <FieldName />
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>
              <span className={"mt-1"}>Command</span>
            </DataList.Label>
            <DataList.Value>
              <CommandField />
            </DataList.Value>
          </DataList.Item>
          <DataList.Item>
            <DataList.Label>Environment Variables</DataList.Label>
            <DataList.Value>
              <EnvList $envs={data.$envs} />
            </DataList.Value>
          </DataList.Item>
        </DataList.Root>
      </Card>
    </div>
  );
}
