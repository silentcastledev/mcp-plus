import { Button, Container, Heading } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { openPage } from "../signal-router.ts";
import { $router } from "../../backbone/router.ts";
import { useSignals } from "@preact/signals-react/runtime";
import { useState } from "react";
import { useConfig } from "../../backbone/backbone.ts";
import { ConfigInterim, ServerForm } from "./server-form.tsx";

export function ServersAddPage() {
  useSignals();
  const config = useConfig();
  const [data] = useState(ConfigInterim.empty());

  const handleClickBack = () => {
    openPage($router, "servers");
  };

  // FIXME Check for overwrite

  const handleClickSave = () => {
    config.addServer(data.name, data.entry);
    config
      .save()
      .then(() => {
        openPage($router, "servers");
      })
      .catch((err) => {
        console.error(err); // TODO Notification toast?
      });
  };

  return (
    <Container p={"4"}>
      <div className="flex w-full items-baseline gap-4 justify-between">
        <div className="flex-1 min-w-0">
          <Button variant={"ghost"} size={"3"} className={"cursor-pointer"} onClick={handleClickBack}>
            <ArrowLeftIcon />
            Back
          </Button>
        </div>
        <Heading as="h1" className={"mb-4 flex-none"}>
          New Server
        </Heading>
        <div className="flex-1 flex justify-end">
          <Button onClick={handleClickSave}>Save</Button>
        </div>
      </div>
      <div className={"flex flex-col gap-4 mt-4"}>
        <ServerForm interim={data} />
      </div>
    </Container>
  );
}
