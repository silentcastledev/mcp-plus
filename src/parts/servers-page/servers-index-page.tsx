import { BACKBONE, useConfig } from "../../backbone/backbone.ts";
import { useSignal, useSignals } from "@preact/signals-react/runtime";
import { useListenSignal } from "../use-listen-signal.ts";
import { UnreachableCaseError } from "../unreachable-case-error.ts";
import { McpServerEntry } from "../../claude-config/claude-config.ts";
import { Button, Card, Container, DataList, Heading, IconButton } from "@radix-ui/themes";
import { ChevronUpIcon, ChevronDownIcon, Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import React from "react";
import styles from "./servers-page.module.css";
import { openPage, redirectPage } from "../signal-router.ts";
import { $router } from "../../backbone/router.ts";

function ServerCard(props: { name: string; entry: McpServerEntry }) {
  useSignals();
  const config = useConfig();

  const isShowMore = useSignal(false);

  const name = props.name;
  const entry = props.entry;
  const args = props.entry.args;
  const envs = props.entry.env;

  const renderArguments = () => {
    if (!args) {
      return <>&mdash;</>;
    }
    return <span className={"font-mono"}>{args.join(" ")}</span>;
  };

  const renderEnvVars = () => {
    if (!envs) {
      return <>&mdash;</>;
    }
    const cards = Object.entries(envs).map(([key, value], index) => {
      return (
        <DataList.Item key={`${index}-${name}`}>
          <DataList.Label className={"font-mono"}>{key}</DataList.Label>
          <DataList.Value className={"font-mono"}>{value}</DataList.Value>
        </DataList.Item>
      );
    });
    return <DataList.Root className={"grid-cols-2"}>{cards}</DataList.Root>;
  };

  const toggleShowMore = () => {
    isShowMore.value = !isShowMore.value;
  };

  const renderDetails = () => {
    if (!isShowMore.value) {
      return null;
    }
    return (
      <DataList.Root>
        <DataList.Item>
          <DataList.Label>Name</DataList.Label>
          <DataList.Value>
            <span className={"font-mono"}>{name}</span>
          </DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Command</DataList.Label>
          <DataList.Value>
            <span className={"font-mono"}>{entry.command}</span>
          </DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Arguments</DataList.Label>
          <DataList.Value>{renderArguments()}</DataList.Value>
        </DataList.Item>
        <DataList.Item>
          <DataList.Label>Env Vars</DataList.Label>
          <DataList.Value>{renderEnvVars()}</DataList.Value>
        </DataList.Item>
      </DataList.Root>
    );
  };

  const cardShowMore = () => {
    if (!isShowMore.value) {
      toggleShowMore();
    }
  };

  function CardInner(props: React.PropsWithChildren) {
    if (isShowMore.value) {
      return <Card>{props.children}</Card>;
    } else {
      return (
        <Card className={"cursor-pointer"} onClick={cardShowMore}>
          {props.children}
        </Card>
      );
    }
  }

  const handleClickEdit = () => {
    openPage($router, "serversEdit", { name: name });
  };

  const renderButtons = () => {
    if (isShowMore.value) {
      return (
        <div className={"flex items-center justify-end gap-8"}>
          <div className={"flex gap-4"}>
            <Button variant={"ghost"} size={"3"} className={"cursor-pointer"} onClick={handleClickEdit}>
              <Pencil2Icon />
              Edit
            </Button>
          </div>
          <IconButton variant="ghost" className={"cursor-pointer"} size={"3"} onClick={toggleShowMore}>
            <ChevronUpIcon />
          </IconButton>
        </div>
      );
    } else {
      return (
        <div className={"flex items-center justify-end"}>
          <IconButton variant="ghost" className={"cursor-pointer"} size={"3"} onClick={toggleShowMore}>
            <ChevronDownIcon />
          </IconButton>
        </div>
      );
    }
  };

  const handleDelete = () => {
    const name = props.name;
    config.deleteServer(name);
    config
      .save()
      .then(() => {
        console.log("Successfully deleted server");
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const renderDeleteButton = () => {
    if (isShowMore.value) {
      return (
        <Button variant={"ghost"} size={"2"} className={styles.deleteButton} color={"red"} onClick={handleDelete}>
          <TrashIcon />
          Delete
        </Button>
      );
    }
  };

  return (
    <CardInner>
      <div className={"flex justify-between items-center"}>
        <strong className={"capitalize"}>{name}</strong>
        <div className={"justify-self-end flex flex-row justify-end items-center pr-1"}>{renderButtons()}</div>
      </div>
      {renderDetails()}
      <div className={"float-right pr-1 fixed bottom-2 right-3"}>{renderDeleteButton()}</div>
    </CardInner>
  );
}

export function ServersList() {
  useSignals();
  const config = useConfig();
  useListenSignal(config.$change);

  const renderServers = () => {
    return Object.entries(config.mcpServers).map(([name, entry], index) => {
      return <ServerCard name={name} entry={entry} key={`${name}-${index}`} />;
    });
  };

  const handleClickAdd = () => {
    redirectPage($router, "serversAdd");
  };

  return (
    <Container p={"4"}>
      <div className={"flex w-full items-baseline gap-4 justify-between"}>
        <div className="flex-1 min-w-0"></div>
        <Heading as="h1" className={"mb-4 flex-none"}>
          MCP Servers
        </Heading>
        <div className="flex-1 flex justify-end">
          <Button onClick={handleClickAdd}>Add</Button>
        </div>
      </div>
      <div className={"flex flex-col gap-4 mt-4"}>{renderServers()}</div>
    </Container>
  );
}

export function ServersIndexPage() {
  useSignals();
  const configLoading = useListenSignal(BACKBONE.configLoading);

  switch (configLoading.k) {
    case "error": {
      return <div>ERROR: ${configLoading.reason.message}</div>;
    }
    case "loading":
    case "empty": {
      return <div>LOADING...</div>;
    }
    case "success": {
      return <ServersList />;
    }
    default:
      throw new UnreachableCaseError(configLoading);
  }
}
