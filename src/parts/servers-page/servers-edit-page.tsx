import { Container, Heading, Button } from "@radix-ui/themes";
import { ArrowLeftIcon } from "@radix-ui/react-icons";
import { openPage } from "../signal-router.ts";
import { $router } from "../../backbone/router.ts";
import { useMemo } from "react";
import { ConfigInterim, ServerForm } from "./server-form.tsx";
import { useConfig } from "../../backbone/backbone.ts";

export function ServersEditPage(props: { name: string }) {
  const config = useConfig();
  const previousName = props.name;

  const data = useMemo(() => {
    return ConfigInterim.fromEntry(props.name, config.getServerByName(props.name));
  }, [props.name, config]);

  const handleClickBack = () => {
    openPage($router, "servers");
  };

  const handleClickSave = () => {
    config.updateServer(previousName, data.name, data.entry);
    config
      .save()
      .then(() => {
        console.log("Saved server");
      })
      .catch((err) => {
        console.log("Error updating server");
        console.error(err);
      });
  };

  return (
    <Container p={"4"}>
      <div className={"flex w-full items-baseline gap-4 justify-between"}>
        <div className="flex-1 min-w-0">
          <Button variant={"ghost"} size={"3"} className={"cursor-pointer"} onClick={handleClickBack}>
            <ArrowLeftIcon />
            Back
          </Button>
        </div>
        <Heading as="h1" className={"mb-4 flex-none"}>
          Edit Server
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
